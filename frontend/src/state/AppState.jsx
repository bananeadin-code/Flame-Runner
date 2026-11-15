import { useCallback, useEffect, useMemo, useState } from "react";
import { AppContext } from "./context";
import { useApi } from "../lib/useApi";
import { initialLang, pick, setLang as applyLang, tr } from "../lib/i18n";
import { SCENARIO_TEXT } from "../content/narrative";

function stored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    return;
  }
}

export function AppProvider({ children }) {
  const { data: rawScenarios } = useApi("/api/scenarios");
  const [lang, setLangState] = useState(initialLang);
  const [scenarioId, setScenarioId] = useState(() => stored("escenario", "lunar"));
  const [area, setAreaState] = useState(() => stored("area", ""));
  const [search, setSearch] = useState(null);
  const [source, setSource] = useState(null);
  applyLang(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = tr("Flame Runner · Fuego en el espacio", "Flame Runner · Fire in space");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        tr(
          "Cómo arde, se detecta y se apaga el fuego en microgravedad: datos reales de la NASA con cada fuente verificada.",
          "How fire burns, is detected and is put out in microgravity: real NASA data with every source verified.",
        ),
      );
  }, [lang]);

  const setLang = useCallback((value) => {
    setLangState(value);
    store("idioma", value);
  }, []);

  const setScenario = useCallback((id) => {
    setScenarioId(id);
    store("escenario", id);
  }, []);

  const setArea = useCallback((value) => {
    setAreaState(value);
    store("area", value);
  }, []);

  const value = useMemo(() => {
    const scenarios = (rawScenarios || []).map((s) =>
      SCENARIO_TEXT[s.id] ? { ...s, name: pick(SCENARIO_TEXT[s.id].name), notes: pick(SCENARIO_TEXT[s.id].notes) } : s,
    );
    return {
      lang,
      setLang,
      scenarios,
      scenario: scenarios.find((s) => s.id === scenarioId) || null,
      scenarioId,
      setScenario,
      area,
      setArea,
      search,
      openSearch: (initial = { text: "", ask: false }) => setSearch(initial),
      closeSearch: () => setSearch(null),
      source,
      openSource: (ref) => setSource(ref),
      closeSource: () => setSource(null),
    };
  }, [lang, setLang, rawScenarios, scenarioId, setScenario, area, setArea, search, source]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
