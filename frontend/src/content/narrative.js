export const SCENARIO_TEXT = {
  iss: { name: ["ISS (nominal)", "ISS (nominal)"], notes: ["Atmósfera estándar a nivel del mar", "Standard sea-level atmosphere"] },
  eva_staging: { name: ["Preparación de EVA", "EVA preparation"], notes: ["10.2 psia, usada antes de paseos espaciales", "10.2 psia, used before spacewalks"] },
  rover: { name: ["Rover presurizado", "Pressurized rover"], notes: ["Límite del reto: 30 % de O₂ a 10,2 psi en la Luna", "Challenge boundary: 30 % O₂ at 10.2 psi on the Moon"] },
  lunar: { name: ["Hábitat lunar (Artemis)", "Lunar habitat (Artemis)"], notes: ["Atmósfera de exploración: 34 % de O₂ a 8,2 psia, dentro del rango del reto (≥30 %, ≤10,2 psi)", "Exploration atmosphere: 34 % O₂ at 8.2 psia, within the challenge range (≥30 %, ≤10.2 psi)"] },
  mars: { name: ["Hábitat en Marte", "Mars habitat"], notes: ["Misma atmósfera de exploración, gravedad marciana", "Same exploration atmosphere, Martian gravity"] },
  suit: { name: ["Traje espacial (referencia)", "Spacesuit (reference)"], notes: ["100 % de O₂ a 4,3 psi: el caso extremo", "100 % O₂ at 4.3 psi: the extreme case"] },
};

export const HARDWARE = {
  acme: {
    name: ["ACME · Combustion Integrated Rack", "ACME · Combustion Integrated Rack"],
    text: [
      "Seis experimentos con llamas de gas que comparten el mismo hardware modular ACME dentro del CIR. BRE quema gas, pero estudia la inflamabilidad de materiales en atmósfera quieta; E-FIELD imita la flotación con un campo eléctrico; CFI-G llegó hasta 85 % de oxígeno.",
      "Six gas-flame experiments sharing the same modular ACME hardware inside the CIR. BRE burns gas but studies material flammability in still air; E-FIELD mimics buoyancy with an electric field; CFI-G reached 85 % oxygen.",
    ],
  },
  mdca: {
    name: ["MDCA · gotas en el CIR", "MDCA · droplets in the CIR"],
    text: [
      "FLEX, FLEX-2 y CFI quemaron gotas de combustible líquido con el Multi-user Droplet Combustion Apparatus del CIR.",
      "FLEX, FLEX-2 and CFI burned liquid fuel droplets with the CIR's Multi-user Droplet Combustion Apparatus.",
    ],
  },
  spice_duct: {
    name: ["Ducto de flujo de SPICE · MSG", "SPICE flow duct · MSG"],
    text: [
      "BASS, BASS-II, SPICE y SLICE usaron el ducto con ventilador construido para SPICE dentro del Microgravity Science Glovebox, con combustibles sólidos y gaseosos.",
      "BASS, BASS-II, SPICE and SLICE used the fan-driven flow duct built for SPICE inside the Microgravity Science Glovebox, with solid and gaseous fuels.",
    ],
  },
  saffire: {
    name: ["Saffire · naves Cygnus", "Saffire · Cygnus spacecraft"],
    text: [
      "Incendios a gran escala en naves de carga Cygnus ya desacopladas, para estudiar el fuego en tamaño real sin poner en riesgo a la tripulación.",
      "Large-scale fires on Cygnus cargo ships after undocking, to study fire at real scale without risking the crew.",
    ],
  },
  smoke_dust: {
    name: ["Humo y polvo · SAME, SAME-R, DAFT", "Smoke and dust · SAME, SAME-R, DAFT"],
    text: [
      "Uno de los instrumentos que midió humo en SAME y SAME-R se reutilizó en DAFT para medir polvo: la misma técnica sirve para distinguir humo de partículas inofensivas.",
      "One of the instruments that measured smoke in SAME and SAME-R was reused in DAFT to measure dust: the same technique helps tell smoke from harmless particles.",
    ],
  },
  ground: {
    name: ["Investigación en tierra", "Ground research"],
    text: ["Estudios de laboratorio y modelado que apoyan a los experimentos de vuelo.", "Laboratory and modeling studies that support the flight experiments."],
  },
};

export const EXAMPLES = [
  ["¿El helio sirve para apagar fuegos en microgravedad?", "Can helium put out fires in microgravity?"],
  ["¿Qué materiales se apagan solos con poco flujo de aire?", "Which materials self-extinguish at low airflow?"],
  ["¿Cómo se detecta el humo en una nave?", "How is smoke detected on a spacecraft?"],
  ["¿Qué pasa con una llama a 34 % de oxígeno?", "What happens to a flame at 34 % oxygen?"],
];

export const HITOS = [
  ["1967", ["Apolo 1", "Apollo 1"], ["Un incendio en tierra, con oxígeno puro, cambia el diseño de las cápsulas.", "A ground fire in pure oxygen changes how capsules are designed."], ["¿Qué cambió en la seguridad contra incendios después del incendio del Apolo 1 en 1967?", "What changed in fire safety after the 1967 Apollo 1 fire?"]],
  ["1997", ["Incendio en la Mir", "Fire on Mir"], ["Un generador de oxígeno se prende y el humo llena un módulo durante horas.", "An oxygen generator catches fire and smoke fills a module for hours."], ["¿Qué pasó en el incendio de la estación Mir en 1997?", "What happened in the 1997 fire on the Mir station?"]],
  ["2003", ["Mist en el Columbia", "Mist on Columbia"], ["El proyecto Water Mist mide cómo las microgotas de agua frenan la llama.", "The Water Mist project measures how fine water droplets slow a flame."], ["¿Qué midió el experimento Water Mist sobre la extinción de llamas con agua nebulizada?", "What did the Water Mist experiment measure about extinguishing flames with water mist?"]],
  ["2015", ["Agua nebulizada en la ISS", "Water mist on the ISS"], ["Los primeros extintores portátiles de agua nebulizada llegan para sustituir las unidades de CO₂.", "The first portable water mist extinguishers arrive to replace the CO₂ units."], ["¿Por qué se sustituyeron los extintores de CO₂ por agua nebulizada en la ISS?", "Why were CO₂ extinguishers replaced by water mist on the ISS?"]],
  ["2016", ["Saffire I", "Saffire I"], ["Se enciende fuego controlado en una nave de carga para estudiarlo.", "A controlled fire is lit on a cargo spacecraft to study it."], ["¿Qué aprendió la NASA de los incendios controlados de Saffire en naves Cygnus?", "What did NASA learn from the controlled Saffire fires on Cygnus spacecraft?"]],
  [["Hoy", "Today"], ["Protocolos actuales", "Current protocols"], ["Detección por capas y simulaciones con datos de los experimentos.", "Layered detection and simulations built on experiment data."], ["¿Cómo se detecta y se combate hoy un incendio en una nave espacial?", "How is a fire detected and fought on a spacecraft today?"]],
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
  { n: "NASA", u: "https://www.youtube.com/@NASA", d: ["Misiones, documentales y archivo audiovisual oficial.", "Missions, documentaries and the official video archive."] },
  { n: "NASA Space Technology", u: "https://www.youtube.com/nasaspacetech", d: ["Tecnología, experimentos y transferencia a la vida diaria.", "Technology, experiments and their transfer to everyday life."] },
];

export const COMPARACION = [
  ["s", ["Qué necesita", "What it needs"], ["Combustible, oxígeno y calor", "Fuel, oxygen and heat"], ["Combustible, oxígeno y calor", "Fuel, oxygen and heat"]],
  ["d", ["Forma de la llama", "Flame shape"], ["Gota alargada hacia arriba", "Teardrop stretched upward"], ["Esfera pequeña y azulada", "Small bluish sphere"]],
  ["d", ["Corriente de aire", "Airflow"], ["Convección natural", "Natural convection"], ["Solo ventilación forzada", "Forced ventilation only"]],
  ["d", ["Humo", "Smoke"], ["Sube hacia el techo", "Rises to the ceiling"], ["Se acumula cerca de la fuente", "Builds up near the source"]],
  ["s", ["Cómo se apaga", "How it is put out"], ["Quitando oxígeno, calor o combustible", "Removing oxygen, heat or fuel"], ["Quitando oxígeno, calor o combustible", "Removing oxygen, heat or fuel"]],
  ["d", ["Agente extintor", "Extinguishing agent"], ["Agua o espuma", "Water or foam"], ["CO₂ o niebla fina, cuidando los equipos", "CO₂ or fine mist, protecting the equipment"]],
];

export const AGENTES = {
  He: { nombre: ["Helio", "Helium"], resumen: ["Gas inerte ligero, de alta conductividad térmica. Evaluado en FLEX, FLEX-2, CFI y ACME.", "Light inert gas with high thermal conductivity. Evaluated in FLEX, FLEX-2, CFI and ACME."] },
  CO2: { nombre: ["Dióxido de carbono", "Carbon dioxide"], resumen: ["Desplaza el oxígeno. Fue el estándar en la ISS antes del agua nebulizada.", "Displaces oxygen. It was the ISS standard before water mist."] },
  N2: { nombre: ["Nitrógeno", "Nitrogen"], resumen: ["Diluyente principal del aire. Inyectado sobre sólidos en BASS y BASS-II.", "The main diluent in air. Injected over solids in BASS and BASS-II."] },
  Xe: { nombre: ["Xenón", "Xenon"], resumen: ["Gas inerte pesado, estudiado en simulaciones de gotas en microgravedad.", "Heavy inert gas, studied in simulations of droplets in microgravity."] },
  Ar: { nombre: ["Argón", "Argon"], resumen: ["Gas inerte comparado con xenón, helio y CO₂ en simulaciones.", "Inert gas compared with xenon, helium and CO₂ in simulations."] },
};

export const CONTEXTO_EXTINTORES = [
  {
    n: ["Agua nebulizada", "Water mist"],
    r: ["Microgotas de agua que enfrían la llama sin ser tóxicas. Sustituyó al CO₂ en los módulos habitados.", "Fine water droplets that cool the flame without being toxic. It replaced CO₂ in the crewed modules."],
  },
  {
    n: ["Dióxido de carbono", "Carbon dioxide"],
    r: ["Apaga rápido, pero en una cabina cerrada eleva el riesgo de asfixia y sobrecarga el soporte vital.", "It acts fast, but in a closed cabin it raises the risk of asphyxiation and overloads life support."],
  },
  {
    n: ["Espuma", "Foam"],
    r: ["El agente del programa ruso. Se usó para sofocar el incendio de la Mir en 1997.", "The agent of the Russian program. It was used to smother the 1997 Mir fire."],
  },
  {
    n: ["Venteo al vacío", "Venting to vacuum"],
    r: ["Último recurso: aislar el módulo y despresurizarlo. No usa agentes, pero cuesta aire y suministros.", "Last resort: isolate the module and depressurize it. It uses no agent, but it costs air and supplies."],
  },
];
