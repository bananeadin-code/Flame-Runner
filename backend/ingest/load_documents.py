import argparse
import csv
import hashlib
import html
import re
import sqlite3
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from ..config import ROOT_DIR
from ..db import connect, init_db
from .extractors import READERS, UNSUPPORTED, extract, html_title

RESOURCES = ROOT_DIR / "resources"
PSI_FILES = RESOURCES / "psi" / "files"
INVENTORY = RESOURCES / "psi" / "inventory.csv"

DOC_TYPES = {
    "Reports": "report", "Science Documents": "science_document", "Presentations": "presentation",
    "Engineering Documents": "engineering_document", "Reference Data": "reference",
    "Analyzed Data": "analyzed_data", "Raw Data": "raw_data", "metadata": "metadata",
}
FACT_SHEETS = {
    "acme": "PSI-10", "bass": "PSI-26", "daft": "PSI-47", "flex": "PSI-69",
    "same": "PSI-102", "spice": "PSI-107", "saffire": "PSI-98", "slice": "PSI-106",
}
DATA_CATEGORIES = {"Raw Data", "Analyzed Data"}
MAX_SPREADSHEET_BYTES = 2_000_000
MIN_CHARS_PER_PAGE = 40
LEGACY_TITLE = re.compile(r"\d{4}\s*-\s*.*?\"(.+?)\"")


@dataclass(frozen=True)
class Source:
    path: Path
    accession: str | None
    doc_type: str
    title: str


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def nasa_sources() -> list[Source]:
    sources = []
    for path in sorted((RESOURCES / "pdf").glob("*.pdf")):
        stem, _, key = path.stem.rpartition("-")
        if key in FACT_SHEETS:
            sources.append(Source(path, FACT_SHEETS[key], "fact_sheet", stem.replace("-", " ").title()))
        else:
            sources.append(Source(path, None, "guide", "Combustion in Reduced Gravity (ISS, 2015)"))
    return sources


def web_sources() -> list[Source]:
    return [
        Source(path, None, "web_page", html_title(path) or path.stem.replace("_", " "))
        for path in sorted((RESOURCES / "web").glob("*.htm*"))
    ]


def inventory_titles() -> dict[tuple[str, str], str]:
    titles = {}
    with INVENTORY.open(encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            match = LEGACY_TITLE.search(html.unescape(row["description"]))
            if match:
                titles[(row["accession"], row["file_name"])] = match.group(1).strip()
    return titles


def wanted(path: Path, category: str) -> bool:
    ext = path.suffix.lower()
    if category == "Experimental table" or (ext not in READERS and ext not in UNSUPPORTED):
        return False
    if ext in {".xlsx", ".xls"} and path.stat().st_size > MAX_SPREADSHEET_BYTES:
        return False
    return not (ext == ".txt" and category in DATA_CATEGORIES)


def psi_sources(only: list[str] | None) -> list[Source]:
    titles = inventory_titles()
    sources = []
    for path in sorted(PSI_FILES.rglob("*")):
        if not path.is_file():
            continue
        parts = path.relative_to(PSI_FILES).parts
        if len(parts) < 3 or (only and parts[0] not in only):
            continue
        accession, category = parts[0], parts[1]
        if not wanted(path, category):
            continue
        prefix = f"{accession}_{category}_"
        title = titles.get((accession, path.name)) or path.stem.removeprefix(prefix).replace("_", " ")
        sources.append(Source(path, accession, DOC_TYPES.get(category, "other"), title))
    return sources


def insert_document(conn: sqlite3.Connection, src: Source, rel: str, sha: str, status: str, n_pages: int = 0) -> int:
    return conn.execute(
        "INSERT INTO documents (accession, path, sha256, doc_type, title, n_pages, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (src.accession, rel, sha, src.doc_type, src.title, n_pages, status),
    ).lastrowid


def load_document(conn: sqlite3.Connection, src: Source) -> str:
    rel = src.path.relative_to(ROOT_DIR).as_posix()
    sha = sha256(src.path)
    current = conn.execute("SELECT id, sha256, status FROM documents WHERE path = ?", (rel,)).fetchone()
    if current and current["sha256"] == sha and current["status"] != "error":
        return "sin cambios"
    if current:
        conn.execute("DELETE FROM documents WHERE id = ?", (current["id"],))
    duplicate = conn.execute("SELECT 1 FROM documents WHERE sha256 = ? AND path <> ?", (sha, rel)).fetchone()
    if duplicate:
        insert_document(conn, src, rel, sha, "duplicate")
        return "duplicate"
    if src.path.suffix.lower() in UNSUPPORTED:
        insert_document(conn, src, rel, sha, "unsupported")
        return "unsupported"
    try:
        pages = extract(src.path)
    except Exception as exc:
        insert_document(conn, src, rel, sha, "error")
        return f"error ({type(exc).__name__}: {exc})"
    chars = sum(len(p) for p in pages)
    if src.path.suffix.lower() == ".pdf" and chars < MIN_CHARS_PER_PAGE * max(len(pages), 1):
        status = "needs_ocr"
    else:
        status = "loaded" if chars else "empty"
    doc_id = insert_document(conn, src, rel, sha, status, len(pages))
    conn.executemany(
        "INSERT INTO pages (document_id, page_no, text) VALUES (?, ?, ?)",
        [(doc_id, i, text) for i, text in enumerate(pages, 1) if text],
    )
    return status


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m backend.ingest.load_documents")
    parser.add_argument("--source", choices=["all", "nasa", "web", "psi"], default="all")
    parser.add_argument("--only", nargs="*", help="solo estas investigaciones de PSI, p. ej. PSI-25 PSI-69")
    args = parser.parse_args()

    sources = []
    if args.source in {"all", "nasa"}:
        sources += nasa_sources()
    if args.source in {"all", "web"}:
        sources += web_sources()
    if args.source in {"all", "psi"}:
        sources += psi_sources(args.only)
    print(f"{len(sources)} documentos encontrados")

    init_db()
    conn = connect()
    counts: Counter[str] = Counter()
    try:
        for i, src in enumerate(sources, 1):
            with conn:
                result = load_document(conn, src)
            counts[result.split(" ")[0]] += 1
            if result.startswith("error") or result == "needs_ocr":
                print(f"  {result}: {src.path.relative_to(ROOT_DIR)}")
            if i % 50 == 0 or i == len(sources):
                print(f"  {i}/{len(sources)} {dict(counts)}")
        summary = conn.execute(
            "SELECT doc_type, status, COUNT(*), SUM(n_pages) FROM documents GROUP BY doc_type, status ORDER BY doc_type"
        ).fetchall()
        for doc_type, status, n, pages in summary:
            print(f"  {doc_type:<22} {status:<12} {n:>5} docs {pages or 0:>7} páginas")
        total = conn.execute("SELECT COUNT(*) FROM pages").fetchone()[0]
        print(f"Total: {total} páginas con texto, índice de búsqueda: {conn.execute('SELECT COUNT(*) FROM pages_fts').fetchone()[0]}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()