import { useMemo, useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { href } from "../lib/route";
import { AREA_LABEL, DOC_TYPE_LABEL, FUEL_CLASS_LABEL, OUTCOME_LABEL, QUANTITY_LABEL, label, num, year } from "../lib/format";
import { MEDIA } from "../content/media";
import { AskButton, MissionBar, Page } from "../components/Layout";
import { Bars, Card, Chip, ChipRow, ErrorBox, Figure, Kpi, KpiRow, Loading, Note, SectionTitle, Tag } from "../components/ui";

function InvestigationDetail({ accession, onClose }) {
  const { data, error, loading } = useApi(`/api/investigations/${accession}`);
  return (
    <div className="rounded-xl border-2 border-azul bg-white p-6 animate-aparecer">
      <div className="flex items-start justify-between gap-4">
        <div>
          <small className="text-xs uppercase tracking-wide text-gris-oscuro">{accession}</small>
          <h3 className="text-2xl">{data ? `${data.acronym ? `${data.acronym} · ` : ""}${data.title}` : "Cargando…"}</h3>
        </div>
        <button onClick={onClose} className="text-3xl leading-none text-gris-oscuro" aria-label="Cerrar detalle">
          ×
        </button>
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <div className="mt-4 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-4 text-sm leading-relaxed">
            {data.objective && (
              <p>
                <b>Objetivo. </b>
                {data.objective}
              </p>
            )}
            {data.hypothesis && (
              <p>
                <b>Hipótesis. </b>
                {data.hypothesis}
              </p>
            )}
            <a href={data.psi_url} target="_blank" rel="noreferrer" className="inline-block rounded-full bg-azul px-4 py-1.5 text-white hover:bg-azul-claro">
              Ver en NASA PSI ↗
            </a>
          </div>
          <div>
            <KpiRow>
              <Kpi value={data.tests} label="Pruebas" />
              <Kpi value={Object.values(data.findings_by_area).reduce((a, b) => a + b, 0)} label="Hallazgos" tone="rojo" />
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
    const p = (i.platform || "Tierra").replace("International Space Station (ISS)", "ISS").replace("Not Applicable", "Tierra");
    platforms[p] = (platforms[p] || 0) + 1;
  });
  const years = list.flatMap((i) => [year(i.start_date), year(i.end_date)]).filter(Boolean);
  const y0 = Math.min(...years, 2000);
  const y1 = Math.max(...years, 2026);
  const pos = (y) => ((y - y0) / (y1 - y0)) * 100;
  return (
    <Page route="investigaciones" tabs>
      <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <p className="text-xl text-gris-oscuro">
          Las 24 investigaciones de Combustion Science del repositorio Physical Sciences Informatics de la NASA: qué estudiaron, cuándo y cuánta evidencia aportan.
        </p>
        <Figure media={MEDIA.astronauta} />
      </div>
      <MissionBar />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={data.length} label="Investigaciones" note="NASA PSI · Combustion Science" />
            <Kpi value={data.filter((i) => i.project_type?.includes("Microgravity")).length} label="En vuelo" note="ISS y naves Cygnus" />
            <Kpi value={data.reduce((s, i) => s + i.tests, 0)} label="Pruebas registradas" />
            <Kpi value={data.reduce((s, i) => s + i.findings, 0)} label="Hallazgos verificados" tone="rojo" />
          </KpiRow>
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Por área principal">
              <Bars
                items={["prevention", "detection", "suppression", "fundamental"].map((a) => ({
                  key: a,
                  label: label(AREA_LABEL, a),
                  value: data.filter((i) => i.primary_area === a).length,
                  tone: area === a ? "rojo" : "",
                }))}
              />
            </Card>
            <Card title="Por plataforma">
              <Bars items={Object.entries(platforms).map(([k, v]) => ({ key: k, label: k, value: v }))} />
            </Card>
          </div>
          {selected && (
            <div className="mt-8">
              <InvestigationDetail key={selected} accession={selected} onClose={() => setSelected(null)} />
            </div>
          )}
          <Card title={`Cronograma (${list.length})`} className="mt-8">
            <div className="mb-2 ml-[11rem] flex justify-between text-xs text-gris-oscuro">
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
                    className={`grid w-full grid-cols-[10.5rem_1fr_5rem] items-center gap-2 rounded px-1 py-1 text-left text-sm transition hover:bg-claro ${selected === i.accession ? "bg-claro" : ""}`}
                  >
                    <span className="truncate">
                      <b>{i.acronym || i.accession}</b>
                    </span>
                    <span className="relative h-3 rounded-full bg-claro">
                      <i className={`absolute inset-y-0 rounded-full ${i.project_type?.includes("Ground") ? "bg-gris" : "bg-azul"}`} style={{ left: `${pos(start)}%`, width: `${Math.max(1.5, pos(end) - pos(start))}%` }} />
                    </span>
                    <span className="text-right text-xs text-gris-oscuro">{i.findings} hallazgos</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex gap-4 text-xs text-gris-oscuro">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-4 rounded bg-azul" /> Vuelo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-2 w-4 rounded bg-gris" /> Investigación en tierra
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
      <p className="max-w-3xl text-xl text-gris-oscuro">
        Cada prueba experimental de las tablas de PSI, con sus condiciones normalizadas: oxígeno, presión, flujo, diluyente y resultado.
      </p>
      <MissionBar showArea={false} />
      <ChipRow label="Filtrar por tipo de combustible">
        <Chip active={!fuelClass} onClick={() => setFuelClass("")}>
          Todos
        </Chip>
        {Object.keys(FUEL_CLASS_LABEL).map((fc) => (
          <Chip key={fc} active={fuelClass === fc} onClick={() => setFuelClass(fc)}>
            {label(FUEL_CLASS_LABEL, fc)}
          </Chip>
        ))}
        <Chip active={onlyScenario} onClick={() => setOnlyScenario(!onlyScenario)} tone="azul">
          Solo dentro de {scenario?.name || "el escenario"}
        </Chip>
      </ChipRow>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={tests.length} label="Pruebas" />
            <Kpi value={tests.filter((t) => t.in_scenario).length} label="Dentro del escenario" tone="azul" />
            <Kpi value={Object.values(outcomes).reduce((a, b) => a + b, 0)} label="Con resultado registrado" />
            <Kpi value={burn.length ? burn.reduce((s, t) => s + t.burn_time_s, 0) / burn.length : null} digits={1} suffix=" s" label="Combustión media" note={`${burn.length} pruebas con tiempo`} />
          </KpiRow>
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Resultado">
              {Object.keys(outcomes).length ? (
                <Bars items={Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: label(OUTCOME_LABEL, k), value: v, tone: k === "disrupted" ? "rojo" : "" }))} />
              ) : (
                <p className="text-sm text-gris-oscuro">Estas pruebas no registran el resultado.</p>
              )}
            </Card>
            <Card title="Por investigación">
              <Bars items={Object.entries(byInvestigation).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ key: k, label: k, value: v }))} />
            </Card>
          </div>
          <Card title="Detalle de pruebas" className="mt-8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs text-gris-oscuro uppercase">
                  <tr>
                    {["Prueba", "Investigación", "Combustible", "O₂", "Presión", "Flujo", "Diluyente", "Resultado", "Tiempo"].map((h) => (
                      <th key={h} className="p-2 font-medium">
                        {h}
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
                Mostrar más ({tests.length - shown} restantes)
              </button>
            )}
          </Card>
          <Note>Filas resaltadas: pruebas cuyas condiciones de oxígeno y presión coinciden con el escenario elegido.</Note>
        </>
      )}
    </Page>
  );
}

const METRICS = {
  o2: { title: "Concentración de O₂", unit: "%", min: "o2_min", max: "o2_max", scale: 100, domain: 90, scenario: (s) => s.o2_fraction * 100 },
  pressure: { title: "Presión", unit: "kPa", min: "pressure_min", max: "pressure_max", scale: 1, domain: 320, scenario: (s) => s.pressure_kpa },
  flow: { title: "Velocidad de flujo", unit: "cm/s", min: "flow_min", max: "flow_max", scale: 1, domain: 40, scenario: () => null },
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
      <p className="max-w-3xl text-xl text-gris-oscuro">
        Rango de condiciones en el que se probó cada investigación. La línea azul marca el escenario elegido: si no la cruza ninguna barra, esas condiciones no se han probado.
      </p>
      <MissionBar showArea={false} />
      <ChipRow label="Métrica ambiental">
        {Object.entries(METRICS).map(([k, v]) => (
          <Chip key={k} active={metric === k} onClick={() => setMetric(k)}>
            {v.title}
          </Chip>
        ))}
      </ChipRow>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <Card title={`${m.title} (${m.unit})`}>
          <div className="relative space-y-2">
            {rows.map((i) => {
              const lo = i[m.min] * m.scale;
              const hi = i[m.max] * m.scale;
              const covers = line != null && lo <= line && line <= hi;
              return (
                <div key={i.accession} className="grid grid-cols-[9rem_1fr_7rem] items-center gap-3 text-sm">
                  <span className="truncate">
                    <b>{i.acronym || i.accession}</b>
                  </span>
                  <span className="relative h-3 rounded-full bg-claro">
                    <i className={`absolute inset-y-0 rounded-full ${covers ? "bg-rojo" : "bg-azul"}`} style={{ left: `${(lo / m.domain) * 100}%`, width: `${Math.max(1, ((hi - lo) / m.domain) * 100)}%` }} />
                    {line != null && <i className="absolute -inset-y-1 w-0.5 bg-noche" style={{ left: `${(line / m.domain) * 100}%` }} />}
                  </span>
                  <span className="text-right tabular-nums text-gris-oscuro">
                    {num(lo, 1)}–{num(hi, 1)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 ml-[9.75rem] mr-[7.75rem] flex justify-between text-xs text-gris-oscuro">
            <span>0</span>
            <span>{m.domain / 2}</span>
            <span>
              {m.domain} {m.unit}
            </span>
          </div>
          <Note>
            {line != null
              ? `Línea negra: ${scenario.name} (${num(line, 1)} ${m.unit}). En rojo, las investigaciones cuyo rango la incluye.`
              : "Los escenarios de misión no fijan un flujo de aire."}{" "}
            Se muestran solo las investigaciones con este dato en sus tablas.
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
      <p className="max-w-3xl text-xl text-gris-oscuro">Valores medidos en cada prueba, agrupados por magnitud. Datos de las tablas experimentales de PSI.</p>
      <ChipRow label="Magnitud">
        {(list?.quantities || []).slice(0, 14).map((q) => (
          <Chip key={q.quantity} active={quantity === q.quantity} onClick={() => setQuantity(q.quantity)}>
            {label(QUANTITY_LABEL, q.quantity)} <span className="opacity-70">({q.count})</span>
          </Chip>
        ))}
      </ChipRow>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={data.stats.min} digits={2} suffix={` ${data.stats.unit || ""}`} label="Mínimo" />
            <Kpi value={data.stats.mean} digits={2} suffix={` ${data.stats.unit || ""}`} label="Media" tone="azul" />
            <Kpi value={data.stats.max} digits={2} suffix={` ${data.stats.unit || ""}`} label="Máximo" />
            <Kpi value={data.stats.count} label="Mediciones" />
          </KpiRow>
          <Card title={`${label(QUANTITY_LABEL, quantity)} · 25 valores más altos`}>
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
      <p className="max-w-3xl text-xl text-gris-oscuro">El respaldo documental de la base: artículos publicados con su DOI y los documentos procesados página por página.</p>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <KpiRow>
            <Kpi value={data.totals.publications} label="Publicaciones" />
            <Kpi value={data.totals.with_doi} label="Con DOI" tone="azul" />
            <Kpi value={data.totals.documents} label="Documentos procesados" />
            <Kpi value={data.totals.pages} label="Páginas indexadas" />
          </KpiRow>
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Publicaciones por investigación">
              <Bars
                items={data.publications_by_investigation.filter((p) => p.publications).map((p) => ({ key: p.accession, label: p.acronym || p.accession, value: p.publications }))}
                onSelect={setSelected}
                selected={selected}
              />
              <Note>Pulsa una investigación para ver sus artículos.</Note>
            </Card>
            <Card title="Documentos por tipo">
              <Bars items={data.documents_by_type.map((d) => ({ key: d.doc_type, label: label(DOC_TYPE_LABEL, d.doc_type), value: d.documents, text: `${num(d.documents)} · ${num(d.pages)} p.` }))} />
            </Card>
          </div>
          {selected && (
            <Card title={`Publicaciones · ${detail.data?.acronym || selected}`} className="mt-8">
              {detail.loading && <Loading />}
              <ul className="divide-y divide-linea">
                {pubs.map((p) => (
                  <li key={p.title} className="py-3 text-sm">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-gris-oscuro">{p.authors}</p>
                    {p.doi_url && (
                      <a href={p.doi_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-azul hover:underline">
                        {p.doi} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <SectionTitle>Busca dentro de los documentos</SectionTitle>
          <AskButton question="">Buscar en las 10 829 páginas</AskButton>
        </>
      )}
    </Page>
  );
}
