# pasa el texto de los PDF de resources/pdf a la base (documents + pages) y reconstruye el índice pages_fts,
# que permite buscar sin internet. Correr después de load_tables (usa la tabla investigations).

import hashlib
import re
import sqlite3
import unicodedata
from pathlib import Path

import pymupdf

from ..config import ROOT_DIR
from ..db import connect, init_db

PDF_DIR = ROOT_DIR / "resources" / "pdf"
MAX_MB = 30
ACRONYM = re.compile(r"\(([^)]+)\)")


def clean_page(text: str) -> str:
    # NFKC convierte ligaduras ("ﬂame" -> "flame") para que la búsqueda las encuentre
    text = unicodedata.normalize("NFKC", text).replace("­", "")
    text = re.sub(r"-\n(?=[a-z])", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def title_of(doc: pymupdf.Document) -> str:
    meta = (doc.metadata or {}).get("title", "").strip()
    if meta:
        return meta
    # el título es el texto con letra más grande de la primera página (en orden de lectura)
    spans = [s for b in doc[0].get_text("dict")["blocks"] for line in b.get("lines", [])
             for s in line["spans"] if s["text"].strip()]
    if not spans:
        return ""
    biggest = max(s["size"] for s in spans)
    title = clean_page(" ".join(s["text"].strip() for s in spans if s["size"] >= 0.55 * biggest))
    # en las hojas de Glenn el título acaba en las siglas: "Flame Extinguishment Experiment (FLEX)"
    short = re.match(r"^.{0,150}?\([^)]+\)", title)
    return short.group(0) if short else title[:200]


def accession_of(conn: sqlite3.Connection, title: str) -> str | None:
    # solo se liga a una investigación si las siglas del título coinciden con exactamente una
    match = ACRONYM.search(title)
    if not match:
        return None
    wanted = match.group(1).strip().lower()
    found = [r["accession"] for r in conn.execute("SELECT accession, acronym FROM investigations")
             if wanted in (p.lower() for p in re.split(r"\s+/\s+", (r["acronym"] or "").strip()))]
    return found[0] if len(found) == 1 else None


def load_document(conn: sqlite3.Connection, path: Path) -> str:
    if path.stat().st_size > MAX_MB * 1e6:
        return f"omitido: pesa más de {MAX_MB} MB"
    data = path.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    rel = path.relative_to(ROOT_DIR).as_posix()
    current = conn.execute("SELECT id, sha256 FROM documents WHERE path = ?", (rel,)).fetchone()
    if current and current["sha256"] == sha:
        return "sin cambios"
    if current:
        conn.execute("DELETE FROM documents WHERE id = ?", (current["id"],))

    with pymupdf.open(stream=data, filetype="pdf") as doc:
        title = title_of(doc)
        pages = [(i + 1, clean_page(page.get_text())) for i, page in enumerate(doc)]
        n_pages = doc.page_count
    pages = [(n, t) for n, t in pages if t]
    if not pages:
        return "SIN TEXTO (¿PDF escaneado?): no se cargó"

    accession = accession_of(conn, title)
    doc_type = "guide" if "researcher" in title.lower() else "fact_sheet"
    doc_id = conn.execute(
        "INSERT INTO documents (accession, path, sha256, doc_type, title, n_pages) VALUES (?, ?, ?, ?, ?, ?)",
        (accession, rel, sha, doc_type, title, n_pages),
    ).lastrowid
    conn.executemany(
        "INSERT INTO pages (document_id, page_no, text) VALUES (?, ?, ?)",
        [(doc_id, n, t) for n, t in pages],
    )
    chars = sum(len(t) for _, t in pages)
    return f"{len(pages)}/{n_pages} páginas con texto, {chars:,} caracteres, {accession or 'sin investigación'} | {title}"


def main() -> None:
    init_db()
    conn = connect()
    try:
        if not conn.execute("SELECT COUNT(*) FROM investigations").fetchone()[0]:
            print("La tabla investigations está vacía: ejecuta primero `python -m backend.ingest.load_tables`.")
        files = sorted(PDF_DIR.glob("*.pdf"))
        if not files:
            print(f"No hay PDF en {PDF_DIR.relative_to(ROOT_DIR)}")
        for path in files:
            with conn:
                print(f"  {path.name}: {load_document(conn, path)}")
        with conn:
            # pages_fts es un índice externo de pages: se reconstruye completo tras cada carga
            conn.execute("INSERT INTO pages_fts(pages_fts) VALUES ('rebuild')")
        totals = {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("documents", "pages")}
        print(f"Total: {totals}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
