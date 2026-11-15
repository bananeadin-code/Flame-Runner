import { pick } from "./i18n";

const FIRE = ["Dashboard · Fuego en microgravedad", "Dashboard · Fire in microgravity"];
const DATA = ["Dashboard · Datos de la investigación", "Dashboard · Research data"];
const HOME = "Flame Runner";
const MISSION = ["Misión", "Mission"];

export const PAGES = {
  inicio: { title: HOME },
  intro: { title: ["Introducción", "Introduction"], parent: HOME },
  riesgos: { title: ["Brechas y prioridades", "Gaps and priorities"], parent: MISSION },
  recomendacion: { title: ["Qué dice la evidencia", "What the evidence says"], parent: MISSION },
  prototipos: { title: ["Extintores y agentes", "Extinguishers and agents"], parent: MISSION },
  viento: { title: ["Flujo y ventilación", "Flow and ventilation"], parent: FIRE },
  oxigeno: { title: ["Concentración de oxígeno", "Oxygen concentration"], parent: FIRE },
  sensores: { title: ["Detección", "Detection"], parent: FIRE },
  comparacion: { title: ["Tierra frente a espacio", "Earth versus space"], parent: FIRE },
  investigaciones: { title: ["Investigaciones", "Investigations"], parent: DATA },
  pruebas: { title: ["Resultados de pruebas", "Test results"], parent: DATA },
  ambiente: { title: ["Ambiente operativo", "Operating environment"], parent: DATA },
  mediciones: { title: ["Mediciones", "Measurements"], parent: DATA },
  publicaciones: { title: ["Documentos y publicaciones", "Documents and publications"], parent: DATA },
  historia: { title: ["Historia", "History"], parent: HOME },
};

export const pageTitle = (id) => pick(PAGES[id].title);
export const pageParent = (id) => pick(PAGES[id].parent || HOME);

export const ORDER = Object.keys(PAGES);

const FIRE_IDS = ["viento", "oxigeno", "sensores", "comparacion"];
const DATA_IDS = ["investigaciones", "pruebas", "ambiente", "mediciones", "publicaciones"];
const MISSION_IDS = ["riesgos", "recomendacion", "prototipos"];

export const MENU = [
  [["Introducción", "Introduction"], ["intro"]],
  [MISSION, MISSION_IDS],
  [["Fuego en microgravedad", "Fire in microgravity"], FIRE_IDS],
  [["Datos de la investigación", "Research data"], DATA_IDS],
  [["Historia", "History"], ["historia"]],
];

export const NAV = [
  ["intro", ["Introducción", "Introduction"], ["intro"]],
  ["riesgos", MISSION, MISSION_IDS],
  ["viento", ["Dashboard", "Dashboard"], [...FIRE_IDS, ...DATA_IDS]],
  ["historia", ["Historia", "History"], ["historia"]],
];

export const TABS = [
  [["Fuego en microgravedad", "Fire in microgravity"], FIRE_IDS],
  [["Datos de la investigación", "Research data"], DATA_IDS],
];
