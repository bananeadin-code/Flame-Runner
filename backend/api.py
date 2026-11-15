import json
import re
import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Query

from .db import get_db
from .sources import doi_url, locate_quote, psi_url, source_link

router = APIRouter(prefix="/api")

AREAS = ("prevention", "detection", "suppression", "fundamental")
O2_TOLERANCE = 0.03
PRESSURE_TOLERANCE = 0.15
SOURCE_WEIGHT = {"report": 1.0, "fact_sheet": 0.9, "guide": 0.9, "science_document": 0.85}
TEST_FIELDS = ("id", "accession", "test_code", "test_date", "fuel", "fuel_class", "configuration", "diluent",
               "o2_min", "o2_max", "pressure_kpa", "flow_min_cm_s", "flow_max_cm_s", "ignited", "outcome",
               "burn_time_s", "is_approximate")


def rows(cursor: sqlite3.Cursor) -> list[dict]:
    return [dict(r) for r in cursor.fetchall()]


def scenario_or_404(db: sqlite3.Connection, scenario_id: str | None) -> dict | None:
    if scenario_id is None:
        return None
    row = db.execute("SELECT * FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
    if row is None:
        raise HTTPException(404, f"Escenario desconocido: {scenario_id}")
    return dict(row)


def in_envelope(test: dict, scenario: dict) -> dict:
    o2_low, o2_high = test["o2_min"], test["o2_max"]
    o2_ok = o2_low is not None and o2_low - O2_TOLERANCE <= scenario["o2_fraction"] <= o2_high + O2_TOLERANCE
    pressure = test["pressure_kpa"]
    pressure_ok = None if pressure is None else abs(pressure - scenario["pressure_kpa"]) <= PRESSURE_TOLERANCE * scenario["pressure_kpa"]
    return {"o2_match": o2_ok, "pressure_match": pressure_ok, "in_scenario": o2_ok and pressure_ok is not False}


def gravity_class(scenario: dict) -> str:
    return "microgravity" if scenario["gravity_g"] == 0 else "partial_gravity"


def score_finding(f: dict, scenario: dict | None) -> dict:
    source = SOURCE_WEIGHT.get(f["doc_type"], f["doc_relevance"] or 0.6)
    parts = {"confidence": round(f["confidence"] or 0.0, 2), "source": source}
    if scenario:
        cond = f["conditions"]
        o2 = cond.get("o2_percent")
        parts["oxygen"] = 0.75 if o2 is None else round(1 - min(abs(o2 / 100 - scenario["o2_fraction"]) / 0.2, 1) * 0.5, 2)
        gravity = cond.get("gravity", "unspecified")
        parts["gravity"] = 1.0 if gravity == gravity_class(scenario) else 0.8 if gravity in ("unspecified", "microgravity") else 0.6
    score = 1.0
    for value in parts.values():
        score *= value
    return {"score": round(score, 3), "score_parts": parts}


@router.get("/stats")
def stats(db: sqlite3.Connection = Depends(get_db)) -> dict:
    count = lambda sql: db.execute(sql).fetchone()[0]
    return {
        "investigations": count("SELECT COUNT(*) FROM investigations"),
        "tests": count("SELECT COUNT(*) FROM tests"),
        "documents": count("SELECT COUNT(*) FROM documents WHERE status IN ('loaded', 'extracted')"),
        "pages": count("SELECT COUNT(*) FROM pages"),
        "findings_verified": count("SELECT COUNT(DISTINCT finding_id) FROM citations WHERE verified = 1"),
        "findings_by_area": dict(db.execute(
            """SELECT f.safety_area, COUNT(DISTINCT f.id) FROM findings f JOIN citations c ON c.finding_id = f.id
               WHERE c.verified = 1 GROUP BY f.safety_area""").fetchall()),
    }


@router.get("/scenarios")
def scenarios(db: sqlite3.Connection = Depends(get_db)) -> list[dict]:
    return rows(db.execute("SELECT * FROM scenarios ORDER BY pressure_kpa DESC"))


@router.get("/investigations")
def investigations(db: sqlite3.Connection = Depends(get_db)) -> list[dict]:
    items = rows(db.execute(
        """SELECT i.accession, i.acronym, i.title, i.project_type, i.platform, i.primary_area, i.start_date, i.end_date,
                  (SELECT COUNT(*) FROM tests t WHERE t.accession = i.accession) AS tests,
                  (SELECT COUNT(DISTINCT f.id) FROM findings f JOIN citations c ON c.finding_id = f.id
                   WHERE f.accession = i.accession AND c.verified = 1) AS findings,
                  (SELECT COUNT(*) FROM publications p WHERE p.accession = i.accession) AS publications,
                  (SELECT MIN(o2_min) FROM tests t WHERE t.accession = i.accession) AS o2_min,
                  (SELECT MAX(o2_max) FROM tests t WHERE t.accession = i.accession) AS o2_max,
                  (SELECT MIN(pressure_kpa) FROM tests t WHERE t.accession = i.accession) AS pressure_min,
                  (SELECT MAX(pressure_kpa) FROM tests t WHERE t.accession = i.accession) AS pressure_max,
                  (SELECT MIN(flow_min_cm_s) FROM tests t WHERE t.accession = i.accession) AS flow_min,
                  (SELECT MAX(flow_max_cm_s) FROM tests t WHERE t.accession = i.accession) AS flow_max
           FROM investigations i ORDER BY findings DESC"""))
    return [item | {"psi_url": psi_url(item["accession"])} for item in items]


@router.get("/investigations/{accession}")
def investigation(accession: str, db: sqlite3.Connection = Depends(get_db)) -> dict:
    row = db.execute(
        """SELECT accession, acronym, title, project_type, platform, primary_area, objective, hypothesis, approach,
                  research_impacts, start_date, end_date FROM investigations WHERE accession = ?""", (accession,)).fetchone()
    if row is None:
        raise HTTPException(404, f"Investigación desconocida: {accession}")
    detail = dict(row) | {"psi_url": psi_url(accession)}
    detail["publications"] = [
        pub | {"doi_url": doi_url(pub["doi"])}
        for pub in rows(db.execute(
            "SELECT title, authors, doi, status FROM publications WHERE accession = ? ORDER BY title", (accession,)))
    ]
    detail["findings_by_area"] = dict(db.execute(
        """SELECT f.safety_area, COUNT(DISTINCT f.id) FROM findings f JOIN citations c ON c.finding_id = f.id
           WHERE f.accession = ? AND c.verified = 1 GROUP BY f.safety_area""", (accession,)).fetchall())
    detail["tests"] = db.execute("SELECT COUNT(*) FROM tests WHERE accession = ?", (accession,)).fetchone()[0]
    return detail


@router.get("/documents/{document_id}/pages/{page_no}")
def document_page(
    document_id: int,
    page_no: int,
    quote: str | None = Query(None, max_length=2000),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    doc = db.execute(
        """SELECT d.id, d.title, d.doc_type, d.accession, d.n_pages, d.path, i.acronym
           FROM documents d LEFT JOIN investigations i ON i.accession = d.accession WHERE d.id = ?""",
        (document_id,)).fetchone()
    if doc is None:
        raise HTTPException(404, "Documento desconocido")
    page = db.execute("SELECT page_no, text FROM pages WHERE document_id = ? AND page_no = ?", (document_id, page_no)).fetchone()
    if page is None:
        raise HTTPException(404, f"El documento no tiene texto en la página {page_no}")
    available = [r[0] for r in db.execute("SELECT page_no FROM pages WHERE document_id = ? ORDER BY page_no", (document_id,))]
    index = available.index(page_no)
    return {
        "document_id": doc["id"], "title": doc["title"], "doc_type": doc["doc_type"], "accession": doc["accession"],
        "acronym": doc["acronym"], "n_pages": doc["n_pages"], "page_no": page_no, "text": page["text"],
        "highlight": locate_quote(page["text"], quote) if quote else None,
        "prev_page": available[index - 1] if index > 0 else None,
        "next_page": available[index + 1] if index + 1 < len(available) else None,
        **source_link(doc["path"], doc["accession"]),
    }


@router.get("/tests")
def tests(
    scenario: str | None = None,
    fuel_class: str | None = Query(None, pattern="^(solid|droplet|gas|aerosol)$"),
    accession: str | None = None,
    only_in_scenario: bool = False,
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    scen = scenario_or_404(db, scenario)
    sql = f"SELECT {', '.join(TEST_FIELDS)} FROM tests WHERE fuel IS NOT NULL"
    params: list = []
    if fuel_class:
        sql += " AND fuel_class = ?"
        params.append(fuel_class)
    if accession:
        sql += " AND accession = ?"
        params.append(accession)
    result = []
    for test in rows(db.execute(sql, params)):
        if scen:
            test.update(in_envelope(test, scen))
            if only_in_scenario and not test["in_scenario"]:
                continue
        result.append(test)
    return {"scenario": scen, "count": len(result), "tests": result}


@router.get("/findings")
def findings(
    area: str | None = Query(None, pattern=f"^({'|'.join(AREAS)})$"),
    finding_type: str | None = Query(None, alias="type", pattern="^(quantitative|qualitative|gap)$"),
    accession: str | None = None,
    scenario: str | None = None,
    q: str | None = Query(None, min_length=2, max_length=100),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    scen = scenario_or_404(db, scenario)
    sql = """SELECT f.id, f.accession, i.acronym, f.statement, f.safety_area, f.finding_type, f.quantity, f.value, f.unit,
                    f.conditions, f.confidence, c.quote, p.page_no, d.id AS document_id, d.title AS document_title,
                    d.doc_type, d.relevance AS doc_relevance, d.path AS document_path
             FROM findings f
             JOIN citations c ON c.finding_id = f.id AND c.verified = 1
             JOIN pages p ON p.id = c.page_id
             JOIN documents d ON d.id = p.document_id
             LEFT JOIN investigations i ON i.accession = f.accession
             WHERE 1 = 1"""
    params: list = []
    for column, value in (("f.safety_area", area), ("f.finding_type", finding_type), ("f.accession", accession)):
        if value:
            sql += f" AND {column} = ?"
            params.append(value)
    if q:
        sql += " AND (f.statement LIKE ? OR c.quote LIKE ?)"
        params += [f"%{q}%", f"%{q}%"]
    items = []
    for f in rows(db.execute(sql, params)):
        f["conditions"] = json.loads(f["conditions"] or "{}")
        f.update(score_finding(f, scen))
        f.update(source_link(f.pop("document_path"), f["accession"]))
        items.append(f)
    items.sort(key=lambda f: f["score"], reverse=True)
    return {"scenario": scen, "total": len(items), "findings": items[offset:offset + limit]}


@router.get("/gaps")
def gaps(db: sqlite3.Connection = Depends(get_db)) -> dict:
    verified = "FROM findings f JOIN citations c ON c.finding_id = f.id AND c.verified = 1"
    areas = rows(db.execute(
        f"""SELECT f.safety_area AS area, COUNT(DISTINCT f.id) AS findings,
                   COUNT(DISTINCT CASE WHEN f.finding_type = 'gap' THEN f.id END) AS gaps,
                   COUNT(DISTINCT CASE WHEN f.finding_type = 'quantitative' THEN f.id END) AS quantitative,
                   COUNT(DISTINCT f.accession) AS investigations
            {verified} GROUP BY f.safety_area"""))
    gravity = rows(db.execute(
        f"""SELECT json_extract(f.conditions, '$.gravity') AS gravity, f.safety_area AS area, COUNT(DISTINCT f.id) AS findings
            {verified} GROUP BY 1, 2"""))
    all_tests = rows(db.execute(f"SELECT {', '.join(TEST_FIELDS)} FROM tests WHERE fuel IS NOT NULL"))
    coverage = []
    for scen in rows(db.execute("SELECT * FROM scenarios")):
        for fuel_class in ("solid", "droplet", "gas", "aerosol"):
            subset = [t for t in all_tests if t["fuel_class"] == fuel_class]
            matches = [t for t in subset if in_envelope(t, scen)["in_scenario"]]
            coverage.append({"scenario": scen["id"], "fuel_class": fuel_class, "tests": len(subset),
                             "tests_in_scenario": len(matches), "gravity_g": scen["gravity_g"]})
    top_gaps = {}
    for area in AREAS:
        items = rows(db.execute(
            f"""SELECT f.id, f.accession, i.acronym, f.statement, f.safety_area, f.finding_type, f.confidence, f.conditions,
                       c.quote, p.page_no, d.id AS document_id, d.title AS document_title, d.path AS document_path
                {verified} JOIN pages p ON p.id = c.page_id JOIN documents d ON d.id = p.document_id
                LEFT JOIN investigations i ON i.accession = f.accession
                WHERE f.safety_area = ? AND f.finding_type = 'gap' ORDER BY f.confidence DESC LIMIT 5""", (area,)))
        for item in items:
            item["conditions"] = json.loads(item["conditions"] or "{}")
            item.update(source_link(item.pop("document_path"), item["accession"]))
        top_gaps[area] = items
    return {"areas": areas, "gravity_coverage": gravity, "scenario_coverage": coverage, "top_gaps": top_gaps}


def fts_query(text: str, operator: str) -> str:
    terms = re.findall(r"\w+", text.lower())
    return f" {operator} ".join(f'"{t}"' for t in terms[:12])


@router.get("/search")
def search(
    q: str = Query(..., min_length=2, max_length=200),
    accession: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    sql = """SELECT p.id AS page_id, p.page_no, d.id AS document_id, d.title AS document_title, d.doc_type, d.accession,
                    d.path AS document_path, snippet(pages_fts, 0, '<mark>', '</mark>', '…', 24) AS snippet
             FROM pages_fts JOIN pages p ON p.id = pages_fts.rowid JOIN documents d ON d.id = p.document_id
             WHERE pages_fts MATCH ?"""
    params: list = []
    if accession:
        sql += " AND d.accession = ?"
        params.append(accession)
    sql += " ORDER BY bm25(pages_fts) LIMIT ?"
    for operator in ("AND", "OR"):
        expression = fts_query(q, operator)
        if not expression:
            raise HTTPException(422, "La búsqueda no contiene palabras")
        results = rows(db.execute(sql, [expression, *params, limit]))
        for r in results:
            r.update(source_link(r.pop("document_path"), r["accession"]))
        if results:
            return {"query": q, "match": operator, "results": results}
    return {"query": q, "match": None, "results": []}


@router.get("/measurements")
def measurements(
    quantity: str | None = None,
    accession: str | None = None,
    limit: int = Query(300, ge=1, le=2000),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    where, params = [], []
    if accession:
        where.append("t.accession = ?")
        params.append(accession)
    clause = f"WHERE {' AND '.join(where)}" if where else ""
    quantities = rows(db.execute(
        f"""SELECT m.quantity, m.unit, COUNT(*) AS count, COUNT(DISTINCT t.accession) AS investigations,
                   GROUP_CONCAT(DISTINCT t.accession) AS accessions
            FROM measurements m JOIN tests t ON t.id = m.test_id {clause}
            GROUP BY m.quantity, m.unit ORDER BY count DESC""", params))
    if not quantity:
        return {"quantities": quantities, "quantity": None, "values": [], "stats": None}
    values = rows(db.execute(
        f"""SELECT t.id AS test_id, t.test_code, t.accession, t.fuel, t.fuel_class, t.o2_min, t.pressure_kpa,
                   m.value, m.unit, m.is_approximate
            FROM measurements m JOIN tests t ON t.id = m.test_id
            WHERE m.quantity = ? {'AND t.accession = ?' if accession else ''}
            ORDER BY m.value DESC LIMIT ?""", [quantity, *params, limit]))
    if not values:
        raise HTTPException(404, f"Sin mediciones para: {quantity}")
    nums = [v["value"] for v in values]
    stats = {"count": len(nums), "min": min(nums), "max": max(nums), "mean": sum(nums) / len(nums), "unit": values[0]["unit"]}
    return {"quantities": quantities, "quantity": quantity, "values": values, "stats": stats}


SUPPRESSANT_TERMS = {
    "He": ("helium",), "CO2": ("carbon dioxide", "co2"), "N2": ("nitrogen",),
    "Xe": ("xenon",), "Ar": ("argon",),
}


@router.get("/suppressants")
def suppressants(db: sqlite3.Connection = Depends(get_db)) -> list[dict]:
    tests_by_diluent = rows(db.execute(
        """SELECT t.diluent, COUNT(*) AS tests,
                  SUM(CASE WHEN t.outcome IN ('extinguished', 'self_extinguished', 'flow_terminated') THEN 1 ELSE 0 END) AS extinguished,
                  AVG(t.burn_time_s) AS mean_burn_time_s,
                  AVG(m.value) AS mean_extinction_diameter_mm,
                  GROUP_CONCAT(DISTINCT t.accession) AS accessions
           FROM tests t LEFT JOIN measurements m ON m.test_id = t.id AND m.quantity = 'extinction_diameter'
           WHERE t.diluent IS NOT NULL GROUP BY t.diluent"""))
    result = []
    for agent, words in SUPPRESSANT_TERMS.items():
        matching = [r for r in tests_by_diluent if agent in re.split(r"[+/]", r["diluent"])]
        like = " OR ".join("LOWER(f.statement || ' ' || c.quote) LIKE ?" for _ in words)
        findings_count = db.execute(
            f"""SELECT COUNT(DISTINCT f.id) FROM findings f JOIN citations c ON c.finding_id = f.id AND c.verified = 1
                WHERE f.safety_area = 'suppression' AND ({like})""", [f"%{w}%" for w in words]).fetchone()[0]
        tests_total = sum(r["tests"] for r in matching)
        burn = [r["mean_burn_time_s"] for r in matching if r["mean_burn_time_s"] is not None]
        diameter = [r["mean_extinction_diameter_mm"] for r in matching if r["mean_extinction_diameter_mm"] is not None]
        accessions = sorted({a for r in matching for a in (r["accessions"] or "").split(",") if a})
        result.append({
            "agent": agent, "query": words[0], "tests": tests_total,
            "extinguished": sum(r["extinguished"] for r in matching),
            "mean_burn_time_s": round(sum(burn) / len(burn), 2) if burn else None,
            "mean_extinction_diameter_mm": round(sum(diameter) / len(diameter), 2) if diameter else None,
            "investigations": accessions, "findings": findings_count,
        })
    return result


@router.get("/library")
def library(db: sqlite3.Connection = Depends(get_db)) -> dict:
    return {
        "documents_by_type": rows(db.execute(
            """SELECT doc_type, COUNT(*) AS documents, SUM(n_pages) AS pages FROM documents
               WHERE status IN ('loaded', 'extracted') GROUP BY doc_type ORDER BY documents DESC""")),
        "documents_by_status": rows(db.execute(
            "SELECT status, COUNT(*) AS documents FROM documents GROUP BY status ORDER BY documents DESC")),
        "publications_by_investigation": rows(db.execute(
            """SELECT i.accession, i.acronym, COUNT(p.id) AS publications, SUM(p.doi IS NOT NULL AND p.doi <> '') AS with_doi
               FROM investigations i LEFT JOIN publications p ON p.accession = i.accession
               GROUP BY i.accession ORDER BY publications DESC""")),
        "totals": dict(db.execute(
            """SELECT (SELECT COUNT(*) FROM publications) AS publications,
                      (SELECT COUNT(*) FROM publications WHERE doi IS NOT NULL AND doi <> '') AS with_doi,
                      (SELECT COUNT(*) FROM documents WHERE status IN ('loaded', 'extracted')) AS documents,
                      (SELECT COUNT(*) FROM pages) AS pages""").fetchone()),
    }

