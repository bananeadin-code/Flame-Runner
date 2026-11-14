# pasa los datos de PSI de los archivos descargados a la base de datos, en un formato que el dashboard puede consultar y graficar.

import csv
import hashlib
import io
import json
import re
import sqlite3
from pathlib import Path

from ..config import ROOT_DIR
from ..db import connect, init_db
from .table_specs import PRIMARY_AREA, SPECS, TableSpec
from .values import Value, clean_text, convert, parse, parse_bool, parse_o2

PSI_DIR = ROOT_DIR / "resources" / "psi"
GASES = re.compile(r"\b(N2|He|CO2|Ar|SF6)\b")
OUTCOMES = {"se": "self_extinguished", "ft": "flow_terminated", "extinction": "extinguished", "disruption": "disrupted"}


def normalize_header(header: str) -> str:
    return " ".join(header.replace("\ufeff", "").split()).lower()


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    data = path.read_bytes()
    for encoding in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = data.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    reader = csv.reader(io.StringIO(text))
    headers = [h.strip() for h in next(reader)]
    rows = [dict(zip(headers, row)) for row in reader if any(cell.strip() for cell in row)]
    return headers, rows


def load_investigations(conn: sqlite3.Connection) -> int:
    index = json.loads((PSI_DIR / "investigations_index.json").read_text(encoding="utf-8"))
    platforms = {h["_source"]["Accession"]: h["_source"].get("Flight Platform") for h in index["hits"]["hits"]}
    count = 0
    for path in sorted((PSI_DIR / "investigations").glob("PSI-*.json")):
        d = json.loads(path.read_text(encoding="utf-8"))
        acc = d["accession"]
        conn.execute(
            """INSERT INTO investigations (accession, acronym, title, project_type, platform, primary_area, objective,
                   hypothesis, approach, research_impacts, start_date, end_date, source_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(accession) DO UPDATE SET
                   acronym=excluded.acronym, title=excluded.title, project_type=excluded.project_type,
                   platform=excluded.platform, primary_area=excluded.primary_area, objective=excluded.objective,
                   hypothesis=excluded.hypothesis, approach=excluded.approach,
                   research_impacts=excluded.research_impacts, start_date=excluded.start_date,
                   end_date=excluded.end_date, source_json=excluded.source_json""",
            (
                acc, clean_text(d.get("investigationAcronym")), d["title"].strip(), d.get("projectType"),
                clean_text(platforms.get(acc) or d.get("flightProgram")), PRIMARY_AREA.get(acc),
                clean_text(d.get("objective")), clean_text(d.get("hypothesis")), clean_text(d.get("approach")),
                clean_text(d.get("researchImpacts")), d.get("investigationStartDate"), d.get("investigationEndDate"),
                json.dumps(d, ensure_ascii=False),
            ),
        )
        for pub in d.get("publications") or []:
            if not clean_text(pub.get("title")):
                continue
            conn.execute(
                """INSERT INTO publications (accession, title, authors, doi, status) VALUES (?, ?, ?, ?, ?)
                   ON CONFLICT(accession, title) DO UPDATE SET
                       authors=excluded.authors, doi=excluded.doi, status=excluded.status""",
                (acc, clean_text(pub["title"]), clean_text(pub.get("authorList")), clean_text(pub.get("doi")),
                 (pub.get("status") or {}).get("annotationValue")),
            )
        count += 1
    return count


class Row:
    def __init__(self, data: dict[str, str], columns: dict[str, str]):
        self.data = data
        self.columns = columns

    def get(self, pattern: str | None) -> str | None:
        if not pattern:
            return None
        for normalized, original in self.columns.items():
            if re.search(pattern, normalized):
                return self.data.get(original)
        return None

    def join(self, patterns: tuple[str, ...]) -> str | None:
        parts = [clean_text(self.get(p)) for p in patterns]
        return "-".join(p for p in parts if p) or None


def missing_columns(spec: TableSpec, columns: dict[str, str]) -> list[str]:
    patterns = [spec.fuel, spec.configuration, spec.o2, spec.pressure, spec.flow, spec.diluent, spec.ignited,
                spec.outcome, spec.burn_time, *spec.test_code, *spec.test_date, *spec.diluent_columns.values(),
                *(m.column for m in spec.measures)]
    return [p for p in patterns if p and not any(re.search(p, c) for c in columns)]


def diluent_of(row: Row, spec: TableSpec) -> str | None:
    if spec.diluent:
        found = dict.fromkeys(GASES.findall(row.get(spec.diluent) or ""))
        return "/".join(found) or spec.diluent_default
    present = [gas for gas, col in spec.diluent_columns.items() if (v := parse(row.get(col))) and v.high > 0]
    return "+".join(present) or spec.diluent_default


def outcome_of(raw: str | None) -> str | None:
    text = clean_text(raw)
    if not text:
        return None
    return OUTCOMES.get(text.lower(), re.sub(r"\W+", "_", text.lower()).strip("_"))


def normalize(row: Row, spec: TableSpec) -> tuple[dict, list[tuple[str, Value, str | None]]]:
    o2 = parse_o2(row.get(spec.o2))
    pressure = convert(parse(row.get(spec.pressure)), "pressure", spec.pressure_unit)
    flow = convert(parse(row.get(spec.flow)), "velocity", spec.flow_unit)
    burn = convert(parse(row.get(spec.burn_time)), "time", "s")
    test = {
        "test_code": row.join(spec.test_code),
        "test_date": row.join(spec.test_date),
        "fuel": clean_text(row.get(spec.fuel)) or spec.fuel_default,
        "fuel_class": spec.fuel_class,
        "configuration": clean_text(row.get(spec.configuration)),
        "diluent": diluent_of(row, spec),
        "o2_min": o2.low if o2 else None,
        "o2_max": o2.high if o2 else None,
        "pressure_kpa": pressure.single if pressure and pressure.high > 0 else None,  # FLEX trae una fila con presión 0 (error de la tabla)
        "flow_min_cm_s": flow.low if flow else None,
        "flow_max_cm_s": flow.high if flow else None,
        "ignited": parse_bool(row.get(spec.ignited)),
        "outcome": outcome_of(row.get(spec.outcome)),
        "burn_time_s": burn.single if burn else None,
        "is_approximate": int(any(v and v.approximate for v in (o2, pressure, flow, burn))),
    }
    measures = []
    if pressure and pressure.single is None:
        measures += [("pressure_min", pressure, "kPa"), ("pressure_max", pressure, "kPa")]
    for m in spec.measures:
        value = parse(row.get(m.column))
        if m.kind:
            value = convert(value, m.kind, m.unit)
        if value:
            unit = value.unit if m.kind else m.unit
            if value.single is None:
                measures += [(f"{m.quantity}_min", value, unit), (f"{m.quantity}_max", value, unit)]
            else:
                measures.append((m.quantity, value, unit))
    return test, measures


def load_table(conn: sqlite3.Connection, path: Path) -> str:
    accession = "-".join(path.name.split("_")[0].split("-")[:2])
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    current = conn.execute("SELECT id, sha256 FROM source_tables WHERE file_name = ?", (path.name,)).fetchone()
    if current and current["sha256"] == sha:
        return "sin cambios"
    if current:
        conn.execute("DELETE FROM source_tables WHERE id = ?", (current["id"],))
    headers, rows = read_csv(path)
    table_id = conn.execute(
        "INSERT INTO source_tables (accession, file_name, sha256, columns, row_count) VALUES (?, ?, ?, ?, ?)",
        (accession, path.name, sha, json.dumps(headers, ensure_ascii=False), len(rows)),
    ).lastrowid
    spec = SPECS.get(path.name)
    columns = {normalize_header(h): h for h in headers}
    n_tests = n_measures = 0
    for i, data in enumerate(rows):
        raw_id = conn.execute(
            "INSERT INTO raw_rows (table_id, row_index, data) VALUES (?, ?, ?)",
            (table_id, i, json.dumps(data, ensure_ascii=False)),
        ).lastrowid
        if spec is None:
            continue
        test, measures = normalize(Row(data, columns), spec)
        test_id = conn.execute(
            f"INSERT INTO tests (accession, raw_row_id, {', '.join(test)}) VALUES (?, ?, {', '.join('?' * len(test))})",
            (accession, raw_id, *test.values()),
        ).lastrowid
        n_tests += 1
        for quantity, value, unit in measures:
            number = value.high if quantity.endswith("_max") else value.low
            conn.execute(
                "INSERT OR REPLACE INTO measurements (test_id, quantity, value, unit, is_approximate) VALUES (?, ?, ?, ?, ?)",
                (test_id, quantity, number, unit, int(value.approximate)),
            )
            n_measures += 1
    status = f"{len(rows)} filas, {n_tests} pruebas, {n_measures} mediciones"
    if spec is None:
        status += " (solo capa cruda)" if path.name in SPECS else " (SIN MAPEO: añadir a table_specs.py)"
    elif missing := missing_columns(spec, columns):
        status += f" | columnas no encontradas: {missing}"
    return status


def main() -> None:
    init_db()
    conn = connect()
    try:
        with conn:
            print(f"Investigaciones: {load_investigations(conn)}")
        files = sorted(PSI_DIR.glob("files/PSI-*/Experimental table/*.csv"))
        if not files:
            print("No hay tablas en resources/psi/files: ejecuta `python -m backend.ingest.psi download`.")
        for path in files:
            with conn:
                print(f"  {path.name}: {load_table(conn, path)}")
        totals = {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                  for t in ("investigations", "publications", "source_tables", "raw_rows", "tests", "measurements")}
        print(f"Total: {totals}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()