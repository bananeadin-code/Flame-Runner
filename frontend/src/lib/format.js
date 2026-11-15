import { getLang, pick, tr } from "./i18n";

export const AREAS = ["prevention", "detection", "suppression", "fundamental"];

export const AREA_LABEL = {
  prevention: ["Prevención", "Prevention"],
  detection: ["Detección", "Detection"],
  suppression: ["Supresión", "Suppression"],
  fundamental: ["Ciencia base", "Fundamental science"],
};

export const FUEL_CLASS_LABEL = {
  solid: ["Materiales sólidos", "Solid materials"],
  droplet: ["Gotas de combustible", "Fuel droplets"],
  gas: ["Llamas de gas", "Gas flames"],
  aerosol: ["Humo y aerosoles", "Smoke and aerosols"],
};

export const FINDING_TYPE_LABEL = {
  quantitative: ["Cuantitativo", "Quantitative"],
  qualitative: ["Cualitativo", "Qualitative"],
  gap: ["Hueco de conocimiento", "Knowledge gap"],
};

export const OUTCOME_LABEL = {
  extinguished: ["Extinguida", "Extinguished"],
  self_extinguished: ["Se apagó sola", "Self-extinguished"],
  flow_terminated: ["Flujo cortado", "Flow terminated"],
  disrupted: ["Interrumpida", "Disrupted"],
  completion: ["Completada", "Completed"],
};

export const GRAVITY_LABEL = {
  microgravity: ["Microgravedad", "Microgravity"],
  partial_gravity: ["g residual o parcial (menciones)", "Residual or partial g (mentions)"],
  normal_gravity: ["Gravedad terrestre", "Earth gravity"],
  unspecified: ["Sin especificar", "Unspecified"],
};

export const DOC_TYPE_LABEL = {
  report: ["Informes", "Reports"],
  science_document: ["Documentos científicos", "Science documents"],
  fact_sheet: ["Fichas NASA", "NASA fact sheets"],
  guide: ["Guías", "Guides"],
  web_page: ["Páginas web", "Web pages"],
  presentation: ["Presentaciones", "Presentations"],
  engineering_document: ["Ingeniería", "Engineering"],
  reference: ["Referencia", "Reference"],
  analyzed_data: ["Datos analizados", "Analyzed data"],
  raw_data: ["Datos y artículos", "Data and papers"],
  metadata: ["Metadatos", "Metadata"],
  other: ["Otros", "Other"],
};

export const QUANTITY_LABEL = {
  adiabatic_flame_temperature: ["Temperatura adiabática de llama", "Adiabatic flame temperature"],
  stoichiometric_mixture_fraction: ["Fracción de mezcla estequiométrica", "Stoichiometric mixture fraction"],
  nozzle_diameter: ["Diámetro de boquilla", "Nozzle diameter"],
  fuel_mass_flow: ["Caudal de combustible", "Fuel mass flow"],
  peak_burner_temperature: ["Temperatura máxima del quemador", "Peak burner temperature"],
  initial_droplet_diameter: ["Diámetro inicial de gota", "Initial droplet diameter"],
  burning_rate: ["Tasa de combustión", "Burning rate"],
  extinction_diameter: ["Diámetro de extinción", "Extinction diameter"],
  flames_ignited: ["Llamas encendidas", "Flames ignited"],
  final_o2_percent: ["O₂ final", "Final O₂"],
  initial_co2_percent: ["CO₂ inicial", "Initial CO₂"],
  final_co2_percent: ["CO₂ final", "Final CO₂"],
  initial_co_ppm: ["CO inicial", "Initial CO"],
  final_co_ppm: ["CO final", "Final CO"],
  sample_thickness: ["Espesor de muestra", "Sample thickness"],
  sample_length: ["Largo de muestra", "Sample length"],
  sample_width: ["Ancho de muestra", "Sample width"],
  ignition_power: ["Potencia de ignición", "Ignition power"],
  ignition_time: ["Tiempo de ignición", "Ignition time"],
  smoke_ratio_rt_r0: ["Relación de humo Rt/R0", "Smoke ratio Rt/R0"],
  duration: ["Duración", "Duration"],
  net_aging_time: ["Tiempo de envejecimiento", "Net aging time"],
  weight_loss_rate: ["Pérdida de masa", "Weight loss rate"],
  aging_duration: ["Envejecimiento", "Aging duration"],
  burner_size: ["Tamaño de quemador", "Burner size"],
  microgravity_burn_length: ["Longitud quemada en microgravedad", "Burn length in microgravity"],
  normal_gravity_burn_length: ["Longitud quemada en 1 g", "Burn length at 1 g"],
  normal_gravity_spread_rate: ["Velocidad de propagación en 1 g", "Spread rate at 1 g"],
  pressure_min: ["Presión mínima", "Minimum pressure"],
  pressure_max: ["Presión máxima", "Maximum pressure"],
};

export const VARIABLE_LABEL = {
  fuel: ["Combustible", "Fuel"],
  configuration: ["Configuración", "Configuration"],
  diluent: ["Diluyente", "Diluent"],
  o2_percent: ["Oxígeno (%)", "Oxygen (%)"],
  pressure_kpa: ["Presión (kPa)", "Pressure (kPa)"],
  flow_cm_s: ["Flujo (cm/s)", "Flow (cm/s)"],
  outcome: ["Resultado", "Outcome"],
};

export const label = (map, key) => (map[key] ? pick(map[key]) : key ? key.replaceAll("_", " ") : tr("Sin dato", "No data"));

export function num(value, digits, maxDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const options = digits !== undefined ? { maximumFractionDigits: digits, minimumFractionDigits: digits } : { maximumFractionDigits: maxDigits };
  return new Intl.NumberFormat(getLang(), options).format(value);
}

export const pct = (fraction, digits = 0) => (fraction === null || fraction === undefined ? "—" : `${num(fraction * 100, digits)} %`);

export function year(dateText) {
  const match = /(\d{4})/.exec(dateText || "");
  return match ? Number(match[1]) : null;
}
