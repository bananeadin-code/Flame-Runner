import { useEffect, useRef, useState } from "react";
import { num } from "../lib/format";
import { pick, tr } from "../lib/i18n";

export function Reveal({ as: Tag = "div", delay = 0, className = "", children, ...props }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => typeof window !== "undefined" && !("IntersectionObserver" in window));
  useEffect(() => {
    const element = ref.current;
    if (!element || shown) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown]);
  return (
    <Tag ref={ref} className={`revelar ${shown ? "visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...props}>
      {children}
    </Tag>
  );
}

export function CountUp({ value, digits = 0, suffix = "" }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value === null || value === undefined) return undefined;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let frame;
    let start;
    const step = (time) => {
      start ??= time;
      const k = reduced ? 1 : Math.min(1, (time - start) / 900);
      setShown(value * (1 - (1 - k) ** 3));
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  if (value === null || value === undefined) return "—";
  return `${num(shown, digits)}${suffix}`;
}

export function Kpi({ value, label, note, digits = 0, suffix = "", tone = "" }) {
  return (
    <div className="min-w-0 border-l-2 border-linea py-1 pl-3 sm:pl-4">
      <b className={`block font-serif text-3xl leading-none sm:text-4xl ${tone === "rojo" ? "text-rojo" : tone === "azul" ? "text-azul" : ""}`}>
        <CountUp value={value} digits={digits} suffix={suffix} />
      </b>
      <small className="mt-2 block text-sm text-gris-oscuro">{label}</small>
      {note && <em className="mt-1 block text-xs not-italic text-gris-oscuro/80">{note}</em>}
    </div>
  );
}

export function KpiRow({ children }) {
  return <div className="my-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:gap-6 lg:grid-cols-4">{children}</div>;
}

export function Bars({ items, max, onSelect, selected }) {
  const top = max || Math.max(...items.map((i) => i.value || 0), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const active = selected !== undefined && selected === item.key;
        const content = (
          <>
            <span className="truncate text-sm">{item.label}</span>
            <span className="relative h-2.5 overflow-hidden rounded-full bg-claro">
              <i
                className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ${item.tone === "rojo" ? "bg-rojo" : item.tone === "gris" ? "bg-gris" : "bg-azul"}`}
                style={{ width: `${((item.value || 0) / top) * 100}%` }}
              />
            </span>
            <b className="text-right text-sm tabular-nums">{item.text ?? num(item.value)}</b>
          </>
        );
        const cls = `grid grid-cols-[minmax(5rem,11rem)_1fr_minmax(3.5rem,auto)] items-center gap-2 sm:gap-3 ${onSelect ? "w-full rounded-md px-2 py-1 text-left transition hover:bg-claro" : ""} ${active ? "bg-claro ring-1 ring-azul" : ""}`;
        return onSelect ? (
          <button key={item.key ?? item.label} className={cls} onClick={() => onSelect(item.key)}>
            {content}
          </button>
        ) : (
          <div key={item.key ?? item.label} className={cls}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function Chip({ active, onClick, children, tone = "rojo" }) {
  const on = tone === "azul" ? "border-azul bg-azul text-white" : "border-rojo bg-rojo text-white";
  return (
    <button
      onClick={onClick}
      aria-pressed={!!active}
      className={`rounded-full border px-4 py-1.5 text-sm transition duration-300 ${active ? on : "border-linea bg-white hover:border-noche"}`}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, label }) {
  return (
    <div className="my-4 flex flex-wrap gap-2" role="group" aria-label={label}>
      {children}
    </div>
  );
}

export function Card({ title, children, className = "", aside }) {
  return (
    <div className={`min-w-0 rounded-xl border border-linea bg-white p-4 sm:p-6 ${className}`}>
      {(title || aside) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {title && <h3 className="text-xl">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}

export function Loading({ text }) {
  return (
    <div className="flex items-center gap-3 py-8 text-gris-oscuro" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-linea border-t-rojo" />
      {text || tr("Cargando datos…", "Loading data…")}
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="my-4 rounded-lg border border-rojo/40 bg-rojo/5 p-4 text-sm" role="alert">
      <b>{tr("No se pudieron cargar los datos.", "The data could not be loaded.")}</b> {error.message}
    </div>
  );
}

export function Note({ children }) {
  return <p className="mt-6 text-xs text-gris-oscuro">{children}</p>;
}

export function Tag({ children, tone = "gris" }) {
  const tones = {
    gris: "bg-claro text-gris-oscuro",
    rojo: "bg-rojo/10 text-rojo",
    azul: "bg-azul/10 text-azul",
    verde: "bg-emerald-50 text-emerald-700",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Figure({ media, className = "", imgClassName = "" }) {
  return (
    <figure className={className}>
      <img src={media.src} alt={pick(media.alt)} loading="lazy" className={`w-full rounded-xl bg-noche object-cover ${imgClassName}`} />
      <figcaption className="mt-2 text-xs text-gris-oscuro">
        {pick(media.alt)}.{" "}
        <a href={media.url} target="_blank" rel="noreferrer" className="underline decoration-linea underline-offset-2 hover:decoration-noche">
          {pick(media.credit)} ↗
        </a>
      </figcaption>
    </figure>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mt-12 mb-4 sm:mt-14">
      <h2 className="text-2xl sm:text-3xl">{children}</h2>
      {sub && <p className="mt-2 max-w-3xl text-gris-oscuro">{sub}</p>}
    </div>
  );
}
