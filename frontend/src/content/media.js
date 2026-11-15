const GUIDE = {
  credit: "NASA · Combustion in Reduced Gravity (NP-2015-10-034)",
  url: "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
};

const ACME = {
  credit: ["NASA · Ficha del experimento ACME", "NASA · ACME experiment fact sheet"],
  url: "https://www.nasa.gov/wp-content/uploads/2025/07/advanced-combustion-via-microgravity-experiments-acme.pdf",
};

const psi = (accession, name) => ({
  credit: [`NASA PSI · imagen representativa de ${name}`, `NASA PSI · ${name} representative image`],
  url: `https://psi.nasa.gov/physci/repo/data/investigations/${accession}`,
});

const ACME_IDS = ["PSI-10", "PSI-20", "PSI-21", "PSI-22", "PSI-23", "PSI-159"];
const BASS_IDS = ["PSI-25", "PSI-26"];
const FLEX_IDS = ["PSI-68", "PSI-69"];
const SAFFIRE_IDS = ["PSI-98", "PSI-99", "PSI-100"];

export const MEDIA = {
  acmeLlama: { src: "/media/acme-llama.jpg", alt: ["Llama de difusión de gas en microgravedad, experimento ACME", "Gas diffusion flame in microgravity, ACME experiment"], ...ACME },
  acmeFormas: { src: "/media/acme-formas.jpg", alt: ["Cuatro llamas de gas con distintas formas en microgravedad", "Four gas flames with different shapes in microgravity"], ...ACME },
  llamaEsferica: { src: "/media/llama-esferica.jpg", alt: ["Llama azul en forma de cúpula en microgravedad", "Dome-shaped blue flame in microgravity"], ...ACME },
  astronauta: { src: "/media/cir-astronauta.jpg", alt: ["Astronauta junto al Combustion Integrated Rack en la ISS", "Astronaut at the Combustion Integrated Rack on the ISS"], ...ACME },
  velaTierra: { src: "/media/vela-tierra.jpg", alt: ["Llama de vela en la Tierra, alargada hacia arriba", "Candle flame on Earth, stretched upward"], ...GUIDE },
  velaMicro: { src: "/media/vela-microgravedad.jpg", alt: ["Llama de vela en microgravedad, esférica y azul", "Candle flame in microgravity, spherical and blue"], ...GUIDE },
  comparacion: { src: "/media/comparacion-1g-0g.jpg", alt: ["Comparación de llamas en 1 g y en 0 g", "Flames at 1 g and at 0 g compared"], ...GUIDE },
  extincion: { src: "/media/extincion-nitrogeno.jpg", alt: ["Llama sobre esfera sólida en 1 g, en 0 g y apagándose con nitrógeno", "Flame over a solid sphere at 1 g, at 0 g and being extinguished with nitrogen"], ...GUIDE },
  propagacion: { src: "/media/propagacion-solido.jpg", alt: ["Llama propagándose sobre una muestra de material sólido", "Flame spreading over a solid material sample"], ...GUIDE },
  hollin: { src: "/media/llama-hollin.jpg", alt: ["Llama esférica con hollín en microgravedad", "Sooty spherical flame in microgravity"], ...GUIDE },
  gotas: { src: "/media/gotas-serie.jpg", alt: ["Secuencia de llamas en microgravedad", "Sequence of flames in microgravity"], ...GUIDE },
  oxigeno: { src: "/media/llamas-oxigeno.jpg", alt: ["Llamas de difusión de distinto tamaño", "Diffusion flames of different sizes"], ...GUIDE },
  anillo: { src: "/media/llama-anillo.jpg", alt: ["Frente de llama azul y anaranjado en microgravedad", "Blue and orange flame front in microgravity"], ...GUIDE },
  iss: { src: "/media/iss.jpg", alt: ["Estación Espacial Internacional sobre la Tierra", "International Space Station above Earth"], ...GUIDE },
  acmeHardware: { src: "/media/psi/acme-hardware.jpg", alt: ["Hardware del experimento ACME en la ISS", "ACME experiment hardware on the ISS"], ...psi("PSI-10", "ACME") },
  bassII: { src: "/media/psi/bass-ii-llama.jpg", alt: ["Llama sobre una muestra sólida en BASS-II", "Flame over a solid sample in BASS-II"], ...psi("PSI-25", "BASS-II") },
  cfig: { src: "/media/psi/cfig-cool-flames.jpg", alt: ["Llamas frías esféricas sobre quemadores porosos, CFI-G", "Spherical cool flames on porous burners, CFI-G"], ...psi("PSI-159", "ACME CFI-G") },
  daft: { src: "/media/psi/daft-iss.jpg", alt: ["Astronauta operando el experimento DAFT de polvo y aerosoles en la ISS", "Astronaut running the DAFT dust and aerosol experiment on the ISS"], ...psi("PSI-47", "DAFT") },
  efieldAzul: { src: "/media/psi/efield-blue.jpg", alt: ["Llama azul bajo un campo eléctrico, ACME E-FIELD", "Blue flame under an electric field, ACME E-FIELD"], ...psi("PSI-22", "ACME E-FIELD Flames") },
  efield: { src: "/media/psi/efield.jpg", alt: ["Llama con hollín bajo un campo eléctrico, ACME E-FIELD", "Sooty flame under an electric field, ACME E-FIELD"], ...psi("PSI-22", "ACME E-FIELD Flames") },
  etapas: { src: "/media/psi/flame-stages.jpg", alt: ["Etapas de llamas esféricas con y sin hollín, ACME Flame Design", "Stages of spherical flames with and without soot, ACME Flame Design"], ...psi("PSI-10", "ACME Flame Design") },
};

export const ANSWER_IMAGES = [
  ["comparacion", [], ["gravity", "buoyan", "convect", "candle", "earth", "normal", "shape"]],
  ["velaMicro", [], ["candle", "spheric", "shape"]],
  ["extincion", BASS_IDS, ["extinct", "extingu", "nitrogen", "suppress", "diluent", "dilut"]],
  ["propagacion", [...BASS_IDS, ...SAFFIRE_IDS], ["spread", "solid", "material", "fabric", "flammab", "propagat"]],
  ["bassII", BASS_IDS, ["solid", "spread", "flow", "sample", "extinct"]],
  ["hollin", [], ["soot", "sooty"]],
  ["etapas", ["PSI-10"], ["soot", "sooty", "spheric", "design", "oxygen", "stage"]],
  ["gotas", FLEX_IDS, ["droplet", "fuel", "drop"]],
  ["cfig", ["PSI-159"], ["cool", "porous", "droplet"]],
  ["oxigeno", [], ["oxygen", "o2", "enrich", "concentr"]],
  ["acmeLlama", ACME_IDS, ["gas", "diffusion", "burner", "jet"]],
  ["acmeFormas", ACME_IDS, ["gas", "shape", "burner", "diffusion"]],
  ["efieldAzul", ["PSI-22"], ["electric", "field", "ion"]],
  ["daft", ["PSI-47"], ["dust", "aerosol", "particle", "smoke", "detect", "sensor"]],
  ["astronauta", ["PSI-39", ...ACME_IDS, ...FLEX_IDS], ["rack", "hardware", "cir", "crew", "astronaut"]],
  ["acmeHardware", ["PSI-10"], ["hardware", "burner", "rack"]],
];
