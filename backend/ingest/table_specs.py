from dataclasses import dataclass, field

# dice qué columna de cada CSV corresponde a cada campo común

PRIMARY_AREA = {
    "PSI-25": "prevention", "PSI-26": "prevention", "PSI-62": "prevention",
    "PSI-98": "prevention", "PSI-99": "prevention", "PSI-100": "prevention",
    "PSI-47": "detection", "PSI-101": "detection", "PSI-102": "detection",
    "PSI-107": "detection", "PSI-115": "detection",
    "PSI-39": "suppression", "PSI-68": "suppression", "PSI-69": "suppression",
    "PSI-117": "suppression", "PSI-142": "suppression", "PSI-159": "suppression",
    "PSI-10": "fundamental", "PSI-20": "fundamental", "PSI-21": "fundamental",
    "PSI-22": "fundamental", "PSI-23": "fundamental", "PSI-60": "fundamental",
    "PSI-106": "fundamental",
}


@dataclass(frozen=True)
class Measure:
    column: str
    quantity: str
    kind: str | None = None
    unit: str | None = None


@dataclass(frozen=True)
class TableSpec:
    fuel_class: str
    test_code: tuple[str, ...] = ()
    test_date: tuple[str, ...] = ()
    fuel: str | None = None
    fuel_default: str | None = None
    configuration: str | None = None
    o2: str | None = None
    pressure: str | None = None
    pressure_unit: str | None = None
    flow: str | None = None
    flow_unit: str = "cm/s"
    diluent: str | None = None
    diluent_default: str | None = None
    diluent_columns: dict[str, str] = field(default_factory=dict)
    ignited: str | None = None
    outcome: str | None = None
    burn_time: str | None = None
    measures: tuple[Measure, ...] = ()


FLAME_DESIGN = dict(
    fuel_class="gas", test_code=("^test$",), configuration="^flame type$", diluent_default="N2",
    pressure=r"^pmean", pressure_unit="atm",
    measures=(Measure(r"^tad", "adiabatic_flame_temperature", unit="K"), Measure(r"zst$", "stoichiometric_mixture_fraction")),
)

CFI_G = dict(
    fuel_class="gas", test_code=("^test$",), fuel="^fuel$", configuration="^flame type$",
    pressure=r"^approx p", pressure_unit="bar", ignited="^hot ignition$", outcome=r"^self.?-?ext",
    burn_time="^burn time", measures=(
        Measure(r"^tad", "adiabatic_flame_temperature", unit="K"),
        Measure("^zst$", "stoichiometric_mixture_fraction"),
        Measure(r"^peak burner t.*\(c", "peak_burner_temperature", unit="C"),
    ),
)

SAFFIRE_BASE = (
    Measure(r"thickness", "sample_thickness", "length", "cm"),
    Measure(r"^sample length", "sample_length", "length", "cm"),
    Measure(r"^sample width", "sample_width", "length", "cm"),
)

SAFFIRE_IGNITION = (
    Measure(r"^ignition power", "ignition_power", unit="W"),
    Measure(r"^ignition time", "ignition_time", "time", "s"),
)

SAFFIRE_GRAVITY = (
    Measure(r"^[^1]{1,2}-g burn length", "microgravity_burn_length", "length", "cm"),
    Measure(r"^1-g burn length", "normal_gravity_burn_length", "length", "cm"),
    Measure(r"^1-g spread rate", "normal_gravity_spread_rate", "velocity", "mm/s"),
)

SAFFIRE = dict(
    fuel_class="solid", test_code=("^sample number",), fuel="^material$", configuration="direction", flow="^air flow",
)

ACME_DAILY = dict(
    fuel_class="gas", test_code=(r"^test day",), fuel="^fuel bottle$",
    measures=(Measure(r"^flames ignited", "flames_ignited", unit="count"),),
)

SPECS: dict[str, TableSpec | None] = {
    "PSI-10_Experimental table_Flame Design_Inverse Flame.csv": TableSpec(**FLAME_DESIGN, fuel_default="C2H4", o2="^xo2$"),
    "PSI-10_Experimental table_Flame Design_Normal Flame.csv": TableSpec(**FLAME_DESIGN, fuel="^fuel$", o2=r"^xo2 \(init"),
    "PSI-20_Experimental table_ACME BRE.csv": TableSpec(
        fuel_class="gas", test_date=("^year$", "^month$", "^date$"), fuel="^fuel bottle$", o2="^oxygen conc", diluent_default="N2",
        measures=(Measure(r"^burner size", "burner_size", "length", "mm"), Measure("^flames ignited", "flames_ignited", unit="count")),
    ),
    "PSI-21_Experimental table_CLD Flame.csv": TableSpec(**ACME_DAILY, configuration="^test type$"),
    "PSI-22_Experimental table_ACME E-FIELD Flames.csv": TableSpec(**ACME_DAILY, configuration="^mesh polarity$"),
    "PSI-23_Experimental table_ACME s-Flame.csv": TableSpec(**ACME_DAILY, o2="^atmosphere", diluent="^atmosphere", diluent_default="N2", configuration="^test type$"),
    "PSI-25_Experimental table_BASS-II.csv": TableSpec(
        fuel_class="solid", test_code=("^test #$",), test_date=("^date$",), fuel="^fuel sample material$",
        o2=r"^calibrated initial o2", measures=(
            Measure(r"^calibrated final o2", "final_o2_percent", unit="%"),
            Measure(r"^initial co2", "initial_co2_percent", unit="%"),
            Measure(r"^final co2", "final_co2_percent", unit="%"),
            Measure(r"^initial co \(", "initial_co_ppm", unit="ppm"),
            Measure(r"^final co \(", "final_co_ppm", unit="ppm"),
        ),
    ),
    "PSI-26_Experimental table_BASS.csv": TableSpec(
        fuel_class="solid", test_code=("^as run test #$",), test_date=("^date$",), fuel="^fuel sample material$",
    ),
    "PSI-39_Experimental table_CFI.csv": TableSpec(
        fuel_class="droplet", test_code=("^flex number$",), test_date=("^test date$",), fuel="^fuel$",
        pressure="^pressure$", o2="^oxygen$", diluent_columns={"N2": "^nitrogen$", "He": "^helium$"},
    ),
    "PSI-47_Experimental table_DAFT.csv": TableSpec(
        fuel_class="aerosol", test_code=("^session name$",), test_date=("^actual day$",), fuel="^sample material$",
    ),
    "PSI-68_Experimental table_Flex2.csv": TableSpec(
        fuel_class="droplet", fuel=r"^sample", diluent="^ambient gas mixture$",
        o2="^oxygen mole fraction$", pressure="^ambient pressure", pressure_unit="atm", flow="^flow velocity",
        measures=(Measure(r"^initial droplet diameter", "initial_droplet_diameter", "length", "mm"),),
    ),
    "PSI-69_Experimental table_FLEX.csv": TableSpec(
        fuel_class="droplet", test_code=("^flex identifier$",), test_date=("^test date$",), fuel="^fuel$",
        pressure="^ambient pressure", pressure_unit="mmHg", o2=r"^o initial",
        diluent_columns={"N2": r"^n initial", "CO2": r"^co initial", "He": r"^he initial"},
        outcome="^test end$", burn_time="^burn time", measures=(
            Measure(r"^droplet initial diameter", "initial_droplet_diameter", "length", "mm"),
            Measure(r"^visible flame extinction diameter", "extinction_diameter", "length", "mm"),
            Measure(r"^burning rate", "burning_rate", unit="mm2/s"),
        ),
    ),
    "PSI-98_Experimental table_SAFFIRE-1.csv": TableSpec(
        **SAFFIRE, o2="^percent o2", burn_time="^burn time", measures=SAFFIRE_BASE + SAFFIRE_IGNITION,
    ),
    "PSI-99_Experimental table_SAFFIRE-2.csv": TableSpec(
        **SAFFIRE, o2="^percent o2", burn_time="^burn time", measures=SAFFIRE_BASE + SAFFIRE_IGNITION + SAFFIRE_GRAVITY,
    ),
    "PSI-100_Experimental table_SAFFIRE-3.csv": TableSpec(**SAFFIRE, measures=SAFFIRE_BASE),
    "PSI-101_Experimental table_SAME-R.csv": TableSpec(
        fuel_class="aerosol", test_code=("^same test #$",), test_date=("^date$",), fuel="^sample type$",
        configuration="^description$", flow="^inlet velocity", measures=(
            Measure(r"^rt/r0$", "smoke_ratio_rt_r0"),
            Measure(r"^duration", "duration", "time", "s"),
            Measure(r"^net aging time", "net_aging_time", "time", "s"),
        ),
    ),
    "PSI-102_Experimental table_SAME.csv": TableSpec(
        fuel_class="aerosol", test_code=("^sample #$",), fuel="^sample material$", flow="^air flow", measures=(
            Measure(r"^weight loss rate", "weight_loss_rate", unit="mg/min"),
            Measure(r"^aging duration", "aging_duration", "time", "min"),
        ),
    ),
    "PSI-106_Experimental table_Slice.csv": TableSpec(fuel_class="gas", test_date=("^test date$",), fuel="^fuel type$"),
    "PSI-107_Experimental table_Spice.csv": TableSpec(
        fuel_class="gas", test_code=("^gmt date$", "^gmt ignition$"), fuel="^fuel$", flow="^air rate", measures=(
            Measure(r"^nozzle", "nozzle_diameter", "length", "mm"),
            Measure(r"^fuel rate \(mg", "fuel_mass_flow", unit="mg/s"),
        ),
    ),
    "PSI-142_Experimental table_Data Summary Table.csv": None,
    "PSI-159_Experimental table_CFI-G_Inverse Flames.csv": TableSpec(**CFI_G, o2="^xo2$"),
    "PSI-159_Experimental table_CFI-G_Normal Flames.csv": TableSpec(**CFI_G, o2=r"^xo2 before"),
}