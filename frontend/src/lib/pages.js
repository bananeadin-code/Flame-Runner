export const PAGES = {
  inicio: { title: "Fuego en el espacio" },
  intro: { title: "Introducción", parent: "Fuego en el espacio" },
  riesgos: { title: "Brechas y prioridades", parent: "Misión" },
  recomendacion: { title: "Qué dice la evidencia", parent: "Misión" },
  prototipos: { title: "Extintores y agentes", parent: "Misión" },
  viento: { title: "Flujo y ventilación", parent: "Dashboard · Fuego en microgravedad", group: "fuego" },
  oxigeno: { title: "Concentración de oxígeno", parent: "Dashboard · Fuego en microgravedad", group: "fuego" },
  sensores: { title: "Detección", parent: "Dashboard · Fuego en microgravedad", group: "fuego" },
  comparacion: { title: "Tierra frente a espacio", parent: "Dashboard · Fuego en microgravedad", group: "fuego" },
  investigaciones: { title: "Investigaciones", parent: "Dashboard · Datos de la investigación", group: "datos" },
  pruebas: { title: "Resultados de pruebas", parent: "Dashboard · Datos de la investigación", group: "datos" },
  ambiente: { title: "Ambiente operativo", parent: "Dashboard · Datos de la investigación", group: "datos" },
  mediciones: { title: "Mediciones", parent: "Dashboard · Datos de la investigación", group: "datos" },
  publicaciones: { title: "Documentos y publicaciones", parent: "Dashboard · Datos de la investigación", group: "datos" },
  historia: { title: "Historia", parent: "Fuego en el espacio" },
};

export const ORDER = Object.keys(PAGES);

export const MENU = [
  ["Introducción", ["intro"]],
  ["Misión", ["riesgos", "recomendacion", "prototipos"]],
  ["Fuego en microgravedad", ["viento", "oxigeno", "sensores", "comparacion"]],
  ["Datos de la investigación", ["investigaciones", "pruebas", "ambiente", "mediciones", "publicaciones"]],
  ["Historia", ["historia"]],
];

export const NAV = [
  ["intro", "Introducción", ["intro"]],
  ["riesgos", "Misión", ["riesgos", "recomendacion", "prototipos"]],
  ["viento", "Dashboard", ["viento", "oxigeno", "sensores", "comparacion", "investigaciones", "pruebas", "ambiente", "mediciones", "publicaciones"]],
  ["historia", "Historia", ["historia"]],
];

export const TABS = [
  ["Fuego en microgravedad", ["viento", "oxigeno", "sensores", "comparacion"]],
  ["Datos de la investigación", ["investigaciones", "pruebas", "ambiente", "mediciones", "publicaciones"]],
];
