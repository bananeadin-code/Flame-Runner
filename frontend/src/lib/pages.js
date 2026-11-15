import { pick } from "./i18n";

const FIRE = ["Dashboard · Fuego en microgravedad", "Dashboard · Fire in microgravity"];
const DATA = ["Dashboard · Datos de la investigación", "Dashboard · Research data"];
const HOME = "Flame Runner";
const MISSION = ["Misión", "Mission"];
const RANK = ["Investigaciones relevantes", "Relevant investigations"];

export const PAGES = {
  inicio: { title: HOME },
  intro: { title: ["Introducción", "Introduction"], parent: HOME },
  riesgos: { title: ["Brechas y prioridades", "Gaps and priorities"], parent: MISSION },
  recomendacion: { title: ["Qué dice la evidencia", "What the evidence says"], parent: MISSION },
  prototipos: { title: ["Extintores y agentes", "Extinguishers and agents"], parent: MISSION },
  aplicaciones: { title: ["Equipos y aplicaciones en la Tierra", "Equipment and Earth applications"], parent: MISSION },
  ranking: { title: ["Ranking por escenario", "Ranking by scenario"], parent: RANK },
  comparar: { title: ["Comparar investigaciones", "Compare investigations"], parent: RANK },
  simulador: { title: ["Simulador de llama", "Flame simulator"], parent: FIRE },
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

const FIRE_IDS = ["simulador", "viento", "oxigeno", "sensores", "comparacion"];
const DATA_IDS = ["investigaciones", "pruebas", "ambiente", "mediciones", "publicaciones"];
const MISSION_IDS = ["riesgos", "recomendacion", "prototipos", "aplicaciones"];
export const RANK_IDS = ["ranking", "comparar"];

export const MENU = [
  [["Introducción", "Introduction"], ["intro"]],
  [MISSION, MISSION_IDS],
  [RANK, RANK_IDS],
  [["Fuego en microgravedad", "Fire in microgravity"], FIRE_IDS],
  [["Datos de la investigación", "Research data"], DATA_IDS],
  [["Historia", "History"], ["historia"]],
];

export const NAV = [
  ["intro", ["Introducción", "Introduction"], ["intro"]],
  ["riesgos", MISSION, MISSION_IDS],
  ["ranking", ["Ranking", "Ranking"], RANK_IDS],
  ["simulador", ["Dashboard", "Dashboard"], [...FIRE_IDS, ...DATA_IDS]],
  ["historia", ["Historia", "History"], ["historia"]],
];

export const TABS = [
  [["Fuego en microgravedad", "Fire in microgravity"], FIRE_IDS],
  [["Datos de la investigación", "Research data"], DATA_IDS],
];
