import { useEffect, useState } from "react";
import { useApp } from "../state/context";
import { Link } from "./Link";
import { MENU, NAV, ORDER, PAGES, TABS } from "../lib/pages";
import { AREA_LABEL, AREAS, label } from "../lib/format";
import { Chip } from "./ui";

export function ScenarioSelect({ dark = false }) {
  const { scenarios, scenarioId, setScenario } = useApp();
  return (
    <label className={`flex items-center gap-2 text-sm ${dark ? "text-white" : "text-noche"}`}>
      <span className="hidden lg:inline">Escenario</span>
      <select
        value={scenarioId}
        onChange={(e) => setScenario(e.target.value)}
        className={`w-36 rounded-full border px-2 py-1.5 text-sm outline-none sm:w-auto sm:px-3 ${dark ? "border-white/30 bg-noche/60 text-white" : "border-linea bg-white"}`}
        aria-label="Escenario de misión"
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
      className={`z-30 flex w-full items-center gap-2 px-3 text-white sm:gap-4 sm:px-5 transition-all duration-500 md:gap-8 md:px-8 ${
        home && !stuck ? "absolute top-0 h-20 bg-gradient-to-b from-noche to-transparent" : "sticky top-0 h-16 bg-noche/95 shadow-[0_1px_0_rgba(255,255,255,.08)] backdrop-blur"
      }`}
    >
      <button onClick={onMenu} className="grid shrink-0 gap-1.5 p-2" aria-label="Abrir menú">
        <i className="block h-0.5 w-6 bg-white" />
        <i className="block h-0.5 w-6 bg-white" />
        <i className="block h-0.5 w-6 bg-white" />
      </button>
      <Link to="inicio" className="hidden font-serif text-lg leading-none font-semibold min-[420px]:block">
        Fuego
        <br />
        en el espacio
      </Link>
      <nav className="mx-auto hidden gap-7 md:flex" aria-label="Principal">
        {NAV.map(([to, text, group]) => (
          <Link
            key={to}
            to={to}
            className={`relative py-1 text-[0.95rem] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:transition-transform after:duration-500 hover:after:scale-x-100 ${
              group.includes(route) ? "after:scale-x-100 after:bg-azul-claro" : "after:scale-x-0 after:bg-rojo"
            }`}
          >
            {text}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3 md:ml-0">
        <ScenarioSelect dark />
        <button onClick={() => openSearch()} className="flex shrink-0 items-center gap-2 rounded-full border border-white/30 px-2.5 py-1.5 text-sm transition hover:bg-white/10 sm:px-3" aria-label="Buscar o preguntar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="10.5" cy="10.5" r="7" />
            <path d="M16 16l5 5" />
          </svg>
          <span className="hidden sm:inline">Buscar o preguntar</span>
        </button>
      </div>
    </header>
  );
}

export function Menu({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-noche p-8 text-white animate-aparecer" role="dialog" aria-label="Menú">
      <button onClick={onClose} className="absolute top-5 right-6 text-4xl" aria-label="Cerrar">
        ×
      </button>
      <div className="mx-auto mt-12 grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-5">
        {MENU.map(([title, ids]) => (
          <div key={title}>
            <h3 className="mb-4 border-b border-white/15 pb-2 text-xl text-azul-palido">{title}</h3>
            {ids.map((id) => (
              <Link key={id} to={id} onClick={onClose} className="block py-1.5 text-white/85 hover:text-white">
                {PAGES[id].title}
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
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por área">
      <Chip active={!area} onClick={() => setArea("")} tone="azul">
        Todas las áreas
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
    <div className="my-6 flex flex-col gap-4 rounded-xl border border-linea bg-claro/50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm">
        <span className="text-gris-oscuro">Analizando para </span>
        <b>{scenario?.name || "—"}</b>
        {scenario && (
          <span className="text-gris-oscuro">
            {" "}
            · {Math.round(scenario.o2_fraction * 1000) / 10} % O₂ · {scenario.pressure_kpa} kPa · {scenario.gravity_g} g
          </span>
        )}
      </div>
      {showArea && <AreaFilter />}
    </div>
  );
}

export function Page({ route, children, tabs = false }) {
  const page = PAGES[route];
  const index = ORDER.indexOf(route);
  const prev = ORDER[index - 1];
  const next = ORDER[index + 1];
  return (
    <>
      <section className="bg-gradient-to-br from-azul-claro via-azul to-noche-2 px-5 pt-14 pb-10 text-white md:px-8">
        <div className="mx-auto max-w-6xl animate-subir">
          <small className="text-sm text-white/75">{page.parent || "Fuego en el espacio"}</small>
          <h1 className="mt-2 text-4xl md:text-6xl">{page.title}</h1>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        {tabs && (
          <div className="mb-8 space-y-3">
            {TABS.map(([group, ids]) => (
              <div key={group} className="flex flex-col gap-2 md:flex-row md:items-center">
                <small className="w-52 shrink-0 text-xs uppercase tracking-wide text-gris-oscuro">{group}</small>
                <div className="flex flex-wrap gap-2">
                  {ids.map((id) => (
                    <Link
                      key={id}
                      to={id}
                      className={`rounded-full border px-4 py-1.5 text-sm transition ${id === route ? "border-rojo bg-rojo text-white" : "border-linea hover:border-noche"}`}
                    >
                      {PAGES[id].title}
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
              ← {PAGES[prev].title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link to={next} className="rounded-full bg-rojo px-5 py-2 text-sm text-white hover:bg-rojo/85">
              {PAGES[next].title} →
            </Link>
          ) : (
            <Link to="inicio" className="rounded-full bg-rojo px-5 py-2 text-sm text-white">
              Volver al inicio
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export function CrossLink({ text, to, button }) {
  return (
    <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-xl bg-noche p-6 text-white md:flex-row md:items-center">
      <span className="font-serif text-xl">{text}</span>
      <Link to={to} className="rounded-full bg-azul px-5 py-2 text-sm hover:bg-azul-claro">
        {button}
      </Link>
    </div>
  );
}

export function AskButton({ question, children }) {
  const { openSearch } = useApp();
  return (
    <button onClick={() => openSearch({ text: question, ask: true })} className="inline-flex items-center gap-2 rounded-full bg-noche px-5 py-2.5 text-sm text-white transition hover:bg-noche-2">
      <span aria-hidden="true">✦</span> {children || "Preguntar al asistente"}
    </button>
  );
}
