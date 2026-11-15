// Secuencia de la "llama fría" que descubrió FLEX en la Estación Espacial (ilustración, tiempos no reales).
// Fuente: NASA, A Researcher's Guide to Combustion Science (2015), pp. 33-34: la llama caliente de una gota
// se apaga por pérdidas de radiación, pero la gota sigue evaporándose sostenida por una llama fría que se forma
// después de la extinción visible; cuando la llama fría se apaga, la evaporación se detiene y queda una nube de vapor.
// Temperatura de las llamas frías: 500-1000 K (ficha de CFI-G, PSI-159).

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// [español, inglés]
export const COOL_FLAME_PHASES = {
  hot: ["LLAMA CALIENTE · GOTA DE COMBUSTIBLE (FLEX)", "HOT FLAME · FUEL DROPLET (FLEX)"],
  out: ["LA LLAMA VISIBLE SE APAGA", "THE VISIBLE FLAME GOES OUT"],
  cool: ["LLAMA FRÍA · CASI INVISIBLE · 500–1000 K", "COOL FLAME · NEARLY INVISIBLE · 500–1000 K"],
  end: ["SE APAGA LA LLAMA FRÍA · QUEDA UNA NUBE DE VAPOR", "THE COOL FLAME GOES OUT · A VAPOR CLOUD REMAINS"],
};

// ms: tiempo desde que empezó la secuencia. Devuelve cuánto se ve cada parte (0 a 1) y la fase.
export function coolFlameState(ms) {
  const s = ms / 1000;
  return {
    hot: s < 2.5 ? 1 : clamp01(1 - (s - 2.5)),
    cool: s < 3.2 ? 0 : s < 10 ? clamp01(s - 3.2) : clamp01(1 - (s - 10)),
    vapor: clamp01((s - 3.5) / 7),
    // la gota se sigue evaporando durante la llama fría y se detiene en un tamaño finito
    drop: 1 - 0.32 * clamp01(s / 10),
    phase: s < 2.5 ? "hot" : s < 3.5 ? "out" : s < 10 ? "cool" : "end",
  };
}

export const NO_COOL_FLAME = { hot: 1, cool: 0, vapor: 0, drop: 1, phase: null };
