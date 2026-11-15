import { useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { AREA_LABEL, AREAS, FUEL_CLASS_LABEL, GRAVITY_LABEL, label } from "../lib/format";
import { AGENTES, CONTEXTO_EXTINTORES } from "../content/narrative";
import { MEDIA } from "../content/media";
import { AskButton, CrossLink, MissionBar, Page } from "../components/Layout";
import { FindingCard } from "../components/FindingCard";
import { Bars, Card, ErrorBox, Figure, Kpi, KpiRow, Loading, Note, Reveal, SectionTitle } from "../components/ui";

const FUEL_CLASSES = ["solid", "droplet", "gas", "aerosol"];
const AGENT_QUERY = { He: "helium", CO2: "CO2", N2: "nitrogen", Xe: "xenon", Ar: "argon" };

export function Riesgos() {
  const { scenarioId, scenarios, area } = useApp();
  const { data, error, loading } = useApi("/api/gaps");
  const gravity = {};
  data?.gravity_coverage.forEach((g) => {
    gravity[g.gravity || "unspecified"] = (gravity[g.gravity || "unspecified"] || 0) + g.findings;
  });
  const areas = area ? [area] : AREAS;
  return (
    <Page route="riesgos">
      <p className="max-w-3xl text-xl text-gris-oscuro">
        Dónde hay evidencia experimental para el escenario de misión elegido y dónde no. Un hueco aquí es una prioridad: un riesgo que hoy no está respaldado por pruebas.
      </p>
      <MissionBar />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <SectionTitle sub="Pruebas de la NASA cuyas condiciones de oxígeno y presión coinciden con cada escenario. Las celdas en rojo no tienen ninguna.">Cobertura por escenario</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-linea">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-claro text-left">
                  <th className="p-3 font-medium">Tipo de combustible</th>
                  {scenarios.map((s) => (
                    <th key={s.id} className={`p-3 font-medium ${s.id === scenarioId ? "bg-azul text-white" : ""}`}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FUEL_CLASSES.map((fc) => (
                  <tr key={fc} className="border-t border-linea">
                    <td className="p-3">{label(FUEL_CLASS_LABEL, fc)}</td>
                    {scenarios.map((s) => {
                      const cell = data.scenario_coverage.find((c) => c.scenario === s.id && c.fuel_class === fc);
                      const empty = cell?.tests_in_scenario === 0;
                      return (
                        <td key={s.id} className={`p-3 tabular-nums ${empty ? "bg-rojo/10 font-semibold text-rojo" : ""} ${s.id === scenarioId ? "ring-2 ring-azul ring-inset" : ""}`}>
                          {cell?.tests_in_scenario ?? "—"} <span className="font-normal text-gris-oscuro">/ {cell?.tests ?? "—"}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Card title="Evidencia por área">
              <Bars
                items={data.areas.map((a) => ({
                  key: a.area,
                  label: label(AREA_LABEL, a.area),
                  value: a.findings,
                  text: `${a.findings} · ${a.gaps} huecos`,
                }))}
              />
              <Note>Hallazgos verificados por área y cuántos de ellos son huecos de conocimiento señalados por los propios autores.</Note>
            </Card>
            <Card title="Evidencia por gravedad">
              <Bars
                items={Object.entries(gravity)
                  .sort((a, b) => b[1] - a[1])
                  .map(([g, n]) => ({ key: g, label: label(GRAVITY_LABEL, g), value: n, tone: g === "partial_gravity" ? "rojo" : "" }))}
              />
              <Note>Casi toda la evidencia es de microgravedad. La gravedad parcial de la Luna (0,165 g) y Marte (0,38 g) apenas está estudiada.</Note>
            </Card>
          </div>

          <SectionTitle sub="Limitaciones y preguntas abiertas que los investigadores dejaron escritas, con su cita literal.">Huecos señalados por los autores</SectionTitle>
          {areas.map((a) => (
            <div key={a} className="mb-8">
              <h3 className="mb-3 text-xl">{label(AREA_LABEL, a)}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {data.top_gaps[a].map((f, i) => (
                  <Reveal key={f.id} delay={i * 50}>
                    <FindingCard finding={f} compact />
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      <CrossLink text="¿Qué sí sabemos para este escenario?" to="recomendacion" button="Qué dice la evidencia" />
    </Page>
  );
}

function AreaEvidence({ area }) {
  const { scenarioId } = useApp();
  const { data, error, loading } = useApi("/api/findings", { scenario: scenarioId, area, limit: 4 });
  return (
    <div className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 className="text-2xl">{label(AREA_LABEL, area)}</h3>
        {data && <small className="text-gris-oscuro">{data.total} hallazgos verificados</small>}
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      <div className="grid gap-4 md:grid-cols-2">
        {data?.findings.map((f) => (
          <FindingCard key={f.id} finding={f} showScore />
        ))}
      </div>
    </div>
  );
}

export function Recomendacion() {
  const { area, scenario } = useApp();
  const areas = area ? [area] : ["prevention", "detection", "suppression"];
  return (
    <Page route="recomendacion">
      <p className="max-w-3xl text-xl text-gris-oscuro">
        Los hallazgos más relevantes para el escenario elegido, ordenados por una puntuación que puedes desplegar: confianza de la cita, tipo de fuente, cercanía del oxígeno y coincidencia de gravedad.
      </p>
      <MissionBar />
      <div className="mb-8">
        <AskButton question={`¿Qué recomendaciones de seguridad contra incendios da la evidencia para ${scenario?.name || "este escenario"}?`}>
          Pedir un resumen al asistente
        </AskButton>
      </div>
      {areas.map((a) => (
        <AreaEvidence key={a} area={a} />
      ))}
      <CrossLink text="¿Qué agentes apagan mejor un fuego en microgravedad?" to="prototipos" button="Extintores y agentes" />
    </Page>
  );
}

function AgentFindings({ agent }) {
  const { scenarioId } = useApp();
  const { data, error, loading } = useApi("/api/findings", { area: "suppression", q: AGENT_QUERY[agent], scenario: scenarioId, limit: 6 });
  return (
    <div className="mt-6">
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <p className="mb-3 text-sm text-gris-oscuro">
            {data.total} hallazgos de supresión mencionan {AGENTES[agent].nombre.toLowerCase()}. Los {data.findings.length} más relevantes:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {data.findings.map((f) => (
              <FindingCard key={f.id} finding={f} showScore />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Prototipos() {
  const { data, error, loading } = useApi("/api/suppressants");
  const [agent, setAgent] = useState("He");
  const current = data?.find((a) => a.agent === agent);
  return (
    <Page route="prototipos">
      <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
        <p className="text-xl text-gris-oscuro">
          Los extintores de una nave no pueden ser tóxicos ni dejar residuos. Estos son los agentes probados en los experimentos de la NASA, con los resultados reales de cada prueba y lo que concluyeron sus autores.
        </p>
        <Figure media={MEDIA.extincion} />
      </div>
      <SectionTitle sub="Pruebas de combustión en atmósferas diluidas con cada gas. Selecciona un agente para ver su evidencia.">Agentes probados</SectionTitle>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <div className="grid gap-3 md:grid-cols-5">
          {data.map((a) => (
            <button
              key={a.agent}
              onClick={() => setAgent(a.agent)}
              className={`rounded-xl border p-4 text-left transition ${a.agent === agent ? "border-azul bg-azul text-white" : "border-linea hover:border-noche"}`}
            >
              <b className="block font-serif text-xl">{AGENTES[a.agent].nombre}</b>
              <small className={a.agent === agent ? "text-white/80" : "text-gris-oscuro"}>
                {a.tests} pruebas · {a.findings} hallazgos
              </small>
            </button>
          ))}
        </div>
      )}
      {current && (
        <div className="mt-8">
          <p className="max-w-3xl">{AGENTES[agent].resumen}</p>
          <KpiRow>
            <Kpi value={current.tests} label="Pruebas con este diluyente" note={current.investigations.join(" · ") || "sin pruebas tabuladas"} />
            <Kpi value={current.tests ? (current.extinguished / current.tests) * 100 : null} suffix=" %" label="Terminaron en extinción" tone="azul" />
            <Kpi value={current.mean_extinction_diameter_mm} digits={2} suffix=" mm" label="Diámetro medio de extinción" note="gotas de combustible" />
            <Kpi value={current.mean_burn_time_s} digits={1} suffix=" s" label="Tiempo medio de combustión" />
          </KpiRow>
          {current.tests === 0 && <Note>No hay pruebas tabuladas con este gas; su evidencia viene de simulaciones y artículos.</Note>}
          <AgentFindings agent={agent} />
        </div>
      )}
      <SectionTitle sub="Sistemas usados a bordo a lo largo de la historia.">Contexto operativo</SectionTitle>
      <div className="grid gap-4 md:grid-cols-4">
        {CONTEXTO_EXTINTORES.map((x, i) => (
          <Reveal key={x.n} delay={i * 60}>
            <Card title={x.n}>
              <p className="text-sm text-gris-oscuro">{x.r}</p>
            </Card>
          </Reveal>
        ))}
      </div>
      <Note>
        Pruebas: tabla de pruebas normalizada de PSI (diluyente, resultado y diámetro de extinción). Medias calculadas sobre las pruebas con dato.
      </Note>
      <CrossLink text="Estos protocolos nacen de incendios reales." to="historia" button="Ir a Historia" />
    </Page>
  );
}
