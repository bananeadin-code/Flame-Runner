import { useEffect, useState } from "react";
import { useApp } from "../state/context";
import { Link } from "./Link";
import { MENU, NAV, ORDER, TABS, pageParent, pageTitle } from "../lib/pages";
import { pick, tr } from "../lib/i18n";
import { AREA_LABEL, AREAS, label, num } from "../lib/format";
import { Chip } from "./ui";

export function ScenarioSelect({ dark = false, showLabel = false }) {
  const { scenarios, scenarioId, setScenario } = useApp();
  return (
    <label className={`flex items-center gap-2 text-sm ${dark ? "text-white" : "text-noche"}`}>
      <span className={showLabel ? "text-xs uppercase tracking-wide text-gris-oscuro" : "hidden xl:inline"}>{tr("Escenario", "Scenario")}</span>
      <select
        value={scenarioId}
        onChange={(e) => setScenario(e.target.value)}
        className={`w-32 max-w-[11rem] rounded-full border px-2 py-1.5 text-sm outline-none min-[400px]:w-40 sm:w-auto sm:max-w-none lg:max-w-[13rem] xl:max-w-none sm:px-3 ${dark ? "border-white/30 bg-noche/60 text-white" : "border-linea bg-white"}`}
        aria-label={tr("Escenario de misión", "Mission scenario")}
      >
        {scenarios.map((s) => (
          <option key={s.id} value={s.id} className="text-noche">
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LangToggle({ dark = false }) {
  const { lang, setLang } = useApp();
  return (
    <div className={`flex shrink-0 rounded-full border p-0.5 text-xs font-semibold ${dark ? "border-white/30" : "border-linea"}`} role="group" aria-label={tr("Idioma", "Language")}>
      {[
        ["es", "ES", "Español"],
        ["en", "EN", "English"],
      ].map(([id, short, name]) => (
        <button
          key={id}
          onClick={() => setLang(id)}
          aria-pressed={lang === id}
          aria-label={name}
          lang={id}
          className={`rounded-full px-2 py-1 transition ${lang === id ? (dark ? "bg-white text-noche" : "bg-noche text-white") : dark ? "text-white/80 hover:text-white" : "text-gris-oscuro hover:text-noche"}`}
        >
          {short}
        </button>
      ))}
    </div>
  );
}

export function Header({ route, onMenu }) {
  const { openSearch } = useApp();
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const home = route === "inicio";
  return (
    <header
      className={`z-30 flex w-full items-center gap-2 px-3 text-white transition-all duration-500 sm:gap-3 sm:px-5 lg:gap-6 lg:px-8 ${
        home && !stuck ? "absolute top-0 h-20 bg-gradient-to-b from-noche to-transparent" : "sticky top-0 h-16 bg-noche/95 shadow-[0_1px_0_rgba(255,255,255,.08)] backdrop-blur"
      }`}
    >
      <button onClick={onMenu} className="grid shrink-0 gap-1.5 p-2" aria-label={tr("Abrir menú", "Open menu")}>
        <i className="block h-0.5 w-6 bg-white" />
        <i className="block h-0.5 w-6 bg-white" />
        <i className="block h-0.5 w-6 bg-white" />
      </button>
      <Link to="inicio" className="hidden shrink-0 font-serif text-lg leading-none font-semibold sm:block">
        Flame
        <br />
        Runner
      </Link>
      <nav className="mx-auto hidden gap-5 lg:flex xl:gap-6" aria-label={tr("Principal", "Main")}>
        {NAV.map(([to, text, group]) => (
          <Link
            key={to}
            to={to}
            className={`relative py-1 text-[0.95rem] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:transition-transform after:duration-500 hover:after:scale-x-100 ${
              group.includes(route) ? "after:scale-x-100 after:bg-azul-claro" : "after:scale-x-0 after:bg-rojo"
            }`}
          >
            {pick(text)}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3 lg:ml-0">
        <ScenarioSelect dark />
        <LangToggle dark />
        <button
          onClick={() => openSearch()}
          className="flex shrink-0 items-center gap-2 rounded-full border border-white/30 p-2 text-sm transition hover:bg-white/10 sm:px-3 sm:py-1.5"
          aria-label={tr("Buscar o preguntar", "Search or ask")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="7" />
            <path d="M16 16l5 5" />
          </svg>
          <span className="hidden md:inline lg:hidden xl:inline">{tr("Buscar o preguntar", "Search or ask")}</span>
        </button>
      </div>
    </header>
  );
}

export function Menu({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-noche p-6 text-white animate-aparecer sm:p-8" role="dialog" aria-label={tr("Menú", "Menu")}>
      <div className="flex items-center justify-between gap-4">
        <LangToggle dark />
        <button onClick={onClose} className="text-4xl leading-none" aria-label={tr("Cerrar", "Close")}>
          ×
        </button>
      </div>
      <div className="mx-auto mt-10 grid max-w-6xl gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 xl:grid-cols-6">
        {MENU.map(([title, ids]) => (
          <div key={title[0]}>
            <h3 className="mb-4 border-b border-white/15 pb-2 text-xl text-azul-palido">{pick(title)}</h3>
            {ids.map((id) => (
              <Link key={id} to={id} onClick={onClose} className="block py-1.5 text-white/85 hover:text-white">
                {pageTitle(id)}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AreaFilter() {
  const { area, setArea } = useApp();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={tr("Filtrar por área", "Filter by area")}>
      <Chip active={!area} onClick={() => setArea("")} tone="azul">
        {tr("Todas las áreas", "All areas")}
      </Chip>
      {AREAS.map((a) => (
        <Chip key={a} active={area === a} onClick={() => setArea(a)} tone="azul">
          {label(AREA_LABEL, a)}
        </Chip>
      ))}
    </div>
  );
}

export function MissionBar({ showArea = true }) {
  const { scenario } = useApp();
  return (
    <div className="my-6 flex flex-col gap-4 rounded-xl border border-linea bg-claro/50 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="text-sm">
        <span className="text-gris-oscuro">{tr("Analizando para ", "Analyzing for ")}</span>
        <b>{scenario?.name || "—"}</b>
        {scenario && (
          <span className="text-gris-oscuro">
            {" "}
            · {num(scenario.o2_fraction * 100, 1)} % O₂ · {num(scenario.pressure_kpa)} kPa · {num(scenario.gravity_g, undefined, 3)} g
          </span>
        )}
      </div>
      {showArea && <AreaFilter />}
    </div>
  );
}

export function Page({ route, children, tabs = false }) {
  const index = ORDER.indexOf(route);
  const prev = ORDER[index - 1];
  const next = ORDER[index + 1];
  return (
    <>
      <section className="bg-gradient-to-br from-azul-claro via-azul to-noche-2 px-4 pt-10 pb-8 text-white sm:px-5 sm:pt-14 sm:pb-10 md:px-8">
        <div className="mx-auto max-w-6xl animate-subir">
          <small className="text-sm text-white/75">{pageParent(route)}</small>
          <h1 className="mt-2 text-3xl break-words sm:text-4xl md:text-6xl">{pageTitle(route)}</h1>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10 md:px-8">
        {tabs && (
          <div className="mb-8 space-y-3">
            {TABS.map(([group, ids]) => (
              <div key={group[0]} className="flex flex-col gap-2 md:flex-row md:items-center">
                <small className="w-52 shrink-0 text-xs uppercase tracking-wide text-gris-oscuro">{pick(group)}</small>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                  {ids.map((id) => (
                    <Link
                      key={id}
                      to={id}
                      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm whitespace-nowrap transition ${id === route ? "border-rojo bg-rojo text-white" : "border-linea hover:border-noche"}`}
                    >
                      {pageTitle(id)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div key={route} className="animate-aparecer">
          {children}
        </div>
        <div className="mt-16 flex flex-wrap justify-between gap-3 border-t border-linea pt-6">
          {prev ? (
            <Link to={prev} className="rounded-full border border-noche px-5 py-2 text-sm hover:bg-noche hover:text-white">
              ← {pageTitle(prev)}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={next} className="rounded-full bg-rojo px-5 py-2 text-sm text-white hover:bg-rojo/85">
              {pageTitle(next)} →
            </Link>
          ) : (
            <Link to="inicio" className="rounded-full bg-rojo px-5 py-2 text-sm text-white">
              {tr("Volver al inicio", "Back to home")}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export function CrossLink({ text, to, button }) {
  return (
    <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-xl bg-noche p-5 text-white sm:p-6 md:flex-row md:items-center">
      <span className="font-serif text-xl">{text}</span>
      <Link to={to} className="shrink-0 rounded-full bg-azul px-5 py-2 text-sm hover:bg-azul-claro">
        {button}
      </Link>
    </div>
  );
}

export function AskButton({ question, children }) {
  const { openSearch } = useApp();
  return (
    <button onClick={() => openSearch({ text: question, ask: true })} className="inline-flex items-center gap-2 rounded-full bg-noche px-5 py-2.5 text-left text-sm text-white transition hover:bg-noche-2">
      <span aria-hidden="true">✦</span> {children || tr("Preguntar al asistente de evidencia", "Ask the evidence assistant")}
    </button>
  );
}
