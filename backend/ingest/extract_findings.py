import argparse
import re
import sqlite3
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Literal

import anthropic
from pydantic import BaseModel, ValidationError
from rapidfuzz import fuzz

from ..config import settings
from ..db import connect, init_db

AUTO_RELEVANCE = {"report": 1.0, "fact_sheet": 1.0, "guide": 1.0, "science_document": 0.9}
EXTRACT_THRESHOLD = 0.6
TRIAGE_CHARS = 6_000
WINDOW_CHARS = 60_000
FUZZY_MATCH = 92
FALLBACK_BETA = "server-side-fallback-2026-07-01"
PRICES = {
    "claude-haiku-5-5": (0.10, 0.50),
    "claude-sonnet-5-5": (2.00, 10.00),
    "claude-opus-5-5": (4.00, 20.00),
}

TRIAGE_SYSTEM = """You classify documents from NASA's Physical Sciences Informatics (PSI) combustion science repository for a spacecraft fire safety knowledge base.

Score how useful the document is as a source of citable scientific findings about fire safety in spacecraft and in Moon or Mars habitats: material flammability and flame spread, ignition and extinction limits, effects of oxygen concentration, pressure, flow and gravity, smoke and fire detection, and fire suppression.

Scoring guide:
- 0.8 to 1.0: papers, reports, theses or summaries that state results or conclusions.
- 0.5 to 0.7: test matrices, data summaries or procedures that give context for results.
- 0.0 to 0.4: engineering drawings, plots without explanatory text, raw instrument logs, administrative or software documents.

PSI often files published papers, conference papers, theses and presentations of results together with raw data, so judge by the content, not by where the document is stored. A paper or presentation that reports results scores 0.8 or higher even if it looks like part of a data package.

Judge only from the text provided."""

EXTRACT_SYSTEM = """You extract findings from NASA microgravity combustion documents for a spacecraft fire safety knowledge base used to plan Moon and Mars missions.

A finding is one specific, self-contained claim the document supports, relevant to:
- prevention: material flammability, flame spread, ignition, extinction limits, effects of oxygen, pressure, flow or gravity on burning;
- detection: smoke, aerosols, particle sizes, gas species and detector performance;
- suppression: extinguishment, diluents such as CO2, helium or nitrogen, cool flames, venting;
- fundamental: flame structure, soot, burning rates and other combustion science behind the above.

Rules:
- Use only what the text states. Do not add outside knowledge.
- Every finding must include page_no and a quote copied character for character from that page, long enough to support the finding and at most about 300 characters.
- Use finding_type "quantitative" when the finding reports a measured or computed value, and fill quantity, value and unit; otherwise leave them null.
- Use finding_type "gap" for limitations, open questions or untested conditions the authors point out.
- Fill conditions only with values the text gives for that finding; leave the rest null and gravity "unspecified" if not stated. Give oxygen as a percentage and pressure in kPa when the text allows a direct conversion.
- confidence reflects how directly the quote supports the statement (1.0 = stated explicitly).
- Write statements in English, as one clear sentence each.
- Skip boilerplate, acknowledgments, references, figure captions without results, and repeated findings.
- Return an empty list if the text contains no findings."""


class Triage(BaseModel):
    relevance: float
    kind: Literal["paper", "report", "test_data", "plot_or_image", "drawing", "procedure", "administrative", "other"]
    reason: str


class Conditions(BaseModel):
    fuel: str | None
    o2_percent: float | None
    pressure_kpa: float | None
    flow_cm_s: float | None
    diluent: str | None
    gravity: Literal["microgravity", "partial_gravity", "normal_gravity", "unspecified"]


class Finding(BaseModel):
    statement: str
    safety_area: Literal["prevention", "detection", "suppression", "fundamental"]
    finding_type: Literal["quantitative", "qualitative", "gap"]
    quantity: str | None
    value: float | None
    unit: str | None
    conditions: Conditions
    confidence: float
    page_no: int
    quote: str


class Extraction(BaseModel):
    findings: list[Finding]


TRIAGE_SCHEMA = anthropic.transform_schema(Triage)
EXTRACTION_SCHEMA = anthropic.transform_schema(Extraction)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"[\u2010-\u2015]", "-", text)
    text = re.sub(r"-\s*\n\s*", "", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def quote_matches(quote: str, page_text: str) -> bool:
    q, p = normalize(quote), normalize(page_text)
    return bool(q) and (q in p or fuzz.partial_ratio(q, p) >= FUZZY_MATCH)


class Claude:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None, max_retries=4)

    def _call(self, model: str, system: str, user: str, schema: dict, effort: str, max_tokens: int, fallback: bool):
        extra = {"betas": [FALLBACK_BETA], "fallbacks": "default"} if fallback else {}
        response = self.client.beta.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": user}],
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
            **extra,
        )
        if response.stop_reason == "refusal":
            raise RuntimeError("refusal")
        if response.stop_reason == "max_tokens":
            raise RuntimeError("max_tokens")
        text = next(b.text for b in response.content if b.type == "text")
        return text, response.usage

    def triage(self, header: str, text: str) -> tuple[Triage, object]:
        raw, usage = self._call(
            settings.model_triage, TRIAGE_SYSTEM, f"{header}\n\n<document_start>\n{text}\n</document_start>",
            TRIAGE_SCHEMA, "low", 2_000, fallback=False,
        )
        return Triage.model_validate_json(raw), usage

    def extract(self, header: str, window: str) -> tuple[Extraction, object]:
        raw, usage = self._call(
            settings.model_extract, EXTRACT_SYSTEM, f"{header}\n\n{window}",
            EXTRACTION_SCHEMA, "medium", 16_000, fallback=True,
        )
        return Extraction.model_validate_json(raw), usage


def header_of(doc: sqlite3.Row) -> str:
    kind = "" if doc["doc_type"] in {"raw_data", "analyzed_data", "other"} else f" ({doc['doc_type']})"
    return (f"Investigation: {doc['accession'] or 'general'} {doc['acronym'] or ''} - {doc['inv_title'] or ''}\n"
            f"Document: {doc['title']}{kind}")


def documents(conn: sqlite3.Connection, where: str, only: list[str] | None, limit: int | None) -> list[sqlite3.Row]:
    sql = f"""SELECT d.*, i.acronym, i.title AS inv_title FROM documents d
              LEFT JOIN investigations i ON i.accession = d.accession
              WHERE {where}{' AND d.accession IN (%s)' % ','.join('?' * len(only)) if only else ''}
              ORDER BY d.relevance DESC, d.id{' LIMIT %d' % limit if limit else ''}"""
    return conn.execute(sql, only or []).fetchall()


def pages_of(conn: sqlite3.Connection, doc_id: int) -> list[sqlite3.Row]:
    return conn.execute("SELECT id, page_no, text FROM pages WHERE document_id = ? ORDER BY page_no", (doc_id,)).fetchall()


def windows(pages: list[sqlite3.Row]) -> list[list[sqlite3.Row]]:
    groups, current, size = [], [], 0
    for page in pages:
        if current and size + len(page["text"]) > WINDOW_CHARS:
            groups.append(current)
            current, size = [], 0
        current.append(page)
        size += len(page["text"])
    return groups + [current] if current else groups


def render(group: list[sqlite3.Row]) -> str:
    return "\n".join(f'<page number="{p["page_no"]}">\n{p["text"]}\n</page>' for p in group)


def cost(usage, model: str) -> float:
    price_in, price_out = PRICES.get(model, (0.0, 0.0))
    cached = (usage.cache_read_input_tokens or 0) * price_in * 0.1 + (usage.cache_creation_input_tokens or 0) * price_in * 1.25
    return (usage.input_tokens * price_in + usage.output_tokens * price_out + cached) / 1e6


def run_triage(conn: sqlite3.Connection, claude: Claude, only, limit, workers) -> float:
    auto = conn.execute(
        f"UPDATE documents SET relevance = CASE doc_type {' '.join(f'WHEN {k!r} THEN {v}' for k, v in AUTO_RELEVANCE.items())} END "
        f"WHERE status = 'loaded' AND relevance IS NULL AND doc_type IN ({','.join(repr(k) for k in AUTO_RELEVANCE)})"
    ).rowcount
    conn.commit()
    pending = documents(conn, "d.status = 'loaded' AND d.relevance IS NULL", only, limit)
    print(f"Triaje: {auto} documentos clasificados por tipo, {len(pending)} para {settings.model_triage}")
    spent, counts = 0.0, {"ok": 0, "error": 0}
    texts = {doc["id"]: "\n\n".join(p["text"] for p in pages_of(conn, doc["id"]))[:TRIAGE_CHARS] for doc in pending}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(claude.triage, header_of(doc), texts[doc["id"]]): doc for doc in pending}
        for i, fut in enumerate(as_completed(futures), 1):
            doc = futures[fut]
            try:
                result, usage = fut.result()
                spent += cost(usage, settings.model_triage)
                with conn:
                    conn.execute("UPDATE documents SET relevance = ? WHERE id = ?", (max(0.0, min(1.0, result.relevance)), doc["id"]))
                counts["ok"] += 1
            except (anthropic.APIError, RuntimeError, ValidationError) as exc:
                counts["error"] += 1
                print(f"  error triaje {doc['path']}: {type(exc).__name__}: {exc}")
            if i % 50 == 0 or i == len(pending):
                print(f"  {i}/{len(pending)} {counts} ${spent:.3f}")
    return spent


def save_findings(conn: sqlite3.Connection, doc: sqlite3.Row, group: list[sqlite3.Row], extraction: Extraction) -> tuple[int, int]:
    by_page = {p["page_no"]: p for p in group}
    saved = verified_count = 0
    for f in extraction.findings:
        page = by_page.get(f.page_no)
        verified = bool(page) and quote_matches(f.quote, page["text"])
        if not verified:
            page = next((p for p in group if quote_matches(f.quote, p["text"])), page)
            verified = page is not None and quote_matches(f.quote, page["text"])
        if page is None:
            continue
        finding_id = conn.execute(
            """INSERT INTO findings (accession, statement, safety_area, finding_type, quantity, value, unit, conditions, confidence)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (doc["accession"], f.statement, f.safety_area, f.finding_type, f.quantity, f.value, f.unit,
             f.conditions.model_dump_json(), max(0.0, min(1.0, f.confidence))),
        ).lastrowid
        conn.execute(
            "INSERT INTO citations (finding_id, page_id, quote, verified) VALUES (?, ?, ?, ?)",
            (finding_id, page["id"], f.quote, int(verified)),
        )
        saved += 1
        verified_count += int(verified)
    return saved, verified_count


def run_extraction(conn: sqlite3.Connection, claude: Claude, only, limit, workers) -> float:
    pending = documents(conn, f"d.status = 'loaded' AND d.relevance >= {EXTRACT_THRESHOLD}", only, limit)
    jobs = [(doc, group) for doc in pending for group in windows(pages_of(conn, doc["id"]))]
    print(f"Extracción: {len(pending)} documentos, {len(jobs)} llamadas a {settings.model_extract}")
    remaining = {doc["id"]: 0 for doc in pending}
    failed: set[int] = set()
    for doc, _ in jobs:
        remaining[doc["id"]] += 1
    spent, totals = 0.0, {"hallazgos": 0, "verificados": 0, "error": 0}

    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(claude.extract, header_of(doc), render(group)): (doc, group) for doc, group in jobs}
        for i, fut in enumerate(as_completed(futures), 1):
            doc, group = futures[fut]
            try:
                extraction, usage = fut.result()
                spent += cost(usage, settings.model_extract)
                with conn:
                    saved, verified = save_findings(conn, doc, group, extraction)
                totals["hallazgos"] += saved
                totals["verificados"] += verified
            except (anthropic.APIError, RuntimeError, ValidationError) as exc:
                failed.add(doc["id"])
                totals["error"] += 1
                print(f"  error extracción {doc['path']} (pág. {group[0]['page_no']}-{group[-1]['page_no']}): {type(exc).__name__}: {exc}")
            remaining[doc["id"]] -= 1
            if remaining[doc["id"]] == 0 and doc["id"] not in failed:
                with conn:
                    conn.execute("UPDATE documents SET status = 'extracted' WHERE id = ?", (doc["id"],))
            if i % 10 == 0 or i == len(jobs):
                print(f"  {i}/{len(jobs)} {totals} ${spent:.2f}")
    return spent


def estimate(conn: sqlite3.Connection, only, limit) -> None:
    def chars(where):
        docs = documents(conn, where, only, limit)
        ids = [d["id"] for d in docs] or [-1]
        total = conn.execute(f"SELECT COALESCE(SUM(LENGTH(text)), 0) FROM pages WHERE document_id IN ({','.join(map(str, ids))})").fetchone()[0]
        return len(docs), total

    auto_types = ",".join(repr(k) for k in AUTO_RELEVANCE)
    n_triage, _ = chars(f"d.status = 'loaded' AND d.relevance IS NULL AND d.doc_type NOT IN ({auto_types})")
    n_sure, c_sure = chars(f"d.status = 'loaded' AND (d.relevance >= {EXTRACT_THRESHOLD} OR (d.relevance IS NULL AND d.doc_type IN ({auto_types})))")
    n_maybe, c_maybe = chars(f"d.status = 'loaded' AND d.relevance IS NULL AND d.doc_type NOT IN ({auto_types})")
    t_in, t_out = PRICES.get(settings.model_triage, (0, 0))
    e_in, e_out = PRICES.get(settings.model_extract, (0, 0))
    triage_cost = n_triage * (2_000 * t_in + 400 * t_out) / 1e6

    def extract_cost(c):
        calls = max(1, c // WINDOW_CHARS) if c else 0
        return (c / 4 * e_in + calls * 6_000 * e_out) / 1e6

    print(f"Triaje ({settings.model_triage}): {n_triage} documentos -> ~${triage_cost:.2f}")
    print(f"Extracción ({settings.model_extract}) segura: {n_sure} documentos, {c_sure / 4 / 1e6:.2f} M tokens de entrada -> ~${extract_cost(c_sure):.2f}")
    print(f"Extracción adicional si todo el triaje pasara el umbral: {n_maybe} documentos -> hasta ~${extract_cost(c_maybe):.2f}")
    print("Estimación aproximada: 4 caracteres por token y salida media por llamada; el razonamiento del modelo puede sumar coste.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m backend.ingest.extract_findings")
    parser.add_argument("--stage", choices=["all", "triage", "extract"], default="all")
    parser.add_argument("--only", nargs="*", help="solo estas investigaciones, p. ej. PSI-25 PSI-69")
    parser.add_argument("--limit", type=int, help="máximo de documentos por etapa")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true", help="estima el coste sin llamar a la API")
    args = parser.parse_args()

    init_db()
    conn = connect()
    try:
        conn.execute("DELETE FROM findings WHERE id NOT IN (SELECT finding_id FROM citations)")
        conn.commit()
        if args.dry_run:
            estimate(conn, args.only, args.limit)
            return
        claude = Claude()
        spent = 0.0
        if args.stage in {"all", "triage"}:
            spent += run_triage(conn, claude, args.only, args.limit, args.workers)
        if args.stage in {"all", "extract"}:
            spent += run_extraction(conn, claude, args.only, args.limit, args.workers)
        row = conn.execute(
            "SELECT COUNT(DISTINCT f.id), SUM(c.verified) FROM findings f JOIN citations c ON c.finding_id = f.id"
        ).fetchone()
        print(f"Total en la base: {row[0]} hallazgos, {row[1] or 0} con cita verificada. Gasto de esta ejecución: ~${spent:.2f}")
    except anthropic.AuthenticationError:
        sys.exit("ANTHROPIC_API_KEY no es válida o falta en .env")
    finally:
        conn.close()


if __name__ == "__main__":
    main()