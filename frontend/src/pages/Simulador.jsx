import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "../lib/useApi";
import { FUEL_CLASS_LABEL, OUTCOME_LABEL, label, num } from "../lib/format";
import { MEDIA } from "../content/media";
import { AskButton, CrossLink, Page } from "../components/Layout";
import { FlameCanvas } from "../components/FlameCanvas";
import { Dial } from "../components/Dial";
import { COOL_FLAME_PHASES, coolFlameState } from "../lib/coolFlame";
import { Card, ErrorBox, Figure, Loading, Note, Tag } from "../components/ui";
import { pick, tr } from "../lib/i18n";

// Oxígeno de la base lunar según el texto oficial del reto: "likely 30% or greater".
const LUNAR_O2 = 30;
const O2_NEAR = 1.5;
const FLOW_NEAR = 3;
// franjas sobre el visor oscuro y sobre el panel blanco
const DARK_BANDS = { gas: "rgba(127,182,234,0.35)", droplet: "rgba(42,134,218,0.85)", solid: "#ffffff" };
const LIGHT_BANDS = { gas: "rgba(42,134,218,0.25)", droplet: "#2a86da", solid: "#00020f" };
const MONO = "font-mono tracking-wider";

function ranges(tests, key) {
  const out = {};
  for (const t of tests) {
    const lo = key === "o2" ? t.o2_min * 100 : t.flow_min_cm_s;
    const hi = key === "o2" ? t.o2_max * 100 : t.flow_max_cm_s;
    if (lo == null || hi == null || Number.isNaN(lo)) continue;
    const r = (out[t.fuel_class] ||= { from: lo, to: hi, n: 0 });
    r.from = Math.min(r.from, lo);
    r.to = Math.max(r.to, hi);
    r.n += 1;
  }
  return out;
}

// las pruebas reales más parecidas a lo elegido (oxígeno y, si la prueba lo midió, flujo); una por investigación
function nearest(tests, o2, flow, n = 3) {
  const scored = tests
    .filter((t) => t.o2_min != null && t.o2_max != null)
    .map((t) => {
      const mid = ((t.o2_min + t.o2_max) / 2) * 100;
      const f = t.flow_min_cm_s != null ? (t.flow_min_cm_s + t.flow_max_cm_s) / 2 : null;
      return { t, mid, f, score: Math.abs(o2 - mid) / 35 + (f == null ? 0.3 : Math.abs(flow - f) / 40) };
    })
    .sort((a, b) => a.score - b.score);
  const out = [];
  const seen = new Set();
  for (const s of scored) {
    if (seen.has(s.t.accession)) continue;
    seen.add(s.t.accession);
    out.push(s);
    if (out.length === n) break;
  }
  return out;
}

function initial(query, key, fallback, min, max) {
  const v = Number(query?.[key]);
  return Number.isFinite(v) && query?.[key] !== "" ? Math.min(max, Math.max(min, Math.round(v))) : fallback;
}

function useElapsed(since) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return { now, label: `T+${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` };
}

function Corners() {
  const c = "absolute h-6 w-6 border-white/40";
  return (
    <>
      <span className={`${c} top-3 left-3 border-t border-l`} />
      <span className={`${c} top-3 right-3 border-t border-r`} />
      <span className={`${c} bottom-3 left-3 border-b border-l`} />
      <span className={`${c} right-3 bottom-3 border-r border-b`} />
    </>
  );
}

// escala de O2 en el visor: franjas de lo que NASA probó (de /api/tests), la base lunar y el valor actual
function O2Strip({ o2, o2Ranges, compact }) {
  const at = (v) => ((Math.min(45, Math.max(10, v)) - 10) / 35) * 100;
  const rows = ["solid", "droplet", "gas"].filter((k) => o2Ranges?.[k]);
  if (!rows.length) return null;
  return (
    <div className={`pointer-events-none absolute left-6 ${compact ? "right-6 bottom-6" : "right-[46%] bottom-5"} ${MONO} text-[10px] text-white/55`}>
      <div className="mb-1.5 flex justify-between">
        <span>{tr("O₂ PROBADO POR NASA · PSI", "O₂ TESTED BY NASA · PSI")}</span>
        <span className="text-rojo">{tr("LUNA ≥ 30 %", "MOON ≥ 30 %")}</span>
      </div>
      <div className="relative h-[22px] rounded-sm bg-white/[0.04] ring-1 ring-white/10">
        {rows.map((k, i) => (
          <div
            key={k}
            className="absolute h-1 rounded-full"
            style={{ left: `${at(o2Ranges[k].from)}%`, right: `${100 - at(o2Ranges[k].to)}%`, top: 4 + i * 6, background: DARK_BANDS[k] }}
          />
        ))}
        <div className="absolute -top-1 -bottom-1 w-px bg-rojo" style={{ left: `${at(LUNAR_O2)}%` }} />
        <div
          className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-[left] duration-300"
          style={{ left: `${at(o2)}%` }}
        />
      </div>
      <div className="relative mt-1 h-3">
        {[10, 20, 30, 40].map((v) => (
          <span key={v} className="absolute -translate-x-1/2" style={{ left: `${at(v)}%` }}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

// un visor de cámara: la llama más las lecturas del instrumento encima
function Viewport({ gravity, o2, flow, ignition, camera, timer, compact, o2Ranges, minO2, coolStart = null, coolPhase = null }) {
  const outside = minO2 != null && o2 < minO2;
  return (
    <div className="relative h-full overflow-hidden bg-[#020409]">
      <FlameCanvas
        gravity={gravity}
        o2={o2}
        flow={flow}
        ignition={ignition}
        ghost={outside}
        coolStart={coolStart}
        className="absolute inset-0"
        fallback={<Figure media={gravity ? MEDIA.velaTierra : MEDIA.velaMicro} imgClassName="h-full object-contain" />}
      />
      <Corners />
      {coolPhase && (
        <div className={`pointer-events-none absolute top-[16%] left-1/2 w-max max-w-[90%] -translate-x-1/2 rounded border px-3 py-1.5 text-center text-[11px] ${coolPhase === "cool" ? "border-azul-palido/60 bg-azul/30 text-white" : "border-white/30 bg-black/40 text-white/85"} ${MONO}`}>
          {pick(COOL_FLAME_PHASES[coolPhase])}
          {coolPhase === "cool" && <span className="block text-[9px] text-white/60">{tr("REALZADA PARA QUE SE VEA", "ENHANCED SO IT CAN BE SEEN")}</span>}
        </div>
      )}
      {outside && (
        <div className={`pointer-events-none absolute top-[28%] left-1/2 -translate-x-1/2 rounded border border-white/30 bg-black/40 px-3 py-1.5 text-center text-[11px] text-white/85 ${MONO}`}>
          {tr("SIN DATOS DE NASA", "NO NASA DATA")}
          <span className="block text-white/55">O₂ &lt; {num(minO2, 0)} %</span>
        </div>
      )}
      <O2Strip o2={o2} o2Ranges={o2Ranges} compact={compact} />
      <div className={`pointer-events-none absolute top-5 left-6 text-[11px] text-white/60 ${MONO}`}>
        {compact ? `CAM ${camera}` : tr(`CÁMARA ${camera} · CÁMARA DE COMBUSTIÓN`, `CAMERA ${camera} · COMBUSTION CHAMBER`)}
        <span className="mt-1 block text-white">{gravity ? tr("1 g · TIERRA", "1 g · EARTH") : tr("0 g · MICROGRAVEDAD", "0 g · MICROGRAVITY")}</span>
        <span className="mt-1 block text-[9px] text-white/35">{tr("ILUSTRACIÓN · NO ES SIMULACIÓN FÍSICA", "ILLUSTRATION · NOT A PHYSICS SIMULATION")}</span>
      </div>
      <div className={`pointer-events-none absolute top-5 right-6 flex items-center gap-2 text-[11px] text-white/70 ${MONO}`}>
        <i className="h-2 w-2 animate-pulse rounded-full bg-rojo" />
        REC {timer}
      </div>
      {flow > 0 && (
        <div className={`pointer-events-none absolute top-1/2 right-6 -translate-y-1/2 text-right text-[10px] text-azul-palido ${MONO}`}>
          {tr("FLUJO DE AIRE →", "AIR FLOW →")}
          <span className="block text-white/70">{flow} cm/s</span>
        </div>
      )}
      {!compact && (
        <div className={`pointer-events-none absolute right-6 bottom-5 flex gap-6 text-right text-white ${MONO}`}>
          <span>
            <small className="block text-[10px] text-white/50">O₂</small>
            <b className="text-2xl font-normal">{o2.toFixed(0)}<span className="text-sm text-white/60"> %</span></b>
          </span>
          <span>
            <small className="block text-[10px] text-white/50">{tr("FLUJO", "FLOW")}</small>
            <b className="text-2xl font-normal">{flow.toFixed(0)}<span className="text-sm text-white/60"> cm/s</span></b>
          </span>
          <span>
            <small className="block text-[10px] text-white/50">{tr("GRAVEDAD", "GRAVITY")}</small>
            <b className="text-2xl font-normal">{gravity}<span className="text-sm text-white/60"> g</span></b>
          </span>
        </div>
      )}
    </div>
  );
}

function GravitySwitch({ value, onChange, disabled }) {
  const options = [
    [0, "0 g", tr("Microgravedad", "Microgravity")],
    [1, "1 g", tr("Tierra", "Earth")],
  ];
  return (
    <div role="radiogroup" aria-label={tr("Gravedad", "Gravity")} className={`grid grid-cols-2 gap-1 rounded-2xl bg-claro p-1 ${disabled ? "opacity-40" : ""}`}>
      {options.map(([g, big, small]) => (
        <button
          key={g}
          role="radio"
          aria-checked={value === g}
          disabled={disabled}
          onClick={() => onChange(g)}
          className={`rounded-xl px-5 py-3 text-left transition ${value === g ? "bg-rojo text-white shadow-sm" : "text-gris-oscuro hover:bg-white hover:text-noche"}`}
        >
          <b className="block font-serif text-2xl leading-none">{big}</b>
          <small className="text-sm">{small}</small>
        </button>
      ))}
    </div>
  );
}

function ToolButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-[15px] transition ${active ? "border-rojo bg-rojo text-white" : "border-linea text-noche hover:border-noche"}`}
    >
      {children}
    </button>
  );
}

// valores iniciales opcionales en la URL, útil para grabar el video: #/simulador?g=1&o2=30&flow=20&compare=1
export function Simulador({ query }) {
  const [gravity, setGravity] = useState(() => (query?.cool === "1" ? 0 : initial(query, "g", 0, 0, 1)));
  const [o2, setO2] = useState(() => initial(query, "o2", 21, 10, 45));
  const [flow, setFlow] = useState(() => (query?.cool === "1" ? 0 : initial(query, "flow", 0, 0, 40)));
  const [compare, setCompare] = useState(() => query?.compare === "1");
  const [ignition, setIgnition] = useState(0);
  const [ignitedAt, setIgnitedAt] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  // #/simulador?cool=1 arranca la secuencia de llama fría (útil para grabar el video)
  const [coolStart, setCoolStart] = useState(() => (query?.cool === "1" ? Date.now() : null));
  const stage = useRef(null);
  const { now, label: timer } = useElapsed(ignitedAt);
  const coolPhase = coolStart ? coolFlameState(now - coolStart).phase : null;
  const { data, error, loading } = useApi("/api/tests", {});

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stage.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const ignite = () => {
    setIgnition((n) => n + 1);
    setIgnitedAt(Date.now());
  };
  // FLEX: gota en microgravedad y sin flujo de aire
  const toggleCool = () => {
    if (coolStart) return setCoolStart(null);
    setCompare(false);
    setGravity(0);
    setFlow(0);
    ignite();
    setCoolStart(Date.now());
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else stage.current?.requestFullscreen?.();
  };

  const tests = useMemo(() => data?.tests || [], [data]);
  const o2Ranges = useMemo(() => ranges(tests.filter((t) => t.o2_min != null && t.o2_max != null), "o2"), [tests]);
  const flowRanges = useMemo(
    () => ranges(tests.filter((t) => t.flow_min_cm_s != null && t.flow_max_cm_s != null), "flow"),
    [tests],
  );
  const closest = useMemo(() => nearest(tests, o2, flow), [tests, o2, flow]);

  const nearO2 = tests.filter((t) => t.o2_min != null && t.o2_min * 100 - O2_NEAR <= o2 && o2 <= t.o2_max * 100 + O2_NEAR);
  const nearBoth = nearO2.filter(
    (t) => t.flow_min_cm_s != null && t.flow_min_cm_s - FLOW_NEAR <= flow && flow <= t.flow_max_cm_s + FLOW_NEAR,
  );
  const byClass = {};
  nearO2.forEach((t) => (byClass[t.fuel_class] = (byClass[t.fuel_class] || 0) + 1));
  const solids = byClass.solid || 0;
  const maxSolidO2 = o2Ranges.solid?.to;
  // el oxígeno más bajo con el que NASA probó algo (de las tablas); por debajo no hay datos
  const minO2 = tests.length ? Math.min(...Object.values(o2Ranges).map((r) => r.from)) : null;
  const outside = minO2 != null && o2 < minO2;

  const bandsFor = (r) =>
    ["gas", "droplet", "solid"]
      .filter((k) => r[k])
      .map((k) => ({ from: r[k].from, to: r[k].to, color: LIGHT_BANDS[k], label: `${label(FUEL_CLASS_LABEL, k)}: ${num(r[k].from, 1)}–${num(r[k].to, 1)} (${r[k].n} ${tr("pruebas", "tests")})` }));
  const o2Bands = [...bandsFor(o2Ranges), { from: LUNAR_O2 - 0.4, to: LUNAR_O2 + 0.4, color: "#ff3b3b", label: tr("Base lunar: 30 % o más", "Moon base: 30 % or more") }];

  return (
    <Page route="simulador" tabs>
      <p className="mb-8 max-w-3xl text-xl text-gris-oscuro">
        {tr(
          "Cambia la gravedad, el oxígeno y el flujo de aire, y mira cómo cambia la llama. Debajo ves si la NASA tiene pruebas reales en esas condiciones.",
          "Change gravity, oxygen and air flow, and watch the flame change. Below you can see whether NASA has real tests under those conditions.",
        )}
      </p>

      <section ref={stage} className={`overflow-hidden bg-white text-noche ${fullscreen ? "flex h-screen flex-col" : "rounded-2xl shadow-xl ring-1 ring-linea"}`}>
        <div className={`grid ${fullscreen ? "min-h-0 flex-1 lg:grid-cols-[1fr_420px]" : "lg:grid-cols-[1.55fr_1fr]"}`}>
          <div className={`grid ${compare ? "grid-cols-2 gap-px bg-black" : ""} ${fullscreen ? "min-h-0" : "min-h-[460px] md:min-h-[600px]"}`}>
            {compare ? (
              <>
                <Viewport gravity={0} o2={o2} flow={flow} ignition={ignition} camera={1} timer={timer} o2Ranges={o2Ranges} minO2={minO2} compact />
                <Viewport gravity={1} o2={o2} flow={flow} ignition={ignition} camera={2} timer={timer} o2Ranges={o2Ranges} minO2={minO2} compact />
              </>
            ) : (
              <Viewport gravity={gravity} o2={o2} flow={flow} ignition={ignition} camera={1} timer={timer} o2Ranges={o2Ranges} minO2={minO2} coolStart={coolStart} coolPhase={coolPhase} />
            )}
          </div>

          <div className={`flex flex-col gap-5 border-t border-linea p-6 lg:border-t-0 lg:border-l ${fullscreen ? "overflow-y-auto" : ""}`}>
            <div>
              <small className="mb-2 block text-xs uppercase tracking-wide text-gris-oscuro">{tr("Gravedad", "Gravity")}</small>
              <GravitySwitch
                value={gravity}
                onChange={(g) => {
                  setCoolStart(null);
                  setGravity(g);
                }}
                disabled={compare}
              />
              {compare && <small className="mt-1 block text-gris-oscuro">{tr("Comparando 0 g y 1 g lado a lado", "Comparing 0 g and 1 g side by side")}</small>}
            </div>
            <div className="grid grid-cols-2 justify-items-center">
              <Dial label={tr("Oxígeno", "Oxygen")} value={o2} min={10} max={45} unit=" %" onChange={setO2} bands={o2Bands} color="#ff3b3b" />
              <Dial label={tr("Flujo de aire", "Air flow")} value={flow} min={0} max={40} unit=" cm/s" onChange={setFlow} bands={bandsFor(flowRanges)} color="#0563b5" format={(v) => `${v}`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <ToolButton onClick={() => setO2(21)}>{tr("Aire normal (21 %)", "Normal air (21 %)")}</ToolButton>
              <ToolButton onClick={() => setO2(LUNAR_O2)}>{tr("Base lunar (30 %)", "Moon base (30 %)")}</ToolButton>
              <ToolButton onClick={ignite}>↻ {tr("Encender", "Ignite")}</ToolButton>
              <ToolButton active={!!coolStart} onClick={toggleCool}>
                {coolStart ? tr("Salir de llama fría", "Exit cool flame") : tr("Llama fría (FLEX)", "Cool flame (FLEX)")}
              </ToolButton>
              <ToolButton
                active={compare}
                onClick={() => {
                  setCoolStart(null);
                  setCompare((c) => !c);
                }}
              >
                {tr("Comparar 0 g | 1 g", "Compare 0 g | 1 g")}
              </ToolButton>
              <ToolButton active={fullscreen} onClick={toggleFullscreen}>
                {fullscreen ? tr("Salir", "Exit") : `⛶ ${tr("Pantalla completa", "Full screen")}`}
              </ToolButton>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gris-oscuro">
              <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-sm" style={{ background: LIGHT_BANDS.solid }} />{tr("Sólidos probados", "Solids tested")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-sm" style={{ background: LIGHT_BANDS.droplet }} />{tr("Gotas", "Droplets")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-sm" style={{ background: LIGHT_BANDS.gas }} />{tr("Gases", "Gases")}</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-sm bg-rojo" />{tr("Base lunar", "Moon base")}</span>
            </div>

            {coolStart && (
              <div className="rounded-xl border-l-4 border-azul bg-azul/5 p-4 text-sm">
                <b className="block font-serif text-xl leading-snug">{tr("La llama que sigue ardiendo cuando parece apagada", "The flame that keeps burning after it seems to go out")}</b>
                <p className="mt-2 text-gris-oscuro">
                  {tr(
                    "En FLEX, la llama caliente de una gota se apagaba, pero la gota seguía evaporándose: la sostenía una llama fría, casi invisible, que se forma después de la extinción visible. Muchos científicos lo creían imposible.",
                    "In FLEX, a droplet's hot flame went out, but the droplet kept vaporizing: it was sustained by a nearly invisible cool flame that forms after visible extinction. Many scientists thought this was impossible.",
                  )}
                </p>
                <blockquote className="mt-2 border-l-2 border-linea pl-3 text-xs text-gris-oscuro italic">
                  “This vaporization, we now know, is supported by a lower-temperature cool flame that forms after visible flame extinction.”
                </blockquote>
                <small className="mt-2 block text-xs text-gris-oscuro">
                  {tr("Fuentes", "Sources")}: NASA, <i>A Researcher’s Guide to Combustion Science</i> (2015), pp. 33-34.{" "}
                  {tr(
                    "Temperatura de las llamas frías, 500–1000 K: ficha de CFI-G (PSI-159). Tiempos de la animación ilustrativos.",
                    "Cool flame temperature, 500–1000 K: CFI-G record (PSI-159). Animation timing is illustrative.",
                  )}
                </small>
              </div>
            )}

            {data && (
              <div aria-live="polite" className={`rounded-xl border-l-4 p-4 ${outside ? "border-gris-oscuro bg-claro" : solids ? "border-azul bg-azul/5" : "border-rojo bg-rojo/5"}`}>
                <b className="block font-serif text-xl leading-snug">
                  {outside
                    ? tr(`Ninguna prueba de NASA por debajo de ${num(minO2, 0)} % de O₂`, `No NASA test below ${num(minO2, 0)} % O₂`)
                    : solids
                      ? tr(`NASA probó materiales sólidos cerca de ${o2} % de O₂`, `NASA tested solid materials near ${o2} % O₂`)
                      : tr(`Ninguna prueba de NASA con sólidos a ${o2} % de O₂`, `No NASA test of solids at ${o2} % O₂`)}
                </b>
                {outside && (
                  <small className="mt-1 block text-gris-oscuro">
                    {tr(
                      "Aquí no sabemos si la llama se apaga: eso depende del material, la presión, el flujo y la gravedad. Por eso la cámara la muestra tenue.",
                      "Here we don't know whether the flame goes out: that depends on the material, pressure, flow and gravity. That's why the camera shows it faint.",
                    )}
                  </small>
                )}
                {maxSolidO2 != null && !outside && (
                  <small className="mt-1 block text-gris-oscuro">
                    {tr("Máximo probado con sólidos en microgravedad (PSI)", "Highest tested with solids in microgravity (PSI)")}: <b className="text-noche">{num(maxSolidO2, 1)} %</b>.{" "}
                    {tr("Base lunar: 30 % o más.", "Moon base: 30 % or more.")}
                  </small>
                )}
              </div>
            )}

            {closest.length > 0 && (
              <div>
                <small className="mb-2 block text-xs uppercase tracking-wide text-gris-oscuro">{tr("Pruebas reales más parecidas", "Closest real tests")}</small>
                <ul className="divide-y divide-linea rounded-xl border border-linea">
                  {closest.map(({ t, mid, f }) => (
                    <li key={t.id} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                      <span>
                        <b>{t.accession}</b> · {t.fuel}
                        <small className="block text-gris-oscuro">{label(FUEL_CLASS_LABEL, t.fuel_class)}{t.outcome ? ` · ${label(OUTCOME_LABEL, t.outcome)}` : ""}</small>
                      </span>
                      <span className={`shrink-0 text-right text-gris-oscuro ${MONO} text-xs`}>
                        {num(mid, 1)} % O₂
                        <span className="block">{f != null ? `${num(f, 1)} cm/s` : tr("flujo s/d", "flow n/a")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {compare && (
              <p className="text-sm text-gris-oscuro">
                {tr(
                  "La Luna (0,16 g) queda entre estos dos extremos: según el reto, los resultados en microgravedad y en 1 g “could bound” lo que pasa en gravedad intermedia. PSI todavía no tiene datos de gravedad parcial.",
                  "The Moon (0.16 g) sits between these two extremes: as the challenge puts it, microgravity and normal-gravity results “could bound” what happens at intermediate gravity. PSI has no partial-gravity data yet.",
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <Card title={tr("¿La NASA probó estas condiciones?", "Did NASA test these conditions?")}>
          {loading && <Loading />}
          <ErrorBox error={error} />
          {data && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {solids > 0 ? (
                  <Tag tone="azul">{tr(`Hay pruebas con sólidos a ${o2} % de O₂`, `There are tests with solids at ${o2} % O₂`)}</Tag>
                ) : (
                  <Tag tone="rojo">{tr(`Sin pruebas con materiales sólidos a ${o2} % de O₂`, `No tests with solid materials at ${o2} % O₂`)}</Tag>
                )}
                <Tag>{tr(`${nearO2.length} pruebas con oxígeno cercano`, `${nearO2.length} tests with similar oxygen`)}</Tag>
                <Tag>{tr(`${nearBoth.length} con flujo cercano también`, `${nearBoth.length} also with similar flow`)}</Tag>
              </div>
              <p className="text-gris-oscuro">
                {Object.entries(byClass).length
                  ? Object.entries(byClass)
                      .map(([k, v]) => `${label(FUEL_CLASS_LABEL, k)}: ${v}`)
                      .join(" · ")
                  : tr("Ninguna prueba de PSI registra este nivel de oxígeno", "No PSI test reports this oxygen level")}
                .
                {maxSolidO2 != null && o2 > maxSolidO2 + O2_NEAR && (
                  <>
                    {" "}
                    {tr(
                      "En los datos de microgravedad de PSI, el oxígeno más alto probado con un material sólido es",
                      "In PSI microgravity data, the highest oxygen tested with a solid material is",
                    )}{" "}
                    <b className="text-noche">{num(maxSolidO2, 1)} %</b>.
                  </>
                )}
              </p>
              <p className="text-gris-oscuro">
                {gravity && !compare
                  ? tr(
                      "La llama en 1 g es la referencia terrestre: con flotación, el aire caliente sube (la columna sobre la llama) y la llama se alarga y parpadea.",
                      "The 1 g flame is the Earth reference: with buoyancy, hot air rises (the column above the flame) and the flame stretches and flickers.",
                    )
                  : tr(
                      "Las pruebas de PSI se hicieron en microgravedad: sin flotación no hay columna de aire caliente, y el oxígeno solo llega por difusión o por la ventilación.",
                      "PSI tests were run in microgravity: without buoyancy there is no rising hot-air column, and oxygen only arrives by diffusion or ventilation.",
                    )}{" "}
                {tr(
                  "La Luna (0,16 g) queda entre los dos extremos: los resultados en microgravedad y en 1 g la acotan, pero PSI todavía no tiene datos de gravedad parcial.",
                  "The Moon (0.16 g) sits between the two extremes: microgravity and 1 g results bound it, but PSI has no partial-gravity data yet.",
                )}
              </p>
              <Note>
                {tr(
                  `Se cuentan las pruebas cuyo rango incluye el valor elegido (±${O2_NEAR} puntos de O₂ y ±${FLOW_NEAR} cm/s de flujo). Fuente: tablas experimentales de NASA PSI.`,
                  `Counts tests whose range includes the chosen value (±${O2_NEAR} O₂ points and ±${FLOW_NEAR} cm/s of flow). Source: NASA PSI experimental tables.`,
                )}
              </Note>
            </div>
          )}
        </Card>
        <Card title={tr("Cómo leer la cámara", "How to read the camera")}>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gris-oscuro">
            <li>{tr("En microgravedad la llama de una vela es casi esférica, azul y tenue; en la Tierra es alargada y amarilla (fotos de NASA abajo).", "In microgravity a candle flame is nearly spherical, blue and dim; on Earth it is elongated and yellow (NASA photos below).")}</li>
            <li>{tr("El amarillo viene del hollín caliente; más oxígeno, llama más grande y brillante.", "The yellow comes from hot soot; more oxygen means a bigger, brighter flame.")}</li>
            <li>{tr("En 1 g el aire caliente sube sobre la llama: por eso el fondo se ve ondulado arriba. En 0 g esa columna no existe.", "In 1 g hot air rises above the flame, which is why the background ripples above it. In 0 g that column does not exist.")}</li>
            <li>{tr("Las líneas horizontales que avanzan son el flujo de aire; la línea vertical es la fibra que sostiene la gota de combustible.", "The moving horizontal lines are the air flow; the vertical line is the fiber holding the fuel droplet.")}</li>
            <li>{tr("No calcula temperaturas ni límites de extinción: para eso están las pruebas reales.", "It does not compute temperatures or extinction limits: that is what the real tests are for.")}</li>
          </ul>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Figure media={MEDIA.velaTierra} imgClassName="aspect-[3/4] object-contain" />
        <Figure media={MEDIA.velaMicro} imgClassName="aspect-[3/4] object-contain" />
      </div>
      <div className="mt-8">
        <AskButton
          question={tr(
            "¿Cómo cambia una llama con la gravedad, el oxígeno y el flujo de aire, según los experimentos de la NASA?",
            "How does a flame change with gravity, oxygen and air flow, according to NASA experiments?",
          )}
        />
      </div>
      <CrossLink
        text={tr("¿Qué pasa en las pruebas reales cuando sube el oxígeno?", "What happens in real tests when oxygen goes up?")}
        to="oxigeno"
        button={tr("Concentración de oxígeno", "Oxygen concentration")}
      />
    </Page>
  );
}
