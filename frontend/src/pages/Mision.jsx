import { useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { AREA_LABEL, AREAS, FUEL_CLASS_LABEL, GRAVITY_LABEL, label } from "../lib/format";
import { AGENTES, CONTEXTO_EXTINTORES } from "../content/narrative";
import { MEDIA } from "../content/media";
import { pick, tr } from "../lib/i18n";
import { AskButton, CrossLink, MissionBar, Page } from "../components/Layout";
import { FindingCard } from "../components/FindingCard";
import { Bars, Card, ErrorBox, Figure, Kpi, KpiRow, Loading, Note, Reveal, SectionTitle } from "../components/ui";
import { Link } from "../components/Link";

function PartialGravity() {
  const { data } = useApi("/api/gravity-bounds");
  const { data: compared } = useApi("/api/findings", { q: "normal gravity", limit: 4 });
  return (
    <>
      <SectionTitle
        sub={tr(
          "La NASA prepara el regreso a la Luna, pero PSI todavía no tiene ningún experimento de combustión en gravedad parcial. Así se puede razonar mientras llegan esos datos.",
          "NASA is preparing the return to the Moon, but PSI does not yet hold any partial-gravity combustion experiment. This is how to reason until that data arrives.",
        )}
      >
        {tr("Gravedad parcial: lo que falta y cómo acotarlo", "Partial gravity: what is missing and how to bound it")}
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={tr("Sin datos en PSI todavía", "No PSI data yet")}>
          <p className="text-sm text-gris-oscuro">
            {tr(
              "Ninguna prueba de PSI se hizo a 0,165 g (Luna) ni a 0,38 g (Marte). Se espera que lleguen de LUCI (Lunar-g Combustion Investigation) y FM2 (Flammability of Materials on the Moon). Los hallazgos marcados como «g residual o parcial» son vuelos parabólicos y vibraciones, no pruebas en gravedad lunar.",
              "No PSI test was run at 0.165 g (Moon) or 0.38 g (Mars). Data is expected from LUCI (Lunar-g Combustion Investigation) and FM2 (Flammability of Materials on the Moon). Findings tagged as “residual or partial g” are parabolic flights and g-jitter, not lunar-gravity tests.",
            )}
          </p>
        </Card>
        <Card title={tr("Acotar entre 0 g y 1 g", "Bound between 0 g and 1 g")}>
          <p className="text-sm text-gris-oscuro">
            {tr(
              "Lo que ocurre a gravedad intermedia debería quedar entre los resultados de microgravedad y los de la Tierra. Saffire-II quemó las mismas muestras en ambas condiciones:",
              "What happens at intermediate gravity should fall between the microgravity and Earth results. Saffire-II burned the same samples in both conditions:",
            )}
          </p>
          {data?.pairs?.length > 0 && (
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-gris-oscuro">
                <tr>
                  <th className="py-1 font-medium">{tr("Muestra", "Sample")}</th>
                  <th className="py-1 text-right font-medium">0 g</th>
                  <th className="py-1 text-right font-medium">1 g</th>
                </tr>
              </thead>
              <tbody>
                {data.pairs.map((pair) => (
                  <tr key={pair.test_id} className="border-t border-linea">
                    <td className="py-1">
                      {pair.fuel} <small className="text-gris-oscuro">({pair.test_code})</small>
                    </td>
                    <td className="py-1 text-right tabular-nums">{pair.microgravity_mm} mm</td>
                    <td className="py-1 text-right tabular-nums">{pair.normal_gravity_mm} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Note>{tr("Longitud quemada de cada muestra. Un material que no arde en 1 g puede arder en microgravedad, y al revés.", "Burned length of each sample. A material that does not burn at 1 g may burn in microgravity, and vice versa.")}</Note>
        </Card>
        <Card title={tr("E-FIELD: imitar la flotación", "E-FIELD: mimicking buoyancy")}>
          <p className="text-sm text-gris-oscuro">
            {tr(
              `ACME E-FIELD Flames aplicó un campo eléctrico a las llamas en la ISS. El campo empuja los iones de la llama y produce un efecto parecido a la flotación, una forma de estudiar «gravedad artificial» sin salir de la órbita (${data?.efield_tests ?? "—"} pruebas tabuladas).`,
              `ACME E-FIELD Flames applied an electric field to flames on the ISS. The field pushes the flame's ions and produces an effect similar to buoyancy, a way to study “artificial gravity” without leaving orbit (${data?.efield_tests ?? "—"} tabulated tests).`,
            )}
          </p>
          <Link to="investigaciones" query={{ acc: "PSI-22" }} className="mt-3 inline-block text-sm font-medium text-azul hover:underline">
            {tr("Ver E-FIELD Flames", "View E-FIELD Flames")} →
          </Link>
        </Card>
      </div>
      {compared?.findings?.length > 0 && (
        <>
          <h3 className="mt-8 mb-3 text-xl">{tr("Qué separa la microgravedad de la Tierra", "What separates microgravity from Earth")}</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {compared.findings.map((f) => (
              <FindingCard key={f.id} finding={f} compact />
            ))}
          </div>
        </>
      )}
      <div className="mt-6">
        <AskButton question={tr("¿Cómo se puede estimar el comportamiento del fuego en la Luna con datos de microgravedad y de la Tierra?", "How can fire behavior on the Moon be estimated from microgravity and Earth data?")} />
      </div>
    </>
  );
}

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
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr(
          "Dónde hay evidencia experimental para el escenario de misión elegido y dónde no. Un hueco aquí es una prioridad: un riesgo que hoy no está respaldado por pruebas.",
          "Where there is experimental evidence for the chosen mission scenario and where there is not. A gap here is a priority: a risk that no test backs today.",
        )}
      </p>
      <MissionBar />
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <>
          <SectionTitle
            sub={tr(
              "Pruebas de la NASA cuyas condiciones de oxígeno y presión coinciden con cada escenario. Las celdas en rojo no tienen ninguna.",
              "NASA tests whose oxygen and pressure conditions match each scenario. Red cells have none.",
            )}
          >
            {tr("Cobertura por escenario", "Coverage by scenario")}
          </SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-linea">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-claro text-left">
                  <th className="sticky left-0 bg-claro p-3 font-medium">{tr("Tipo de combustible", "Fuel type")}</th>
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
                    <td className="sticky left-0 bg-white p-3">{label(FUEL_CLASS_LABEL, fc)}</td>
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

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Card title={tr("Evidencia por área", "Evidence by area")}>
              <Bars
                items={data.areas.map((a) => ({
                  key: a.area,
                  label: label(AREA_LABEL, a.area),
                  value: a.findings,
                  text: `${a.findings} · ${a.gaps} ${tr("huecos", "gaps")}`,
                }))}
              />
              <Note>{tr("Hallazgos verificados por área y cuántos de ellos son huecos de conocimiento señalados por los propios autores.", "Verified findings by area and how many of them are knowledge gaps flagged by the authors themselves.")}</Note>
            </Card>
            <Card title={tr("Evidencia por gravedad", "Evidence by gravity")}>
              <Bars
                items={Object.entries(gravity)
                  .sort((a, b) => b[1] - a[1])
                  .map(([g, n]) => ({ key: g, label: label(GRAVITY_LABEL, g), value: n, tone: g === "partial_gravity" ? "rojo" : "" }))}
              />
              <Note>
                {tr(
                  "Casi toda la evidencia es de microgravedad. No hay pruebas de combustión a la gravedad de la Luna (0,165 g) ni de Marte (0,38 g): lo marcado en rojo son menciones y vuelos parabólicos.",
                  "Almost all the evidence comes from microgravity. There are no combustion tests at lunar (0.165 g) or Martian (0.38 g) gravity: the red bar holds mentions and parabolic flights.",
                )}
              </Note>
            </Card>
          </div>

          <PartialGravity />

          <SectionTitle sub={tr("Limitaciones y preguntas abiertas que los investigadores dejaron escritas, con su cita literal.", "Limitations and open questions the researchers wrote down, with their exact quote.")}>
            {tr("Huecos señalados por los autores", "Gaps flagged by the authors")}
          </SectionTitle>
          {areas.map((a) => (
            <div key={a} className="mb-8">
              <h3 className="mb-3 text-xl">{label(AREA_LABEL, a)}</h3>
              <div className="grid gap-3 lg:grid-cols-2">
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
      <CrossLink text={tr("¿Qué sí sabemos para este escenario?", "What do we know for this scenario?")} to="recomendacion" button={tr("Qué dice la evidencia", "What the evidence says")} />
    </Page>
  );
}

function AreaEvidence({ area }) {
  const { scenarioId } = useApp();
  const { data, error, loading } = useApi("/api/findings", { scenario: scenarioId, area, limit: 4 });
  return (
    <div className="mb-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-2xl">{label(AREA_LABEL, area)}</h3>
        {data && (
          <small className="text-gris-oscuro">
            {data.total} {tr("hallazgos verificados", "verified findings")}
          </small>
        )}
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} />
      <div className="grid gap-4 lg:grid-cols-2">
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
      <p className="max-w-3xl text-lg text-gris-oscuro sm:text-xl">
        {tr(
          "Los hallazgos más relevantes para el escenario elegido, ordenados por una puntuación que puedes desplegar: confianza de la cita, tipo de fuente, cercanía del oxígeno y coincidencia de gravedad.",
          "The most relevant findings for the chosen scenario, ranked by a score you can expand: quote confidence, source type, oxygen closeness and gravity match.",
        )}
      </p>
      <MissionBar />
      <div className="mb-8">
        <AskButton
          question={tr(
            `¿Qué recomendaciones de seguridad contra incendios da la evidencia para ${scenario?.name || "este escenario"}?`,
            `What fire safety recommendations does the evidence give for ${scenario?.name || "this scenario"}?`,
          )}
        >
          {tr("Pedir un resumen al asistente", "Ask the assistant for a summary")}
        </AskButton>
      </div>
      {areas.map((a) => (
        <AreaEvidence key={a} area={a} />
      ))}
      <CrossLink text={tr("¿Qué agentes apagan mejor un fuego en microgravedad?", "Which agents best put out a fire in microgravity?")} to="prototipos" button={tr("Extintores y agentes", "Extinguishers and agents")} />
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
            {tr(
              `${data.total} hallazgos de supresión mencionan ${pick(AGENTES[agent].nombre).toLowerCase()}. Los ${data.findings.length} más relevantes:`,
              `${data.total} suppression findings mention ${pick(AGENTES[agent].nombre).toLowerCase()}. The ${data.findings.length} most relevant:`,
            )}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
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
        <p className="text-lg text-gris-oscuro sm:text-xl">
          {tr(
            "Los extintores de una nave no pueden ser tóxicos ni dejar residuos. Estos son los agentes probados en los experimentos de la NASA, con los resultados reales de cada prueba y lo que concluyeron sus autores.",
            "Spacecraft extinguishers cannot be toxic or leave residue. These are the agents tested in NASA experiments, with the real results of each test and what their authors concluded.",
          )}
        </p>
        <Figure media={MEDIA.extincion} />
      </div>
      <SectionTitle sub={tr("Pruebas de combustión en atmósferas diluidas con cada gas. Selecciona un agente para ver su evidencia.", "Combustion tests in atmospheres diluted with each gas. Pick an agent to see its evidence.")}>
        {tr("Agentes probados", "Agents tested")}
      </SectionTitle>
      {loading && <Loading />}
      <ErrorBox error={error} />
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.map((a) => (
            <button
              key={a.agent}
              onClick={() => setAgent(a.agent)}
              className={`rounded-xl border p-4 text-left transition ${a.agent === agent ? "border-azul bg-azul text-white" : "border-linea hover:border-noche"}`}
            >
              <b className="block font-serif text-lg sm:text-xl">{pick(AGENTES[a.agent].nombre)}</b>
              <small className={a.agent === agent ? "text-white/80" : "text-gris-oscuro"}>
                {a.tests} {tr("pruebas", "tests")} · {a.findings} {tr("hallazgos", "findings")}
              </small>
            </button>
          ))}
        </div>
      )}
      {current && (
        <div className="mt-8">
          <p className="max-w-3xl">{pick(AGENTES[agent].resumen)}</p>
          <KpiRow>
            <Kpi value={current.tests} label={tr("Pruebas con este diluyente", "Tests with this diluent")} note={current.investigations.join(" · ") || tr("sin pruebas tabuladas", "no tabulated tests")} />
            <Kpi value={current.tests ? (current.extinguished / current.tests) * 100 : null} suffix=" %" label={tr("Terminaron en extinción", "Ended in extinction")} tone="azul" />
            <Kpi value={current.mean_extinction_diameter_mm} digits={2} suffix=" mm" label={tr("Diámetro medio de extinción", "Mean extinction diameter")} note={tr("gotas de combustible", "fuel droplets")} />
            <Kpi value={current.mean_burn_time_s} digits={1} suffix=" s" label={tr("Tiempo medio de combustión", "Mean burn time")} />
          </KpiRow>
          {current.tests === 0 && <Note>{tr("No hay pruebas tabuladas con este gas; su evidencia viene de simulaciones y artículos.", "There are no tabulated tests with this gas; its evidence comes from simulations and papers.")}</Note>}
          <AgentFindings agent={agent} />
        </div>
      )}
      <SectionTitle sub={tr("Sistemas usados a bordo a lo largo de la historia.", "Systems used on board throughout history.")}>{tr("Contexto operativo", "Operational context")}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONTEXTO_EXTINTORES.map((x, i) => (
          <Reveal key={x.n[0]} delay={i * 60}>
            <Card title={pick(x.n)}>
              <p className="text-sm text-gris-oscuro">{pick(x.r)}</p>
            </Card>
          </Reveal>
        ))}
      </div>
      <Note>
        {tr(
          "Pruebas: tabla de pruebas normalizada de PSI (diluyente, resultado y diámetro de extinción). Medias calculadas sobre las pruebas con dato.",
          "Tests: normalized PSI test table (diluent, outcome and extinction diameter). Means computed over the tests with data.",
        )}
      </Note>
      <CrossLink text={tr("Estos protocolos nacen de incendios reales.", "These protocols were born from real fires.")} to="historia" button={tr("Ir a Historia", "Go to History")} />
    </Page>
  );
}
