export const LANGS = ["es", "en"];

let current = "es";

export function setLang(lang) {
  current = LANGS.includes(lang) ? lang : "es";
}

export function getLang() {
  return current;
}

export function tr(es, en) {
  return current === "en" ? en : es;
}

export function pick(value) {
  return Array.isArray(value) ? tr(value[0], value[1]) : value;
}

export function initialLang() {
  try {
    const saved = localStorage.getItem("idioma");
    if (LANGS.includes(saved)) return saved;
  } catch {
    return "es";
  }
  return (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
}
