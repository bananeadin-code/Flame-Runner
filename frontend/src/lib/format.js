export const AREAS = ["prevention", "detection", "suppression", "fundamental"];

export const AREA_LABEL = {
  prevention: "Prevención",
  detection: "Detección",
  suppression: "Supresión",
  fundamental: "Ciencia base",
};

export const FUEL_CLASS_LABEL = {
  solid: "Materiales sólidos",
  droplet: "Gotas de combustible",
  gas: "Llamas de gas",
  aerosol: "Humo y aerosoles",
};

export const FINDING_TYPE_LABEL = {
  quantitative: "Cuantitativo",
  qualitative: "Cualitativo",
  gap: "Hueco de conocimiento",
};

export const OUTCOME_LABEL = {
  extinguished: "Extinguida",
  self_extinguished: "Se apagó sola",
  flow_terminated: "Flujo cortado",
  disrupted: "Interrumpida",
  completion: "Completada",
};

export const GRAVITY_LABEL = {
  microgravity: "Microgravedad",
  partial_gravity: "Gravedad parcial",
  normal_gravity: "Gravedad terrestre",
  unspecified: "Sin especificar",
};

export const DOC_TYPE_LABEL = {
  report: "Informes",
  science_document: "Documentos científicos",
  fact_sheet: "Fichas NASA",
  guide: "Guías",
  web_page: "Páginas web",
  presentation: "Presentaciones",
  engineering_document: "Ingeniería",
  reference: "Referencia",
  analyzed_data: "Datos analizados",
  raw_data: "Datos y artículos",
  metadata: "Metadatos",
  other: "Otros",
};

export const QUANTITY_LABEL = {
  adiabatic_flame_temperature: "Temperatura adiabática de llama",
  stoichiometric_mixture_fraction: "Fracción de mezcla estequiométrica",
  nozzle_diameter: "Diámetro de boquilla",
  fuel_mass_flow: "Caudal de combustible",
  peak_burner_temperature: "Temperatura máxima del quemador",
  initial_droplet_diameter: "Diámetro inicial de gota",
  burning_rate: "Tasa de combustión",
  extinction_diameter: "Diámetro de extinción",
  flames_ignited: "Llamas encendidas",
  final_o2_percent: "O₂ final",
  initial_co2_percent: "CO₂ inicial",
  final_co2_percent: "CO₂ final",
  initial_co_ppm: "CO inicial",
  final_co_ppm: "CO final",
  sample_thickness: "Espesor de muestra",
  sample_length: "Largo de muestra",
  sample_width: "Ancho de muestra",
  ignition_power: "Potencia de ignición",
  ignition_time: "Tiempo de ignición",
  smoke_ratio_rt_r0: "Relación de humo Rt/R0",
  duration: "Duración",
  net_aging_time: "Tiempo de envejecimiento",
  weight_loss_rate: "Pérdida de masa",
  aging_duration: "Envejecimiento",
  burner_size: "Tamaño de quemador",
  microgravity_burn_length: "Longitud quemada en microgravedad",
  normal_gravity_burn_length: "Longitud quemada en 1 g",
  normal_gravity_spread_rate: "Velocidad de propagación en 1 g",
  pressure_min: "Presión mínima",
  pressure_max: "Presión máxima",
};

export const label = (map, key) => map[key] || (key ? key.replaceAll("_", " ") : "Sin dato");

const numberFormat = new Intl.NumberFormat("es", { maximumFractionDigits: 2 });

export function num(value, digits) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (digits !== undefined) return new Intl.NumberFormat("es", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  return numberFormat.format(value);
}

export const pct = (fraction, digits = 0) => (fraction === null || fraction === undefined ? "—" : `${num(fraction * 100, digits)} %`);

export function year(dateText) {
  const match = /(\d{4})/.exec(dateText || "");
  return match ? Number(match[1]) : null;
}
