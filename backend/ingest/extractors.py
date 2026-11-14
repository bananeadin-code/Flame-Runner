import re
from pathlib import Path

import openpyxl
import pymupdf
import xlrd
from bs4 import BeautifulSoup
from docx import Document
from pptx import Presentation
from striprtf.striprtf import rtf_to_text

PAGE_CHARS = 3000
MAX_SHEET_ROWS = 300
HTML_NOISE = ["script", "style", "nav", "header", "footer", "noscript", "svg", "button", "aside"]


def clean(text: str) -> str:
    text = text.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t\u00a0]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def paginate(blocks: list[str], size: int = PAGE_CHARS) -> list[str]:
    pages, current = [], ""
    for block in (b.strip() for b in blocks):
        if not block:
            continue
        if current and len(current) + len(block) + 2 > size:
            pages.append(current)
            current = ""
        current = f"{current}\n\n{block}" if current else block
    return pages + [current] if current else pages


def decode(data: bytes) -> str:
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1")


def read_pdf(path: Path) -> list[str]:
    with pymupdf.open(path) as doc:
        return [page.get_text() for page in doc]


def read_docx(path: Path) -> list[str]:
    doc = Document(path)
    blocks = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        blocks.append("\n".join(" | ".join(cell.text.strip() for cell in row.cells) for row in table.rows))
    return paginate(blocks)


def read_pptx(path: Path) -> list[str]:
    slides = []
    for slide in Presentation(path).slides:
        parts = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                parts.append(shape.text_frame.text)
            if shape.has_table:
                parts.append("\n".join(" | ".join(c.text for c in row.cells) for row in shape.table.rows))
        if slide.has_notes_slide:
            parts.append(slide.notes_slide.notes_text_frame.text)
        slides.append("\n".join(parts))
    return slides


def sheet_page(name: str, rows) -> str:
    lines = []
    for row in rows:
        cells = [str(c).strip() for c in row if c not in (None, "")]
        if cells:
            lines.append(" | ".join(cells))
        if len(lines) >= MAX_SHEET_ROWS:
            lines.append("[...]")
            break
    return f"Hoja: {name}\n" + "\n".join(lines) if lines else ""


def read_xlsx(path: Path) -> list[str]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        return [sheet_page(ws.title, ws.iter_rows(values_only=True)) for ws in wb.worksheets]
    finally:
        wb.close()


def read_xls(path: Path) -> list[str]:
    wb = xlrd.open_workbook(path)
    return [sheet_page(s.name, (s.row_values(i) for i in range(s.nrows))) for s in wb.sheets()]


def read_rtf(path: Path) -> list[str]:
    return paginate(rtf_to_text(decode(path.read_bytes()), errors="ignore").split("\n\n"))


def read_txt(path: Path) -> list[str]:
    return paginate(decode(path.read_bytes()).split("\n\n"))


def html_soup(path: Path) -> BeautifulSoup:
    return BeautifulSoup(decode(path.read_bytes()), "html.parser")


def html_title(path: Path) -> str | None:
    title = html_soup(path).title
    return title.get_text(strip=True) if title else None


def read_html(path: Path) -> list[str]:
    soup = html_soup(path)
    for tag in soup(HTML_NOISE):
        tag.decompose()
    root = soup.find("main") or soup.find("article") or soup.body or soup
    return paginate(root.get_text("\n").split("\n\n"))


READERS = {
    ".pdf": read_pdf, ".docx": read_docx, ".pptx": read_pptx, ".xlsx": read_xlsx, ".xls": read_xls,
    ".rtf": read_rtf, ".txt": read_txt, ".html": read_html, ".htm": read_html,
}
UNSUPPORTED = {".doc", ".ppt"}


def extract(path: Path) -> list[str]:
    return [clean(page) for page in READERS[path.suffix.lower()](path)]