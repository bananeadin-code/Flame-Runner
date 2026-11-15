import { useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { Link } from "../components/Link";
import { FUEL_CLASS_LABEL, label } from "../lib/format";
import { MEDIA } from "../content/media";
import { AskButton } from "../components/Layout";
import { Kpi, KpiRow, Reveal } from "../components/ui";

const TEMAS = [
  ["riesgos", "Brechas: lo que todavía no sabemos para tu misión"],
  ["oxigeno", "Oxígeno: qué se ha probado en atmósferas enriquecidas"],
  ["prototipos", "Extintores: qué dice la evidencia sobre cada agente"],
  ["historia", "Historia: los incendios que cambiaron los protocolos"],
];

function Headline() {
  const { scenario, scenarioId } = useApp();
  const { data } = useApi("/api/gaps");
  if (!data || !scenario) return null;
  const cells = data.scenario_coverage.filter((c) => c.scenario === scenarioId);
  const solid = cells.find((c) => c.fuel_class === "solid");
  return (
    <section className="bg-noche px-5 py-16 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <small className="text-xs uppercase tracking-[0.2em] text-azul-palido">Hallazgo principal · {scenario.name}</small>
          <h2 className="mt-3 max-w-4xl text-3xl md:text-5xl">
            {solid?.tests_in_scenario === 0 ? (
              <>
                <span className="text-rojo">Ninguna</span> de las {solid.tests} pruebas de materiales sólidos en microgravedad se hizo en las condiciones de este escenario.
              </>
            ) : (
              <>
                {solid?.tests_in_scenario} de {solid?.tests} pruebas de materiales sólidos cubren las condiciones de este escenario.
              </>
            )}
          </h2>
          <p className="mt-4 max-w-3xl text-white/75">
            {Math.round(scenario.o2_fraction * 1000) / 10} % de oxígeno a {scenario.pressure_kpa} kPa y {scenario.gravity_g} g. Pruebas de la base de datos de la NASA (PSI) cuyas condiciones de oxígeno y presión coinciden con el escenario:
          </p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {cells.map((c, i) => (
            <Reveal key={c.fuel_class} delay={i * 80} className={`rounded-xl border p-5 ${c.tests_in_scenario === 0 ? "border-rojo/60 bg-rojo/10" : "border-white/15 bg-white/5"}`}>
              <b className={`block font-serif text-4xl ${c.tests_in_scenario === 0 ? "text-rojo" : ""}`}>{c.tests_in_scenario}</b>
              <span className="mt-1 block text-sm">{label(FUEL_CLASS_LABEL, c.fuel_class)}</span>
              <small className="text-xs text-white/60">de {c.tests} pruebas</small>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="riesgos" className="rounded-full bg-rojo px-5 py-2.5 text-sm hover:bg-rojo/85">
            Ver todas las brechas →
          </Link>
          <AskButton question={`¿Qué riesgos de incendio hay en el escenario ${scenario.name}?`}>Preguntar por este escenario</AskButton>
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
      <section className="relative grid min-h-[calc(100vh-40px)] items-center overflow-hidden bg-noche text-white">
        <img src={MEDIA.acmeLlama.src} alt="" className="absolute inset-0 size-full object-cover opacity-70 md:left-auto md:w-3/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-noche via-noche/85 to-noche/10" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pt-28 pb-16 md:px-8">
          <h1 className="max-w-2xl animate-subir text-4xl font-bold md:text-7xl">Descifrando cómo arde el fuego sin gravedad</h1>
          <p className="mt-6 max-w-xl animate-subir text-lg text-white/85 [animation-delay:120ms]">
            Sin convección, la llama cambia de forma y se vuelve difícil de detectar. Explora décadas de experimentos de la NASA en la Estación Espacial, con cada dato respaldado por su fuente original.
          </p>
          <div className="mt-8 flex animate-subir flex-wrap gap-3 [animation-delay:240ms]">
            <Link to="riesgos" className="rounded-full bg-rojo px-6 py-3 font-medium hover:bg-rojo/85">
              Explorar la misión →
            </Link>
            <AskButton question="">Buscar o preguntar</AskButton>
          </div>
          <a href={MEDIA.acmeLlama.url} target="_blank" rel="noreferrer" className="absolute right-5 bottom-4 text-xs text-white/60 hover:text-white md:right-8">
            Llama real en microgravedad · {MEDIA.acmeLlama.credit} ↗
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 md:px-8">
        <KpiRow>
          <Kpi value={stats?.investigations} label="Investigaciones de la NASA" note="Combustion Science · PSI" />
          <Kpi value={stats?.tests} label="Pruebas experimentales" note="normalizadas y comparables" />
          <Kpi value={stats?.pages} label="Páginas de documentos" note="informes, artículos y fichas" />
          <Kpi value={stats?.findings_verified} label="Hallazgos con cita verificada" tone="rojo" note="comprobados contra el original" />
        </KpiRow>
      </section>

      <Headline />

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 md:grid-cols-[10rem_repeat(4,1fr)] md:px-8">
        <b className="font-serif text-lg leading-tight">TEMAS PARA TU MISIÓN</b>
        {TEMAS.map(([id, text], k) => (
          <Reveal key={id} delay={k * 70}>
            <Link to={id} className="group flex h-full gap-3 border-l border-linea pl-4 transition hover:border-rojo">
              <span className="font-serif text-3xl text-rojo">{k + 1}</span>
              <span className="text-sm group-hover:underline">{text}</span>
            </Link>
          </Reveal>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
        <Reveal>
          <h2 className="text-4xl">Una llama, dos mundos</h2>
          <p className="mt-4 max-w-md text-lg text-gris-oscuro">
            En la Tierra el aire caliente sube y estira la llama. En microgravedad no hay esa corriente: la llama se vuelve una esfera azul, más fría y difícil de ver. Son fotografías reales de la NASA.
          </p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => setEarth(false)} className={`rounded-full border px-4 py-1.5 text-sm ${!earth ? "border-rojo bg-rojo text-white" : "border-linea"}`}>
              Microgravedad
            </button>
            <button onClick={() => setEarth(true)} className={`rounded-full border px-4 py-1.5 text-sm ${earth ? "border-rojo bg-rojo text-white" : "border-linea"}`}>
              Tierra
            </button>
          </div>
          <Link to="intro" className="mt-6 inline-block rounded-full border border-noche px-5 py-2 text-sm hover:bg-noche hover:text-white">
            Leer la introducción
          </Link>
        </Reveal>
        <Reveal delay={120} className="relative overflow-hidden rounded-2xl bg-noche">
          <small className="absolute top-4 left-4 z-10 rounded-full bg-noche/70 px-3 py-1 text-xs text-white">{earth ? "Tierra · 1 g" : "Microgravedad · 0 g"}</small>
          <div className="relative mx-auto aspect-[3/4] max-h-[520px]">
            <img src={MEDIA.velaMicro.src} alt={MEDIA.velaMicro.alt} className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${earth ? "opacity-0" : "opacity-100"}`} />
            <img src={MEDIA.velaTierra.src} alt={MEDIA.velaTierra.alt} className={`absolute inset-0 size-full object-contain transition-opacity duration-700 ${earth ? "opacity-100" : "opacity-0"}`} />
          </div>
          <a href={MEDIA.velaMicro.url} target="_blank" rel="noreferrer" className="block px-4 py-3 text-xs text-white/60 hover:text-white">
            {MEDIA.velaMicro.credit} ↗
          </a>
        </Reveal>
      </section>
    </>
  );
}
