import csv
import io
import math
import sqlite3
from collections import Counter, defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from .api import TEST_FIELDS, hardware_of, in_envelope, rows, scenario_or_404
from .db import get_db
from .sources import psi_url

router = APIRouter(prefix="/api")

RANK_WEIGHTS = {"oxygen": 0.30, "envelope": 0.25, "evidence": 0.25, "pressure": 0.10, "flight": 0.10}
VARIABLES = (
    ("fuel", lambda t: t["fuel"]),
    ("configuration", lambda t: t["configuration"]),
    ("diluent", lambda t: t["diluent"]),
    ("o2_percent", lambda t: None if t["o2_min"] is None else round((t["o2_min"] + t["o2_max"]) / 2 * 100, 1)),
    ("pressure_kpa", lambda t: None if t["pressure_kpa"] is None else round(t["pressure_kpa"], 1)),
    ("flow_cm_s", lambda t: None if t["flow_min_cm_s"] is None else round((t["flow_min_cm_s"] + t["flow_max_cm_s"]) / 2, 1)),
    ("outcome", lambda t: t["outcome"]),
)
CSV_TEST_COLUMNS = ("accession", "acronym", "test_code", "test_date", "fuel", "fuel_class", "configuration", "diluent",
                    "o2_min_percent", "o2_max_percent", "pressure_kpa", "flow_min_cm_s", "flow_max_cm_s", "ignited",
                    "outcome", "burn_time_s", "is_approximate")


def all_tests(db: sqlite3.Connection) -> list[dict]:
    return rows(db.execute(f"SELECT {', '.join(TEST_FIELDS)} FROM tests WHERE fuel IS NOT NULL"))


def rank_investigations(db: sqlite3.Connection, scenario: dict, area: str | None = None) -> list[dict]:
    investigations = rows(db.execute(
        "SELECT accession, acronym, title, project_type, platform, primary_area FROM investigations"))
    by_accession = defaultdict(list)
    for test in all_tests(db):
        by_accession[test["accession"]].append(test)
    findings = dict(db.execute(
        """SELECT f.accession, COUNT(DISTINCT f.id) FROM findings f JOIN citations c ON c.finding_id = f.id AND c.verified = 1
           WHERE f.accession IS NOT NULL AND (? IS NULL OR f.safety_area = ?) GROUP BY f.accession""", (area, area)).fetchall())
    top_findings = max(findings.values(), default=1) or 1
    target_o2, target_p = scenario["o2_fraction"], scenario["pressure_kpa"]
    ranked = []
    for inv in investigations:
        tests = by_accession[inv["accession"]]
        o2_ranges = [(t["o2_min"], t["o2_max"]) for t in tests if t["o2_min"] is not None]
        pressures = [t["pressure_kpa"] for t in tests if t["pressure_kpa"] is not None]
        o2_gap = min((0.0 if low <= target_o2 <= high else min(abs(low - target_o2), abs(high - target_o2))
                      for low, high in o2_ranges), default=None)
        pressure_gap = min((abs(p - target_p) / target_p for p in pressures), default=None)
        inside = sum(1 for t in tests if in_envelope(t, scenario)["in_scenario"])
        parts = {
            "oxygen": 0.0 if o2_gap is None else round(1 - min(o2_gap / 0.15, 1), 2),
            "envelope": round(min(1.0, math.log1p(inside) / math.log1p(20)), 2),
            "evidence": round(math.sqrt(findings.get(inv["accession"], 0) / top_findings), 2),
            "pressure": 0.0 if pressure_gap is None else round(1 - min(pressure_gap, 1), 2),
            "flight": 1.0 if "Microgravity" in (inv["project_type"] or "") else 0.3,
        }
        ranked.append(inv | {
            "score": round(sum(RANK_WEIGHTS[k] * v for k, v in parts.items()), 3),
            "parts": parts,
            "tests": len(tests),
            "tests_in_scenario": inside,
            "findings": findings.get(inv["accession"], 0),
            "o2_min": min((low for low, _ in o2_ranges), default=None),
            "o2_max": max((high for _, high in o2_ranges), default=None),
            "pressure_min": min(pressures, default=None),
            "pressure_max": max(pressures, default=None),
            "hardware": hardware_of(inv["accession"], inv["project_type"]),
            "psi_url": psi_url(inv["accession"]),
        })
    ranked.sort(key=lambda r: (r["score"], r["findings"]), reverse=True)
    for position, item in enumerate(ranked, 1):
        item["rank"] = position
    return ranked


@router.get("/ranking")
def ranking(
    scenario: str = "lunar",
    area: str | None = Query(None, pattern="^(prevention|detection|suppression|fundamental)$"),
    db: sqlite3.Connection = Depends(get_db),
) -> dict:
    scen = scenario_or_404(db, scenario)
    return {"scenario": scen, "weights": RANK_WEIGHTS, "investigations": rank_investigations(db, scen, area)}


def describe_variables(tests: list[dict]) -> list[dict]:
    result = []
    for name, getter in VARIABLES:
        values = [getter(t) for t in tests]
        present = [v for v in values if v not in (None, "")]
        counts = Counter(present)
        numeric = present and all(isinstance(v, (int, float)) for v in present)
        status = "not_recorded" if not present else "varied" if len(counts) > 1 else "fixed"
        entry = {"variable": name, "status": status, "distinct": len(counts), "recorded": len(present)}
        if numeric:
            entry |= {"min": min(present), "max": max(present)}
        else:
            entry["examples"] = [v for v, _ in counts.most_common(4)]
        result.append(entry)
    return result


@router.get("/compare")
def compare(ids: str = Query(..., min_length=3, max_length=200), db: sqlite3.Connection = Depends(get_db)) -> dict:
    accessions = list(dict.fromkeys(a.strip() for a in ids.split(",") if a.strip()))[:4]
    tests = all_tests(db)
    items = []
    for accession in accessions:
        inv = db.execute(
            """SELECT accession, acronym, title, project_type, platform, primary_area, objective, start_date, end_date
               FROM investigations WHERE accession = ?""", (accession,)).fetchone()
        if inv is None:
            raise HTTPException(404, f"Investigación desconocida: {accession}")
        own = [t for t in tests if t["accession"] == accession]
        quantities = rows(db.execute(
            """SELECT m.quantity, m.unit, COUNT(*) AS count FROM measurements m JOIN tests t ON t.id = m.test_id
               WHERE t.accession = ? GROUP BY m.quantity, m.unit ORDER BY count DESC""", (accession,)))
        findings = dict(db.execute(
            """SELECT f.safety_area, COUNT(DISTINCT f.id) FROM findings f JOIN citations c ON c.finding_id = f.id
               AND c.verified = 1 WHERE f.accession = ? GROUP BY f.safety_area""", (accession,)).fetchall())
        o2 = [t for t in own if t["o2_min"] is not None]
        pressure = [t["pressure_kpa"] for t in own if t["pressure_kpa"] is not None]
        flow = [t for t in own if t["flow_min_cm_s"] is not None]
        items.append(dict(inv) | {
            "hardware": hardware_of(accession, inv["project_type"]),
            "psi_url": psi_url(accession),
            "tests": len(own),
            "fuel_classes": sorted({t["fuel_class"] for t in own if t["fuel_class"]}),
            "fuels": [f for f, _ in Counter(t["fuel"] for t in own if t["fuel"]).most_common(6)],
            "diluents": sorted({t["diluent"] for t in own if t["diluent"]}),
            "o2_range": [min(t["o2_min"] for t in o2), max(t["o2_max"] for t in o2)] if o2 else None,
            "pressure_range": [min(pressure), max(pressure)] if pressure else None,
            "flow_range": [min(t["flow_min_cm_s"] for t in flow), max(t["flow_max_cm_s"] for t in flow)] if flow else None,
            "quantities": quantities,
            "findings_by_area": findings,
            "variables": describe_variables(own),
        })
    return {"investigations": items}


@router.get("/gravity-bounds")
def gravity_bounds(db: sqlite3.Connection = Depends(get_db)) -> dict:
    pairs = defaultdict(dict)
    for r in db.execute(
            """SELECT t.id, t.accession, t.test_code, t.fuel, t.o2_min, t.flow_min_cm_s, m.quantity, m.value, m.unit
               FROM tests t JOIN measurements m ON m.test_id = t.id
               WHERE m.quantity IN ('microgravity_burn_length', 'microgravity_burn_length_max', 'normal_gravity_burn_length')"""):
        item = pairs[r["id"]]
        item.update({"test_id": r["id"], "accession": r["accession"], "test_code": r["test_code"], "fuel": r["fuel"],
                     "o2_percent": None if r["o2_min"] is None else round(r["o2_min"] * 100, 1), "flow_cm_s": r["flow_min_cm_s"]})
        key = "normal_gravity_mm" if r["quantity"].startswith("normal") else "microgravity_mm"
        item[key] = max(item.get(key) or 0, r["value"])
    paired = [p for p in pairs.values() if "normal_gravity_mm" in p and "microgravity_mm" in p]
    efield = db.execute("SELECT COUNT(*) FROM tests WHERE accession = 'PSI-22'").fetchone()[0]
    return {"pairs": sorted(paired, key=lambda p: p["test_code"] or ""), "efield_tests": efield}


def csv_response(header: tuple, records: list[tuple], filename: str) -> Response:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    writer.writerows(records)
    return Response("﻿" + buffer.getvalue(), media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/export/tests.csv")
def export_tests(
    scenario: str | None = None,
    fuel_class: str | None = Query(None, pattern="^(solid|droplet|gas|aerosol)$"),
    only_in_scenario: bool = False,
    db: sqlite3.Connection = Depends(get_db),
) -> Response:
    scen = scenario_or_404(db, scenario)
    acronyms = dict(db.execute("SELECT accession, acronym FROM investigations").fetchall())
    header = CSV_TEST_COLUMNS + (("in_scenario",) if scen else ())
    records = []
    for t in all_tests(db):
        if fuel_class and t["fuel_class"] != fuel_class:
            continue
        inside = in_envelope(t, scen)["in_scenario"] if scen else None
        if only_in_scenario and not inside:
            continue
        pct = lambda v: None if v is None else round(v * 100, 3)
        record = (t["accession"], acronyms.get(t["accession"]), t["test_code"], t["test_date"], t["fuel"], t["fuel_class"],
                  t["configuration"], t["diluent"], pct(t["o2_min"]), pct(t["o2_max"]), t["pressure_kpa"], t["flow_min_cm_s"],
                  t["flow_max_cm_s"], t["ignited"], t["outcome"], t["burn_time_s"], t["is_approximate"])
        records.append(record + ((inside,) if scen else ()))
    name = f"flame-runner-tests{'-' + scen['id'] if scen else ''}.csv"
    return csv_response(header, records, name)


@router.get("/export/measurements.csv")
def export_measurements(quantity: str | None = None, db: sqlite3.Connection = Depends(get_db)) -> Response:
    sql = """SELECT t.accession, i.acronym, t.test_code, t.fuel, t.fuel_class, t.o2_min, t.pressure_kpa, m.quantity, m.value,
                    m.unit, m.is_approximate
             FROM measurements m JOIN tests t ON t.id = m.test_id LEFT JOIN investigations i ON i.accession = t.accession"""
    params = ()
    if quantity:
        sql += " WHERE m.quantity = ?"
        params = (quantity,)
    records = [(r["accession"], r["acronym"], r["test_code"], r["fuel"], r["fuel_class"],
                None if r["o2_min"] is None else round(r["o2_min"] * 100, 3), r["pressure_kpa"], r["quantity"], r["value"],
                r["unit"], r["is_approximate"]) for r in db.execute(sql + " ORDER BY t.accession, t.id", params)]
    header = ("accession", "acronym", "test_code", "fuel", "fuel_class", "o2_percent", "pressure_kpa", "quantity", "value",
              "unit", "is_approximate")
    return csv_response(header, records, f"flame-runner-measurements{'-' + quantity if quantity else ''}.csv")
