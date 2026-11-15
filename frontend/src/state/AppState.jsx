import { useCallback, useMemo, useState } from "react";
import { AppContext } from "./context";
import { useApi } from "../lib/useApi";

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
  const { data: scenarios } = useApi("/api/scenarios");
  const [scenarioId, setScenarioId] = useState(() => stored("escenario", "lunar"));
  const [area, setAreaState] = useState(() => stored("area", ""));
  const [search, setSearch] = useState(null);
  const [source, setSource] = useState(null);

  const setScenario = useCallback((id) => {
    setScenarioId(id);
    store("escenario", id);
  }, []);

  const setArea = useCallback((value) => {
    setAreaState(value);
    store("area", value);
  }, []);

  const value = useMemo(() => {
    const scenario = scenarios?.find((s) => s.id === scenarioId) || null;
    return {
      scenarios: scenarios || [],
      scenario,
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
  }, [scenarios, scenarioId, setScenario, area, setArea, search, source]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
