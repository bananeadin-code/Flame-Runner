import { useMemo, useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { href } from "../lib/route";
import { AREA_LABEL, DOC_TYPE_LABEL, FUEL_CLASS_LABEL, OUTCOME_LABEL, QUANTITY_LABEL, VARIABLE_LABEL, label, num, year } from "../lib/format";
import { MEDIA } from "../content/media";
import { pick, tr } from "../lib/i18n";
import { AskButton, MissionBar, Page } from "../components/Layout";
import { apiUrl } from "../lib/api";
import { Link } from "../components/Link";
import { HARDWARE } from "../content/narrative";
import { HardwareFamilies } from "./Ranking";

function DownloadCsv({ path, params, children }) {
  return (
    <a href={apiUrl(path, params)} download className="inline-flex items-center gap-2 rounded-full border border-noche px-4 py-1.5 text-sm hover:bg-noche hover:text-white">
      <span aria-hidden="true">↓</span> {children}
    </a>
  );
}

function TestVariables({ accession }) {
  const { data } = useApi("/api/compare", { ids: accession });
  const item = data?.investigations?.[0];
  if (!item || !item.tests) return null;
  const group = (status) => item.variables.filter((v) => v.status === status).map((v) => pick(VARIABLE_LABEL[v.variable]));
  return (
    <div className="rounded-lg bg-claro/60 p-3 text-sm">
      <p>
        <b>{tr("Varió entre pruebas: ", "Varied between tests: ")}</b>
        {group("varied").join(", ") || "—"}
      </p>
      <p className="mt-1">
        <b>{tr("Quedó fijo: ", "Stayed fixed: ")}</b>
        {group("fixed").join(", ") || "—"}
      </p>
    </div>
  );
}
import { Bars, Card, Chip, ChipRow, ErrorBox, Figure, Kpi, KpiRow, Loading, Note, SectionTitle, Tag } from "../components/ui";

function InvestigationDetail({ accession, onClose }) {
  const { data, error, loading } = useApi(`/api/investigations/${accession}`);
  return (
    <div className="rounded-xl border-2 border-azul bg-white p-4 animate-aparecer sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <small className="text-xs uppercase tracking-wide text-gris-oscuro">{accession}</small>
          <h3 className="text-xl break-words sm:text-2xl">{data ? `${data.acronym ? `${data.acronym} · ` : ""}${data.title}` : tr("Cargando…", "Loading…")}</h3>
        </div>
        <button onClick={onClose} className="text-3xl leading-none text-gris-oscuro" aria-label={tr("Cerrar detalle", "Close details")}>
          ×
        </button>
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4 text-sm leading-relaxed">
            {data.objective && (
              <p>
                <b>{tr("Objetivo. ", "Objective. ")}</b>
                {data.objective}
              </p>
            )}
            {data.hypothesis && (
              <p>
                <b>{tr("Hipótesis. ", "Hypothesis. ")}</b>
                {data.hypothesis}
              </p>
            )}
            {data.hardware && HARDWARE[data.hardware] && (
              <p>
                <b>{tr("Hardware. ", "Hardware. ")}</b>
                {pick(HARDWARE[data.hardware].name)}
              </p>
            )}
            <TestVariables accession={accession} />
            <div className="flex flex-wrap gap-2">
              <a href={data.psi_url} target="_blank" rel="noreferrer" className="inline-block rounded-full bg-azul px-4 py-1.5 text-white hover:bg-azul-claro">
                {tr("Ver en NASA PSI", "View on NASA PSI")} ↗
              </a>
              <Link to="comparar" query={{ ids: accession }} className="inline-block rounded-full border border-noche px-4 py-1.5 hover:bg-noche hover:text-white">
                {tr("Comparar con otras", "Compare with others")}
              </Link>
            </div>
          </div>
          <div>
            <KpiRow>
              <Kpi value={data.tests} label={tr("Pruebas", "Tests")} />
              <Kpi value={Object.values(data.findings_by_area).reduce((a, b) => a + b, 0)} label={tr("Hallazgos", "Findings")} tone="rojo" />
            </KpiRow>
            <Bars items={Object.entries(data.findings_by_area).map(([k, v]) => ({ key: k, label: label(AREA_LABEL, k), value: v }))} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Investigaciones({ query }) {
  const { area } = useApp();
  const { data, error, loading } = useApi("/api/investigations");
  const [selected, setSelected] = useState(query.acc || null);
  const list = (data || []).filter((i) => !area || i.primary_area === area);
  const platforms = {};
  (data || []).forEach((i) => {
    const p = (i.platform || tr("Tierra", "Ground")).replace("International Space Station (ISS)", "ISS").replace("Not Applicable", tr("Tierra", "Ground"));
    platforms[p] = (platforms[p] || 0) + 1;
  });
  const years = list.flatMap((i) => [year(i.start_date), year(i.end_date)]).filter(Boolean);
  const y0 = Math.min(...years, 2000);
  const y1 = Math.max(...years, 2026);
  const pos = (y) => ((y - y0) / (y1 - y0)) * 100;
  return (
    <Page route="investigaciones" tabs>
      <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <p className="text-lg text-gris-oscuro sm:text-xl">
          {tr(
            "Las 24 investigaciones de Combustion Science del repositorio Physical Sciences Informatics de la NASA: qué estudiaron, cuándo y cuánta evidencia aportan.",
            "The 24 Combustion Science investigations in NASA’s Physical Sciences Informatics repository: what they studied, when, and how much evidence they provide.",
          )}
        </p>
        <Figure media={MEDIA.astronauta} />
      </div>
      <MissionBar />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={data.length} label={tr("Investigaciones", "Investigations")} note="NASA PSI · Combustion Science" />
            <Kpi value={data.filter((i) => i.project_type?.includes("Microgravity")).length} label={tr("En vuelo", "In flight")} note={tr("ISS y naves Cygnus", "ISS and Cygnus spacecraft")} />
            <Kpi value={data.reduce((s, i) => s + i.tests, 0)} label={tr("Pruebas registradas", "Recorded tests")} />
            <Kpi value={data.reduce((s, i) => s + i.findings, 0)} label={tr("Hallazgos verificados", "Verified findings")} tone="rojo" />
          </KpiRow>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={tr("Por área principal", "By main area")}>
              <Bars
                items={["prevention", "detection", "suppression", "fundamental"].map((a) => ({
                  key: a,
                  label: label(AREA_LABEL, a),
                  value: data.filter((i) => i.primary_area === a).length,
                  tone: area === a ? "rojo" : "",
                }))}
              />
            </Card>
            <Card title={tr("Por plataforma", "By platform")}>
              <Bars items={Object.entries(platforms).map(([k, v]) => ({ key: k, label: k, value: v }))} />
            </Card>
          </div>
          <SectionTitle sub={tr("Varias investigaciones comparten el mismo equipo a bordo, lo que hace comparables sus condiciones y mediciones.", "Several investigations share the same on-board equipment, which makes their conditions and measurements comparable.")}>
            {tr("Familias de hardware", "Hardware families")}
          </SectionTitle>
          <HardwareFamilies investigations={data} />
          {selected && (
            <div className="mt-8">
              <InvestigationDetail key={selected} accession={selected} onClose={() => setSelected(null)} />
            </div>
          )}
          <Card title={`${tr("Cronograma", "Timeline")} (${list.length})`} className="mt-8">
            <div className="mb-2 ml-[6.5rem] mr-0 flex justify-between text-xs text-gris-oscuro sm:ml-[11rem] sm:mr-[5.5rem]">
              <span>{y0}</span>
              <span>{Math.round((y0 + y1) / 2)}</span>
              <span>{y1}</span>
            </div>
            <div className="space-y-1.5">
              {list.map((i) => {
                const start = year(i.start_date) || y0;
                const end = year(i.end_date) || start;
                return (
                  <button
                    key={i.accession}
                    onClick={() => {
                      setSelected(i.accession);
                      window.history.replaceState(null, "", href("investigaciones", { acc: i.accession }));
                    }}
                    className={`grid w-full grid-cols-[6rem_1fr] items-center gap-2 sm:grid-cols-[10.5rem_1fr_5rem] rounded px-1 py-1 text-left text-sm transition hover:bg-claro ${selected === i.accession ? "bg-claro" : ""}`}
                  >
                    <span className="truncate">
                      <b>{i.acronym || i.accession}</b>
                    </span>
                    <span className="relative h-3 rounded-full bg-claro">
                      <i className={`absolute inset-y-0 rounded-full ${i.project_type?.includes("Ground") ? "bg-gris" : "bg-azul"}`} style={{ left: `${pos(start)}%`, width: `${Math.max(1.5, pos(end) - pos(start))}%` }} />
                    </span>
                    <span className="hidden text-right text-xs text-gris-oscuro sm:block">
                      {i.findings} {tr("hallazgos", "findings")}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gris-oscuro">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-4 rounded bg-azul" /> {tr("Vuelo", "Flight")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-4 rounded bg-gris" /> {tr("Investigación en tierra", "Ground research")}
              </span>
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}

export function Pruebas() {
  const { scenarioId, scenario } = useApp();
  const [fuelClass, setFuelClass] = useState("");
  const [onlyScenario, setOnlyScenario] = useState(false);
  const [shown, setShown] = useState(40);
  const { data, error, loading } = useApi("/api/tests", { scenario: scenarioId, fuel_class: fuelClass || undefined, only_in_scenario: onlyScenario });
  const tests = data?.tests || [];
  const outcomes = {};
  const byInvestigation = {};
  tests.forEach((t) => {
    if (t.outcome) outcomes[t.outcome] = (outcomes[t.outcome] || 0) + 1;
    byInvestigation[t.accession] = (byInvestigation[t.accession] || 0) + 1;
  });
  const burn = tests.filter((t) => t.burn_time_s > 0);
  return (
    <Page route="pruebas" tabs>
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr(
          "Cada prueba experimental de las tablas de PSI, con sus condiciones normalizadas: oxígeno, presión, flujo, diluyente y resultado.",
          "Every experimental test in the PSI tables, with its normalized conditions: oxygen, pressure, flow, diluent and outcome.",
        )}
      </p>
      <MissionBar showArea={false} />
      <ChipRow label={tr("Filtrar por tipo de combustible", "Filter by fuel type")}>
        <Chip active={!fuelClass} onClick={() => setFuelClass("")}>
          {tr("Todos", "All")}
        </Chip>
        {Object.keys(FUEL_CLASS_LABEL).map((fc) => (
          <Chip key={fc} active={fuelClass === fc} onClick={() => setFuelClass(fc)}>
            {label(FUEL_CLASS_LABEL, fc)}
          </Chip>
        ))}
        <Chip active={onlyScenario} onClick={() => setOnlyScenario(!onlyScenario)} tone="azul">
          {tr("Solo dentro de", "Only within")} {scenario?.name || tr("el escenario", "the scenario")}
        </Chip>
      </ChipRow>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <DownloadCsv path="/api/export/tests.csv" params={{ scenario: scenarioId, fuel_class: fuelClass || undefined, only_in_scenario: onlyScenario }}>
          {tr("Descargar CSV para modelado", "Download CSV for modeling")}
        </DownloadCsv>
        <small className="text-gris-oscuro">{tr("Con los filtros actuales, unidades normalizadas y una columna que indica si la prueba cae dentro del escenario.", "With the current filters, normalized units and a column marking whether each test falls within the scenario.")}</small>
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={tests.length} label={tr("Pruebas", "Tests")} />
            <Kpi value={tests.filter((t) => t.in_scenario).length} label={tr("Dentro del escenario", "Within the scenario")} tone="azul" />
            <Kpi value={Object.values(outcomes).reduce((a, b) => a + b, 0)} label={tr("Con resultado registrado", "With a recorded outcome")} />
            <Kpi
              value={burn.length ? burn.reduce((s, t) => s + t.burn_time_s, 0) / burn.length : null}
              digits={1}
              suffix=" s"
              label={tr("Combustión media", "Mean burn time")}
              note={tr(`${burn.length} pruebas con tiempo`, `${burn.length} tests with a time`)}
            />
          </KpiRow>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={tr("Resultado", "Outcome")}>
              {Object.keys(outcomes).length ? (
                <Bars items={Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: label(OUTCOME_LABEL, k), value: v, tone: k === "disrupted" ? "rojo" : "" }))} />
              ) : (
                <p className="text-sm text-gris-oscuro">{tr("Estas pruebas no registran el resultado.", "These tests do not record the outcome.")}</p>
              )}
            </Card>
            <Card title={tr("Por investigación", "By investigation")}>
              <Bars items={Object.entries(byInvestigation).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ key: k, label: k, value: v }))} />
            </Card>
          </div>
          <Card title={tr("Detalle de pruebas", "Test details")} className="mt-8">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-gris-oscuro uppercase">
                  <tr>
                    {[
                      ["Prueba", "Test"],
                      ["Investigación", "Investigation"],
                      ["Combustible", "Fuel"],
                      ["O₂", "O₂"],
                      ["Presión", "Pressure"],
                      ["Flujo", "Flow"],
                      ["Diluyente", "Diluent"],
                      ["Resultado", "Outcome"],
                      ["Tiempo", "Time"],
                    ].map((h) => (
                      <th key={h[0]} className="p-2 font-medium">
                        {pick(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.slice(0, shown).map((t) => (
                    <tr key={t.id} className={`border-t border-linea ${t.in_scenario ? "bg-azul/5" : ""}`}>
                      <td className="p-2 font-medium">{t.test_code || "—"}</td>
                      <td className="p-2">{t.accession}</td>
                      <td className="max-w-48 truncate p-2" title={t.fuel}>
                        {t.fuel}
                      </td>
                      <td className="p-2 tabular-nums">{t.o2_min != null ? `${num(t.o2_min * 100, 1)}${t.o2_max !== t.o2_min ? `–${num(t.o2_max * 100, 1)}` : ""} %` : "—"}</td>
                      <td className="p-2 tabular-nums">{t.pressure_kpa != null ? `${num(t.pressure_kpa, 0)} kPa` : "—"}</td>
                      <td className="p-2 tabular-nums">{t.flow_min_cm_s != null ? `${num(t.flow_min_cm_s, 1)} cm/s` : "—"}</td>
                      <td className="p-2">{t.diluent || "—"}</td>
                      <td className="p-2">{t.outcome ? <Tag tone={t.outcome === "disrupted" ? "rojo" : "azul"}>{label(OUTCOME_LABEL, t.outcome)}</Tag> : "—"}</td>
                      <td className="p-2 tabular-nums">{t.burn_time_s != null ? `${num(t.burn_time_s, 1)} s` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shown < tests.length && (
              <button onClick={() => setShown(shown + 80)} className="mt-4 rounded-full border border-linea px-5 py-2 text-sm hover:border-noche">
                {tr("Mostrar más", "Show more")} ({tests.length - shown} {tr("restantes", "left")})
              </button>
            )}
          </Card>
          <Note>{tr("Filas resaltadas: pruebas cuyas condiciones de oxígeno y presión coinciden con el escenario elegido.", "Highlighted rows: tests whose oxygen and pressure conditions match the chosen scenario.")}</Note>
        </>
      )}
    </Page>
  );
}

const METRICS = {
  o2: { title: ["Concentración de O₂", "O₂ concentration"], unit: "%", min: "o2_min", max: "o2_max", scale: 100, domain: 90, scenario: (s) => s.o2_fraction * 100 },
  pressure: { title: ["Presión", "Pressure"], unit: "kPa", min: "pressure_min", max: "pressure_max", scale: 1, domain: 320, scenario: (s) => s.pressure_kpa },
  flow: { title: ["Velocidad de flujo", "Flow velocity"], unit: "cm/s", min: "flow_min", max: "flow_max", scale: 1, domain: 40, scenario: () => null },
};

export function Ambiente() {
  const { scenario } = useApp();
  const [metric, setMetric] = useState("o2");
  const { data, error, loading } = useApi("/api/investigations");
  const m = METRICS[metric];
  const rows = (data || []).filter((i) => i[m.min] != null);
  const line = scenario ? m.scenario(scenario) : null;
  return (
    <Page route="ambiente" tabs>
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr(
          "Rango de condiciones en el que se probó cada investigación. La línea negra marca el escenario elegido: si no la cruza ninguna barra, esas condiciones no se han probado.",
          "Range of conditions each investigation was tested in. The black line marks the chosen scenario: if no bar crosses it, those conditions have not been tested.",
        )}
      </p>
      <MissionBar showArea={false} />
      <ChipRow label={tr("Métrica ambiental", "Environmental metric")}>
        {Object.entries(METRICS).map(([k, v]) => (
          <Chip key={k} active={metric === k} onClick={() => setMetric(k)}>
            {pick(v.title)}
          </Chip>
        ))}
      </ChipRow>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <Card title={`${pick(m.title)} (${m.unit})`}>
          <div className="relative space-y-2">
            {rows.map((i) => {
              const lo = i[m.min] * m.scale;
              const hi = i[m.max] * m.scale;
              const covers = line != null && lo <= line && line <= hi;
              return (
                <div key={i.accession} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2 text-sm sm:grid-cols-[9rem_1fr_7rem] sm:gap-3">
                  <span className="truncate">
                    <b>{i.acronym || i.accession}</b>
                  </span>
                  <span className="relative h-3 rounded-full bg-claro">
                    <i className={`absolute inset-y-0 rounded-full ${covers ? "bg-rojo" : "bg-azul"}`} style={{ left: `${(lo / m.domain) * 100}%`, width: `${Math.max(1, ((hi - lo) / m.domain) * 100)}%` }} />
                    {line != null && <i className="absolute -inset-y-1 w-0.5 bg-noche" style={{ left: `${(line / m.domain) * 100}%` }} />}
                  </span>
                  <span className="text-right text-xs tabular-nums text-gris-oscuro sm:text-sm">
                    {num(lo, 1)}–{num(hi, 1)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 ml-[6rem] mr-[5rem] flex justify-between text-xs text-gris-oscuro sm:ml-[9.75rem] sm:mr-[7.75rem]">
            <span>0</span>
            <span>{m.domain / 2}</span>
            <span>
              {m.domain} {m.unit}
            </span>
          </div>
          <Note>
            {line != null
              ? tr(
                  `Línea negra: ${scenario.name} (${num(line, 1)} ${m.unit}). En rojo, las investigaciones cuyo rango la incluye.`,
                  `Black line: ${scenario.name} (${num(line, 1)} ${m.unit}). In red, the investigations whose range includes it.`,
                )
              : tr("Los escenarios de misión no fijan un flujo de aire.", "Mission scenarios do not set an airflow.")}{" "}
            {tr("Se muestran solo las investigaciones con este dato en sus tablas.", "Only investigations with this value in their tables are shown.")}
          </Note>
        </Card>
      )}
    </Page>
  );
}

export function Mediciones() {
  const [quantity, setQuantity] = useState("extinction_diameter");
  const { data: list } = useApi("/api/measurements");
  const { data, error, loading } = useApi("/api/measurements", { quantity });
  const top = data?.values.slice(0, 25) || [];
  return (
    <Page route="mediciones" tabs>
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr("Valores medidos en cada prueba, agrupados por magnitud. Datos de las tablas experimentales de PSI.", "Values measured in each test, grouped by quantity. Data from the PSI experiment tables.")}
      </p>
      <ChipRow label={tr("Magnitud", "Quantity")}>
        {(list?.quantities || []).slice(0, 14).map((q) => (
          <Chip key={q.quantity} active={quantity === q.quantity} onClick={() => setQuantity(q.quantity)}>
            {label(QUANTITY_LABEL, q.quantity)} <span className="opacity-70">({q.count})</span>
          </Chip>
        ))}
      </ChipRow>
      <div className="mb-6 flex flex-wrap gap-3">
        <DownloadCsv path="/api/export/measurements.csv" params={{ quantity }}>
          {tr("CSV de esta magnitud", "CSV for this quantity")}
        </DownloadCsv>
        <DownloadCsv path="/api/export/measurements.csv">{tr("CSV de todas las mediciones", "CSV of all measurements")}</DownloadCsv>
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={data.stats.min} digits={2} suffix={` ${data.stats.unit || ""}`} label={tr("Mínimo", "Minimum")} />
            <Kpi value={data.stats.mean} digits={2} suffix={` ${data.stats.unit || ""}`} label={tr("Media", "Mean")} tone="azul" />
            <Kpi value={data.stats.max} digits={2} suffix={` ${data.stats.unit || ""}`} label={tr("Máximo", "Maximum")} />
            <Kpi value={data.stats.count} label={tr("Mediciones", "Measurements")} />
          </KpiRow>
          <Card title={`${label(QUANTITY_LABEL, quantity)} · ${tr("25 valores más altos", "25 highest values")}`}>
            <Bars items={top.map((v) => ({ key: v.test_id, label: `${v.accession} · ${v.test_code || v.fuel}`, value: v.value, text: `${num(v.value)} ${v.unit || ""}` }))} />
          </Card>
        </>
      )}
    </Page>
  );
}

export function Publicaciones() {
  const { data, error, loading } = useApi("/api/library");
  const [selected, setSelected] = useState(null);
  const detail = useApi(selected ? `/api/investigations/${selected}` : null);
  const pubs = useMemo(() => (detail.data?.publications || []).slice().sort((a, b) => (b.doi_url ? 1 : 0) - (a.doi_url ? 1 : 0)), [detail.data]);
  return (
    <Page route="publicaciones" tabs>
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr("El respaldo documental de la base: artículos publicados con su DOI y los documentos procesados página por página.", "The documentary backing of the database: published papers with their DOI and the documents processed page by page.")}
      </p>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={data.totals.publications} label={tr("Publicaciones", "Publications")} />
            <Kpi value={data.totals.with_doi} label={tr("Con DOI", "With DOI")} tone="azul" />
            <Kpi value={data.totals.documents} label={tr("Documentos procesados", "Processed documents")} />
            <Kpi value={data.totals.pages} label={tr("Páginas indexadas", "Indexed pages")} />
          </KpiRow>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={tr("Publicaciones por investigación", "Publications by investigation")}>
              <Bars
                items={data.publications_by_investigation.filter((p) => p.publications).map((p) => ({ key: p.accession, label: p.acronym || p.accession, value: p.publications }))}
                onSelect={setSelected}
                selected={selected}
              />
              <Note>{tr("Pulsa una investigación para ver sus artículos.", "Tap an investigation to see its papers.")}</Note>
            </Card>
            <Card title={tr("Documentos por tipo", "Documents by type")}>
              <Bars items={data.documents_by_type.map((d) => ({ key: d.doc_type, label: label(DOC_TYPE_LABEL, d.doc_type), value: d.documents, text: `${num(d.documents)} · ${num(d.pages)} p.` }))} />
            </Card>
          </div>
          {selected && (
            <Card title={`${tr("Publicaciones", "Publications")} · ${detail.data?.acronym || selected}`} className="mt-8">
              {detail.loading && <Loading />}
              <ul className="divide-y divide-linea">
                {pubs.map((p) => (
                  <li key={p.title} className="py-3 text-sm">
                    <p className="font-medium break-words">{p.title}</p>
                    <p className="text-xs text-gris-oscuro">{p.authors}</p>
                    {p.doi_url && (
                      <a href={p.doi_url} target="_blank" rel="noreferrer" className="text-xs font-medium break-all text-azul hover:underline">
                        {p.doi} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <SectionTitle>{tr("Busca dentro de los documentos", "Search inside the documents")}</SectionTitle>
          <AskButton question="">{tr(`Buscar en las ${num(data.totals.pages)} páginas`, `Search the ${num(data.totals.pages)} pages`)}</AskButton>
        </>
      )}
    </Page>
  );
}
