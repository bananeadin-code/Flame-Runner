import { useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { Link } from "../components/Link";
import { FUEL_CLASS_LABEL, label } from "../lib/format";
import { MEDIA } from "../content/media";
import { pick, tr } from "../lib/i18n";
import { num } from "../lib/format";
import { AskButton } from "../components/Layout";
import { Kpi, KpiRow, Reveal } from "../components/ui";

const TEMAS = [
  ["riesgos", ["Brechas: lo que todavía no sabemos para tu misión", "Gaps: what we still do not know for your mission"]],
  ["oxigeno", ["Oxígeno: qué se ha probado en atmósferas enriquecidas", "Oxygen: what has been tested in enriched atmospheres"]],
  ["prototipos", ["Extintores: qué dice la evidencia sobre cada agente", "Extinguishers: what the evidence says about each agent"]],
  ["historia", ["Historia: los incendios que cambiaron los protocolos", "History: the fires that changed the protocols"]],
];

function Headline() {
  const { scenario, scenarioId } = useApp();
  const { data } = useApi("/api/gaps");
  if (!data || !scenario) return null;
  const cells = data.scenario_coverage.filter((c) => c.scenario === scenarioId);
  const solid = cells.find((c) => c.fuel_class === "solid");
  return (
    <section className="bg-noche px-4 py-12 text-white sm:px-5 sm:py-16 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <small className="text-xs uppercase tracking-[0.2em] text-azul-palido">{tr("Hallazgo principal", "Key finding")} · {scenario.name}</small>
          <h2 className="mt-3 max-w-4xl text-2xl sm:text-3xl md:text-5xl">
            {solid?.tests_in_scenario === 0 ? (
              <>
                {tr(
                  <>
                    <span className="text-rojo">Ninguna</span> de las {solid.tests_with_o2} pruebas de materiales sólidos con oxígeno registrado se hizo en las condiciones de este escenario.
                  </>,
                  <>
                    <span className="text-rojo">None</span> of the {solid.tests_with_o2} solid material tests with recorded oxygen was run under this scenario’s conditions.
                  </>,
                )}
              </>
            ) : (
              <>
                {tr(
                  `${solid?.tests_in_scenario} de ${solid?.tests_with_o2} pruebas de materiales sólidos con oxígeno registrado cubren las condiciones de este escenario.`,
                  `${solid?.tests_in_scenario} of ${solid?.tests_with_o2} solid material tests with recorded oxygen cover this scenario’s conditions.`,
                )}
              </>
            )}
          </h2>
          <p className="mt-4 max-w-3xl text-white/75">
            {tr(
              `${num(scenario.o2_fraction * 100, 1)} % de oxígeno a ${num(scenario.pressure_kpa)} kPa y ${num(scenario.gravity_g, undefined, 3)} g. Pruebas de la base de datos de la NASA (PSI) cuyas condiciones de oxígeno y presión coinciden con el escenario:`,
              `${num(scenario.o2_fraction * 100, 1)} % oxygen at ${num(scenario.pressure_kpa)} kPa and ${num(scenario.gravity_g, undefined, 3)} g. Tests in the NASA database (PSI) whose oxygen and pressure conditions match the scenario:`,
            )}
          </p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cells.map((c, i) => {
            const unknown = c.tests_with_o2 === 0;
            const empty = !unknown && c.tests_in_scenario === 0;
            return (
              <Reveal key={c.fuel_class} delay={i * 80} className={`rounded-xl border p-4 sm:p-5 ${empty ? "border-rojo/60 bg-rojo/10" : "border-white/15 bg-white/5"}`}>
                <b className={`block font-serif text-4xl ${empty ? "text-rojo" : unknown ? "text-white/40" : ""}`}>{unknown ? "—" : c.tests_in_scenario}</b>
                <span className="mt-1 block text-sm">{label(FUEL_CLASS_LABEL, c.fuel_class)}</span>
                <small className="text-xs text-white/60">
                  {unknown ? tr(`${c.tests} pruebas sin O₂ registrado`, `${c.tests} tests with no O₂ recorded`) : tr(`de ${c.tests_with_o2} pruebas con O₂ registrado`, `of ${c.tests_with_o2} tests with recorded O₂`)}
                </small>
              </Reveal>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="riesgos" className="rounded-full bg-rojo px-5 py-2.5 text-sm hover:bg-rojo/85">
            {tr("Ver todas las brechas", "See all the gaps")} →
          </Link>
          <AskButton question={tr(`¿Qué riesgos de incendio hay en el escenario ${scenario.name}?`, `What fire risks are there in the ${scenario.name} scenario?`)}>
            {tr("Preguntar por este escenario", "Ask about this scenario")}
          </AskButton>
        </div>
      </div>
    </section>
  );
}

export default function Inicio() {
  const [earth, setEarth] = useState(false);
  const { data: stats } = useApi("/api/stats");
  return (
    <>
      <section className="relative grid min-h-[calc(100svh-40px)] items-center overflow-hidden bg-noche text-white">
        <img src={MEDIA.acmeLlama.src} alt="" className="absolute inset-0 size-full object-cover opacity-50 sm:opacity-70 lg:left-auto lg:w-3/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-noche via-noche/85 to-noche/10" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pt-28 pb-20 sm:px-5 md:px-8">
          <h1 className="max-w-2xl animate-subir text-4xl font-bold sm:text-5xl lg:text-7xl">{tr("Descifrando cómo arde el fuego sin gravedad", "Decoding how fire burns without gravity")}</h1>
          <p className="mt-6 max-w-xl animate-subir text-base text-white/85 [animation-delay:120ms] sm:text-lg">
            {tr(
              "Sin convección, la llama cambia de forma y se vuelve difícil de detectar. Explora décadas de experimentos de la NASA en la Estación Espacial, con cada dato respaldado por su fuente original.",
              "Without convection, a flame changes shape and becomes hard to detect. Explore decades of NASA experiments on the Space Station, with every data point backed by its original source.",
            )}
          </p>
          <div className="mt-8 flex animate-subir flex-wrap gap-3 [animation-delay:240ms]">
            <Link to="riesgos" className="rounded-full bg-rojo px-6 py-3 font-medium hover:bg-rojo/85">
              {tr("Explorar la misión", "Explore the mission")} →
            </Link>
            <AskButton question="">{tr("Buscar o preguntar", "Search or ask")}</AskButton>
          </div>
          <a href={MEDIA.acmeLlama.url} target="_blank" rel="noreferrer" className="absolute right-4 bottom-4 left-4 text-right text-xs text-white/60 hover:text-white sm:left-auto md:right-8">
            {tr("Llama real en microgravedad", "Real flame in microgravity")} · {pick(MEDIA.acmeLlama.credit)} ↗
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-5 md:px-8">
        <KpiRow>
          <Kpi value={stats?.investigations} label={tr("Investigaciones de la NASA", "NASA investigations")} note="Combustion Science · PSI" />
          <Kpi value={stats?.tests} label={tr("Pruebas experimentales", "Experimental tests")} note={tr("normalizadas y comparables", "normalized and comparable")} />
          <Kpi value={stats?.pages} label={tr("Páginas de documentos", "Document pages")} note={tr("informes, artículos y fichas", "reports, papers and fact sheets")} />
          <Kpi value={stats?.findings_verified} label={tr("Hallazgos con cita verificada", "Findings with a verified quote")} tone="rojo" note={tr("comprobados contra el original", "checked against the original")} />
        </KpiRow>
      </section>

      <Headline />

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 sm:px-5 md:px-8 lg:grid-cols-[10rem_repeat(4,1fr)]">
        <b className="font-serif text-lg leading-tight sm:col-span-2 lg:col-span-1">{tr("TEMAS PARA TU MISIÓN", "TOPICS FOR YOUR MISSION")}</b>
        {TEMAS.map(([id, text], k) => (
          <Reveal key={id} delay={k * 70}>
            <Link to={id} className="group flex h-full gap-3 border-l border-linea pl-4 transition hover:border-rojo">
              <span className="font-serif text-3xl text-rojo">{k + 1}</span>
              <span className="text-sm group-hover:underline">{pick(text)}</span>
            </Link>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-5 sm:py-16 md:grid-cols-2 md:px-8">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl">{tr("Una llama, dos mundos", "One flame, two worlds")}</h2>
          <p className="mt-4 max-w-md text-lg text-gris-oscuro">
            {tr(
              "En la Tierra el aire caliente sube y estira la llama. En microgravedad no hay esa corriente: la llama se vuelve una esfera azul, más fría y difícil de ver. Son fotografías reales de la NASA.",
              "On Earth hot air rises and stretches the flame. In microgravity there is no such current: the flame becomes a blue sphere, cooler and hard to see. These are real NASA photographs.",
            )}
          </p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => setEarth(false)} className={`rounded-full border px-4 py-1.5 text-sm ${!earth ? "border-rojo bg-rojo text-white" : "border-linea"}`}>
              {tr("Microgravedad", "Microgravity")}
            </button>
            <button onClick={() => setEarth(true)} className={`rounded-full border px-4 py-1.5 text-sm ${earth ? "border-rojo bg-rojo text-white" : "border-linea"}`}>
              {tr("Tierra", "Earth")}
            </button>
          </div>
          <Link to="intro" className="mt-6 inline-block rounded-full border border-noche px-5 py-2 text-sm hover:bg-noche hover:text-white">
            {tr("Leer la introducción", "Read the introduction")}
          </Link>
        </Reveal>
        <Reveal delay={120} className="relative overflow-hidden rounded-2xl bg-noche">
          <small className="absolute top-4 left-4 z-10 rounded-full bg-noche/70 px-3 py-1 text-xs text-white">{earth ? tr("Tierra · 1 g", "Earth · 1 g") : tr("Microgravedad · 0 g", "Microgravity · 0 g")}</small>
          <div className="relative mx-auto aspect-[3/4] max-h-[520px]">
            <img src={MEDIA.velaMicro.src} alt={pick(MEDIA.velaMicro.alt)} className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${earth ? "opacity-0" : "opacity-100"}`} />
            <img src={MEDIA.velaTierra.src} alt={pick(MEDIA.velaTierra.alt)} className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${earth ? "opacity-100" : "opacity-0"}`} />
          </div>
          <a href={MEDIA.velaMicro.url} target="_blank" rel="noreferrer" className="block px-4 py-3 text-xs text-white/60 hover:text-white">
            {pick(MEDIA.velaMicro.credit)} ↗
          </a>
        </Reveal>
      </section>
    </>
  );
}
