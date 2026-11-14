import re
from dataclasses import dataclass

# Limpiador; convierte datos aproximados de los informes y tablas en sus variaciones legibles (aproximado, minimo, unidad, etc)

NULL_TOKENS = {"", "-", "--", "n/a", "na", "none", "nan", "?"}
NUMBER = re.compile(r"\d*\.?\d+(?:[eE][-+]?\d+)?")
UNIT = re.compile(r"\d\s*([a-zA-Zµμ%°]+(?:/[a-zA-Z]+)?)")
O2_PERCENT = re.compile(r"(\d*\.?\d+)\s*%\s*O2", re.IGNORECASE)
FORMULA = re.compile(r"\b(?:[A-Z][a-z]?\d*)+\d(?:[A-Z][a-z]?\d*)*\b")

PRESSURE_KPA = {"kpa": 1.0, "atm": 101.325, "bar": 100.0, "mmhg": 0.133322, "psi": 6.89476, "psia": 6.89476}
LENGTH_MM = {"mm": 1.0, "cm": 10.0, "m": 1000.0, "micron": 0.001, "µm": 0.001, "um": 0.001}
VELOCITY_CM_S = {"cm/s": 1.0, "mm/s": 0.1, "m/s": 100.0}
TIME_S = {"s": 1.0, "sec": 1.0, "min": 60.0, "minutes": 60.0}
CONVERSIONS = {"pressure": (PRESSURE_KPA, "kPa"), "length": (LENGTH_MM, "mm"), "velocity": (VELOCITY_CM_S, "cm/s"), "time": (TIME_S, "s")}


@dataclass(frozen=True)
class Value:
    low: float
    high: float
    unit: str | None = None
    approximate: bool = False

    @property
    def single(self) -> float | None:
        return self.low if self.low == self.high else None

    def scaled(self, factor: float, unit: str | None) -> "Value":
        return Value(self.low * factor, self.high * factor, unit, self.approximate)


def is_null(raw: object) -> bool:
    return raw is None or str(raw).strip().lower() in NULL_TOKENS


def parse(raw: object) -> Value | None:
    if is_null(raw):
        return None
    text = str(raw).strip()
    numbers = [float(n) for n in NUMBER.findall(text)]
    if not numbers:
        return None
    units = UNIT.findall(text)
    approximate = "~" in text or "approx" in text.lower()
    return Value(min(numbers), max(numbers), units[-1] if units else None, approximate)


def parse_o2(raw: object) -> Value | None:
    if is_null(raw):
        return None
    text = str(raw)
    match = O2_PERCENT.search(text)
    # se quitan fórmulas (O2, CO2, C2H4) para no leer su dígito como valor: "LOW O2" no es 2 %
    value = Value(float(match.group(1)), float(match.group(1)), "%", "~" in text) if match else parse(FORMULA.sub(" ", text))
    if value is None:
        return None
    factor = 0.01 if value.unit == "%" or value.high > 1 else 1.0
    if value.unit == "%" and value.high > 100:
        factor = 0.0001  # celda de Excel con formato de porcentaje: "3400%" en PSI-20 es 34 %
    fraction = value.scaled(factor, "fraction")
    return fraction if 0 <= fraction.low and fraction.high <= 1 else None


def convert(value: Value | None, kind: str, default_unit: str | None = None) -> Value | None:
    if value is None:
        return None
    table, target = CONVERSIONS[kind]
    unit = (value.unit or default_unit or "").lower()
    if unit not in table:
        return None
    return value.scaled(table[unit], target)


def parse_bool(raw: object) -> int | None:
    text = str(raw or "").strip().lower()
    if text in {"yes", "y", "true", "1"}:
        return 1
    if text in {"no", "n", "false", "0"}:
        return 0
    return None


def clean_text(raw: object) -> str | None:
    text = " ".join(str(raw or "").split())
    return None if is_null(text) else text