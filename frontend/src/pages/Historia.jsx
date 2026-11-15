import { useState } from "react";
import { CANALES, HITOS, VIDEOS_APOLO1, VIDEOS_APOLO13 } from "../content/narrative";
import { MEDIA } from "../content/media";
import { Link } from "../components/Link";
import { AskButton, CrossLink, Page } from "../components/Layout";
import { Figure, Reveal, SectionTitle } from "../components/ui";

const INTRO_CARDS = [
  ["riesgos", "Brechas y prioridades", "Qué falta por probar para tu escenario de misión."],
  ["viento", "Dashboard", "Pruebas reales de flujo, oxígeno y detección."],
  ["historia", "Historia", "Los incidentes que cambiaron las normas."],
];

export function Intro() {
  return (
    <Page route="intro">
      <div className="grid items-start gap-10 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xl leading-relaxed">
            En la Tierra el aire caliente sube y alimenta la llama con aire nuevo. En una nave no existe esa corriente: el fuego es más lento, más frío y más difícil de ver. Por eso la NASA lleva décadas encendiendo fuego controlado en la Estación Espacial.
          </p>
          <p className="mt-4 text-gris-oscuro">
            Este sitio reúne esos experimentos: 24 investigaciones, miles de pruebas y más de diez mil páginas de informes. Cada dato que ves enlaza a la página exacta del documento original de la NASA de donde sale.
          </p>
          <div className="mt-6">
            <AskButton question="">Buscar o preguntar</AskButton>
          </div>
        </div>
        <Figure media={MEDIA.comparacion} imgClassName="max-h-[420px] object-contain" />
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {INTRO_CARDS.map(([to, title, text], i) => (
          <Reveal key={to} delay={i * 80}>
            <Link to={to} className="block h-full rounded-xl border border-linea p-6 transition hover:-translate-y-1 hover:border-rojo">
              <h3 className="text-2xl">{title}</h3>
              <p className="mt-2 text-gris-oscuro">{text}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </Page>
  );
}

function Video({ video }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article className="overflow-hidden rounded-xl border border-linea">
      <div className="relative aspect-video bg-noche">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.t}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={`Reproducir: ${video.t}`}>
            <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover opacity-80 transition group-hover:opacity-100" />
            <span className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-rojo text-white shadow-lg transition group-hover:scale-110">▶</span>
          </button>
        )}
      </div>
      <div className="p-4">
        <h4 className="text-base">{video.t}</h4>
        <small className="text-gris-oscuro">{video.c}</small>
      </div>
    </article>
  );
}

export function Historia() {
  const [active, setActive] = useState(0);
  return (
    <Page route="historia">
      <p className="max-w-3xl text-xl text-gris-oscuro">Los incendios reales que obligaron a cambiar materiales, atmósferas y extintores.</p>
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {HITOS.map((h, k) => (
          <Reveal key={h[1]} delay={k * 50}>
            <button
              onClick={() => setActive(k)}
              aria-expanded={active === k}
              className={`h-full w-full rounded-xl border p-5 text-left transition ${active === k ? "border-rojo bg-rojo/5" : "border-linea hover:border-noche"}`}
            >
              <em className="font-serif text-3xl text-rojo not-italic">{h[0]}</em>
              <b className="mt-1 block">{h[1]}</b>
              <p className={`mt-2 text-sm text-gris-oscuro ${active === k ? "" : "line-clamp-2"}`}>{h[2]}</p>
            </button>
          </Reveal>
        ))}
      </div>
      <div className="mt-6">
        <AskButton question="¿Qué pasó en el incendio de la estación Mir en 1997?">Preguntar por el incendio de la Mir</AskButton>
      </div>
      <SectionTitle sub="El incendio de 1967 en la plataforma de lanzamiento redefinió los materiales, la escotilla y la atmósfera de las cápsulas.">Lecciones del Apolo 1</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {VIDEOS_APOLO1.map((v) => (
          <Video key={v.id} video={v} />
        ))}
      </div>
      <SectionTitle sub="El oxígeno y la energía a bordo quedaron al límite; el control de misión convirtió una avería en un regreso seguro.">Lecciones del Apolo 13</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {VIDEOS_APOLO13.map((v) => (
          <Video key={v.id} video={v} />
        ))}
      </div>
      <SectionTitle>Canales institucionales</SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        {CANALES.map((c) => (
          <a key={c.n} href={c.u} target="_blank" rel="noreferrer" className="rounded-xl border border-linea p-6 transition hover:border-rojo">
            <h3 className="text-2xl">{c.n}</h3>
            <p className="mt-2 text-gris-oscuro">{c.d}</p>
            <span className="mt-3 inline-block text-sm text-azul">youtube.com ↗</span>
          </a>
        ))}
      </div>
      <Figure media={MEDIA.iss} className="mt-12" imgClassName="max-h-96" />
      <CrossLink text="Mira los datos que usamos hoy para evitar estos casos." to="riesgos" button="Brechas y prioridades" />
    </Page>
  );
}
