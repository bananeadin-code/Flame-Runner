const GUIDE = {
  credit: "NASA · Combustion in Reduced Gravity (NP-2015-10-034)",
  url: "https://www.nasa.gov/wp-content/uploads/2016/05/np-2015-10-034-jsc_combustion_in_reduced_gravity-iss-mini-book-011116-508.pdf",
};

const ACME = {
  credit: "NASA · Ficha del experimento ACME",
  url: "https://www.nasa.gov/wp-content/uploads/2025/07/advanced-combustion-via-microgravity-experiments-acme.pdf",
};

export const MEDIA = {
  acmeLlama: { src: "/media/acme-llama.jpg", alt: "Llama de difusión de gas en microgravedad, experimento ACME", ...ACME },
  acmeFormas: { src: "/media/acme-formas.jpg", alt: "Cuatro llamas de gas con distintas formas en microgravedad", ...ACME },
  llamaEsferica: { src: "/media/llama-esferica.jpg", alt: "Llama azul en forma de cúpula en microgravedad", ...ACME },
  astronauta: { src: "/media/cir-astronauta.jpg", alt: "Astronauta junto al Combustion Integrated Rack en la ISS", ...ACME },
  velaTierra: { src: "/media/vela-tierra.jpg", alt: "Llama de vela en la Tierra, alargada hacia arriba", ...GUIDE },
  velaMicro: { src: "/media/vela-microgravedad.jpg", alt: "Llama de vela en microgravedad, esférica y azul", ...GUIDE },
  comparacion: { src: "/media/comparacion-1g-0g.jpg", alt: "Comparación de llamas en 1 g y en 0 g", ...GUIDE },
  extincion: { src: "/media/extincion-nitrogeno.jpg", alt: "Llama sobre esfera sólida en 1 g, en 0 g y apagándose con nitrógeno", ...GUIDE },
  propagacion: { src: "/media/propagacion-solido.jpg", alt: "Llama propagándose sobre una muestra de material sólido", ...GUIDE },
  hollin: { src: "/media/llama-hollin.jpg", alt: "Llama esférica con hollín en microgravedad", ...GUIDE },
  gotas: { src: "/media/gotas-serie.jpg", alt: "Secuencia de llamas en microgravedad", ...GUIDE },
  oxigeno: { src: "/media/llamas-oxigeno.jpg", alt: "Llamas de difusión de distinto tamaño", ...GUIDE },
  anillo: { src: "/media/llama-anillo.jpg", alt: "Frente de llama azul y anaranjado en microgravedad", ...GUIDE },
  iss: { src: "/media/iss.jpg", alt: "Estación Espacial Internacional sobre la Tierra", ...GUIDE },
};
