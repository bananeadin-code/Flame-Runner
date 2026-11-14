"""Catálogo y descarga de las investigaciones de Combustion Science del NASA PSI.

Uso (desde la raíz del repo):
    python -m backend.ingest.psi catalog            # metadatos + inventario de archivos
    python -m backend.ingest.psi download           # descarga los archivos seleccionados
    python -m backend.ingest.psi download --tier context --max-mb 200
    python -m backend.ingest.psi download --only PSI-25 PSI-69

Usa la API pública del repositorio PSI (la misma que usa su web). No requiere cuenta.
La descarga se puede interrumpir y reanudar: los archivos ya completos se saltan.
"""

import argparse
import csv
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import ROOT_DIR

API = "https://psi.nasa.gov/geode-py/ws"
OUT = ROOT_DIR / "resources" / "psi"
INVENTORY = OUT / "inventory.csv"

# Prioridad de cada categoría de PSI. "raw" (vídeo, imágenes, telemetría cruda) suma ~6 TB.
TIERS = {
    "Experimental table": "core",
    "Reports": "core",
    "Science Documents": "core",
    "Analyzed Data": "core",
    "Reference Data": "core",
    "metadata": "core",
    "Presentations": "context",
    "Engineering Documents": "context",
    "Representative Image(s)": "context",
    "Raw Data": "raw",
}
TIER_ORDER = {"core": 0, "context": 1, "raw": 2}
USEFUL_EXT = {"pdf", "csv", "xls", "xlsx", "txt", "dat", "doc", "docx", "rtf", "ppt", "pptx", "zip", "json", "xml"}
# En las investigaciones antiguas (FLEX, BASS...) los artículos e informes están dentro de "Raw Data".
DOC_EXT = {"pdf", "doc", "docx", "rtf", "ppt", "pptx", "xls", "xlsx"}


def _tier(category: str, ext: str) -> str:
    tier = TIERS.get(category, "raw")
    return "core" if tier == "raw" and ext in DOC_EXT else tier

client = httpx.Client(timeout=120, follow_redirects=True)


@retry(stop=stop_after_attempt(4), wait=wait_exponential(min=2, max=30), reraise=True)
def _get(url: str, **params) -> httpx.Response:
    r = client.get(url, params=params or None)
    r.raise_for_status()
    return r


def _save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def _current_files(versions: list[dict]) -> dict[str, dict]:
    """Aplica en orden los 'added'/'removed' de cada versión para obtener los archivos vigentes."""
    files: dict[str, dict] = {}
    for v in sorted(versions, key=lambda v: v["version"]):
        for f in v.get("added") or []:
            files[f["remote_path"]] = f
        for f in v.get("removed") or []:
            files.pop(f.get("remote_path"), None)
    return files


def catalog() -> None:
    """Descarga los metadatos de las investigaciones y genera inventory.csv."""
    hits = _get(f"{API}/repo/search", ffield="Research Area", fvalue="Combustion Science", size=500).json()
    accessions = sorted(
        (h["_source"]["Accession"] for h in hits["hits"]["hits"] if h["_index"] == "investigation"),
        key=lambda a: int(a.split("-")[1]),
    )
    _save_json(OUT / "investigations_index.json", hits)
    print(f"{len(accessions)} investigaciones de Combustion Science")

    rows = []
    for acc in accessions:
        detail = _get(f"{API}/repo/investigations/{acc}").json()
        detail.pop("added", None)  # la lista de archivos sale de las versiones
        _save_json(OUT / "investigations" / f"{acc}.json", detail)
        versions = _get(f"{API}/repo/investigations/{acc}/versions").json()["versions"]
        for f in _current_files(versions).values():
            parts = f["remote_path"].split("/")  # /Home/psi-data/PSI-25/<categoria>/...
            category = parts[4] if len(parts) > 5 else ""
            ext = f["file_name"].rsplit(".", 1)[-1].lower() if "." in f["file_name"] else ""
            rows.append({
                "accession": acc,
                "acronym": detail.get("investigationAcronym") or "",
                "category": category,
                "tier": _tier(category, ext),
                "file_name": f["file_name"],
                "ext": ext,
                "size_bytes": int(f.get("file_size") or 0),
                "version": f.get("version") or "",
                "restricted": bool(f.get("restricted")),
                "subfolder": "/".join(parts[5:-1]),
                "description": (f.get("subcategory") or "").strip(),
            })
        print(f"  {acc}: {sum(r['accession'] == acc for r in rows)} archivos")

    rows.sort(key=lambda r: (int(r["accession"].split("-")[1]), TIER_ORDER[r["tier"]], r["category"], r["file_name"]))
    with INVENTORY.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    total = sum(r["size_bytes"] for r in rows) / 1e9
    print(f"Inventario: {len(rows)} archivos, {total:,.1f} GB -> {INVENTORY.relative_to(ROOT_DIR)}")


def _select(tier: str, max_mb: float, only: list[str] | None) -> list[dict]:
    with INVENTORY.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    limit = TIER_ORDER[tier]
    selected, seen = [], set()
    for r in rows:
        key = (r["accession"], r["file_name"], r["size_bytes"])  # mismo archivo en otra carpeta/versión
        if (
            TIER_ORDER[r["tier"]] <= limit
            and r["ext"] in USEFUL_EXT
            and int(r["size_bytes"]) <= max_mb * 1e6
            and r["restricted"] == "False"
            and (not only or r["accession"] in only)
            and key not in seen
        ):
            seen.add(key)
            selected.append(r)
    return selected


def _target(r: dict) -> Path:
    return OUT / "files" / r["accession"] / r["category"] / r["subfolder"] / r["file_name"]


@retry(stop=stop_after_attempt(4), wait=wait_exponential(min=2, max=30), reraise=True)
def _download(r: dict) -> str:
    dest = _target(r)
    size = int(r["size_bytes"])
    if dest.exists() and (size == 0 or dest.stat().st_size == size):
        return "skip"
    params = {"file": r["file_name"], "redirect": "false"}
    if r["version"]:
        params["version"] = r["version"]
    url = _get(f"{API}/studies/{r['accession']}/download", **params).text.strip()
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    with client.stream("GET", url) as resp:
        resp.raise_for_status()
        with tmp.open("wb") as fh:
            for chunk in resp.iter_bytes(1 << 20):
                fh.write(chunk)
    tmp.replace(dest)
    return "ok"


def download(tier: str, max_mb: float, only: list[str] | None, workers: int) -> None:
    if not INVENTORY.exists():
        sys.exit("Falta inventory.csv: ejecuta primero `python -m backend.ingest.psi catalog`.")
    selected = _select(tier, max_mb, only)
    total = sum(int(r["size_bytes"]) for r in selected) / 1e6
    print(f"{len(selected)} archivos seleccionados ({total:,.0f} MB), tier<={tier}, max {max_mb} MB/archivo")
    counts = {"ok": 0, "skip": 0, "error": 0}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_download, r): r for r in selected}
        for i, fut in enumerate(as_completed(futures), 1):
            r = futures[fut]
            try:
                counts[fut.result()] += 1
            except Exception as exc:  # se informa y se sigue con el resto
                counts["error"] += 1
                print(f"  ERROR {r['accession']} {r['file_name']}: {exc}")
            if i % 25 == 0 or i == len(selected):
                print(f"  {i}/{len(selected)}  {counts}")
    print(f"Listo -> {(OUT / 'files').relative_to(ROOT_DIR)}  {counts}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("catalog", help="metadatos e inventario de archivos")
    d = sub.add_parser("download", help="descarga los archivos seleccionados del inventario")
    d.add_argument("--tier", choices=list(TIER_ORDER), default="core",
                   help="core: datos/informes (por defecto); context: +presentaciones e ingeniería; raw: todo")
    d.add_argument("--max-mb", type=float, default=100, help="tamaño máximo por archivo (MB)")
    d.add_argument("--only", nargs="*", help="solo estas investigaciones, p. ej. PSI-25 PSI-69")
    d.add_argument("--workers", type=int, default=4)
    a = p.parse_args()
    if a.cmd == "catalog":
        catalog()
    else:
        download(a.tier, a.max_mb, a.only, a.workers)


if __name__ == "__main__":
    main()
