export const HITOS = [
  ["1967", "Apolo 1", "Un incendio en tierra, con oxígeno puro, cambia el diseño de las cápsulas."],
  ["1997", "Incendio en la Mir", "Un generador de oxígeno se prende y el humo llena un módulo durante horas."],
  ["2003", "Mist en el Columbia", "El proyecto Water Mist mide cómo las microgotas de agua frenan la llama."],
  ["2015", "Agua nebulizada en la ISS", "Los primeros extintores portátiles de agua nebulizada llegan para sustituir las unidades de CO₂."],
  ["2016", "Saffire I", "Se enciende fuego controlado en una nave de carga para estudiarlo."],
  ["Hoy", "Protocolos actuales", "Detección por capas y simulaciones con datos de los experimentos."],
];

export const VIDEOS_APOLO1 = [
  { id: "fa7bXO9zPXo", t: "How a 'Non-Hazardous' NASA Mission Turned Deadly", c: "Smithsonian" },
  { id: "M0YB5r4vzVo", t: "Apollo 1's Fatal Fire Almost Ended the Spaceflight Program", c: "Seeker" },
  { id: "05xdq6W9kRs", t: "NASA Opens Tribute to Apollo I Crew", c: "NASA" },
];

export const VIDEOS_APOLO13 = [
  { id: "MdvoA-sjs0A", t: "Apollo 13: 'Houston, We've Had a Problem'", c: "NASA" },
  { id: "WM8kjDF0IJU", t: "Apollo 13: Home Safe", c: "NASA" },
  { id: "lJiRA6GtxSA", t: "How Mission Control Saved the Apollo 13 Crew", c: "Smithsonian" },
];

export const CANALES = [
  { n: "NASA", u: "https://www.youtube.com/@NASA", d: "Misiones, documentales y archivo audiovisual oficial." },
  { n: "NASA Space Technology", u: "https://www.youtube.com/nasaspacetech", d: "Tecnología, experimentos y transferencia a la vida diaria." },
];

export const COMPARACION = [
  ["s", "Qué necesita", "Combustible, oxígeno y calor", "Combustible, oxígeno y calor"],
  ["d", "Forma de la llama", "Gota alargada hacia arriba", "Esfera pequeña y azulada"],
  ["d", "Corriente de aire", "Convección natural", "Solo ventilación forzada"],
  ["d", "Humo", "Sube hacia el techo", "Se acumula cerca de la fuente"],
  ["s", "Cómo se apaga", "Quitando oxígeno, calor o combustible", "Quitando oxígeno, calor o combustible"],
  ["d", "Agente extintor", "Agua o espuma", "CO₂ o niebla fina, cuidando los equipos"],
];

export const AGENTES = {
  He: { nombre: "Helio", resumen: "Gas inerte ligero, de alta conductividad térmica. Evaluado en FLEX, FLEX-2, CFI y ACME." },
  CO2: { nombre: "Dióxido de carbono", resumen: "Desplaza el oxígeno. Fue el estándar en la ISS antes del agua nebulizada." },
  N2: { nombre: "Nitrógeno", resumen: "Diluyente principal del aire. Inyectado sobre sólidos en BASS y BASS-II." },
  Xe: { nombre: "Xenón", resumen: "Gas inerte pesado, estudiado en simulaciones de gotas en microgravedad." },
  Ar: { nombre: "Argón", resumen: "Gas inerte comparado con xenón, helio y CO₂ en simulaciones." },
};

export const CONTEXTO_EXTINTORES = [
  {
    n: "Agua nebulizada",
    r: "Microgotas de agua que enfrían la llama sin ser tóxicas. Sustituyó al CO₂ en los módulos habitados.",
  },
  {
    n: "Dióxido de carbono",
    r: "Apaga rápido, pero en una cabina cerrada eleva el riesgo de asfixia y sobrecarga el soporte vital.",
  },
  {
    n: "Espuma",
    r: "El agente del programa ruso. Se usó para sofocar el incendio de la Mir en 1997.",
  },
  {
    n: "Venteo al vacío",
    r: "Último recurso: aislar el módulo y despresurizarlo. No usa agentes, pero cuesta aire y suministros.",
  },
];
