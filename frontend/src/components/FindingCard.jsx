import { pick, tr } from "../lib/i18n";
import { useState } from "react";
import { useApp } from "../state/context";
import { AREA_LABEL, FINDING_TYPE_LABEL, GRAVITY_LABEL, label, num } from "../lib/format";
import { Tag } from "./ui";
import { Link } from "./Link";

const TYPE_TONE = { quantitative: "azul", qualitative: "gris", gap: "rojo" };

const PART_LABEL = {
  confidence: ["confianza de la cita", "quote confidence"],
  source: ["peso de la fuente", "source weight"],
  oxygen: ["cercanía de O₂ al escenario", "O₂ closeness to the scenario"],
  gravity: ["coincidencia de gravedad", "gravity match"],
};

function CopyCitation({ item }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const text = [
      item.statement || `“${item.quote}”`,
      `${item.document_title}, ${tr("p.", "p.")} ${item.page_no}`,
      item.accession && `NASA PSI ${item.accession}`,
      item.source_url,
    ]
      .filter(Boolean)
      .join(" — ");
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy} className="font-medium text-gris-oscuro hover:text-noche hover:underline">
      {copied ? tr("✓ Cita copiada", "✓ Citation copied") : tr("Copiar cita", "Copy citation")}
    </button>
  );
}

export function SourceActions({ item }) {
  const { openSource } = useApp();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="min-w-0 break-words text-gris-oscuro">
        {item.document_title} · {tr("pág.", "p.")} {item.page_no}
        {item.accession && ` · ${item.accession}`}
      </span>
      <button
        className="font-medium text-azul hover:underline"
        onClick={() => openSource({ document_id: item.document_id, page_no: item.page_no, quote: item.quote })}
      >
        {tr("Ver en contexto", "View in context")}
      </button>
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noreferrer" className="font-medium text-azul hover:underline">
          {tr("Abrir en", "Open in")} {item.source_label} ↗
        </a>
      )}
      <CopyCitation item={item} />
    </div>
  );
}

export function FindingCard({ finding, showScore = false, compact = false }) {
  const conditions = finding.conditions || {};
  const chips = [
    conditions.fuel,
    conditions.o2_percent != null && `${num(conditions.o2_percent, 1)} % O₂`,
    conditions.pressure_kpa != null && `${num(conditions.pressure_kpa, 0)} kPa`,
    conditions.flow_cm_s != null && `${num(conditions.flow_cm_s, 1)} cm/s`,
    conditions.diluent,
    conditions.gravity && conditions.gravity !== "unspecified" && label(GRAVITY_LABEL, conditions.gravity),
  ].filter(Boolean);
  return (
    <article className={`min-w-0 rounded-xl border border-linea bg-white ${compact ? "p-4" : "p-4 sm:p-5"} animate-aparecer`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Tag tone="azul">{label(AREA_LABEL, finding.safety_area)}</Tag>
        <Tag tone={TYPE_TONE[finding.finding_type]}>{label(FINDING_TYPE_LABEL, finding.finding_type)}</Tag>
        {finding.acronym && (
          <Link to="investigaciones" query={{ acc: finding.accession }} className="rounded-full bg-claro px-2.5 py-0.5 text-xs font-medium text-gris-oscuro hover:bg-linea hover:text-noche">
            {finding.acronym}
          </Link>
        )}
        {finding.value != null && (
          <Tag tone="gris">
            {num(finding.value)} {finding.unit}
          </Tag>
        )}
      </div>
      <p className={compact ? "text-base" : "text-base leading-snug sm:text-lg"}>{finding.statement}</p>
      <blockquote className="mt-3 border-l-2 border-rojo pl-3 font-serif text-sm italic text-gris-oscuro">“{finding.quote}”</blockquote>
      {!compact && chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded border border-linea px-2 py-0.5 text-xs text-gris-oscuro">
              {c}
            </span>
          ))}
        </div>
      )}
      <SourceActions item={finding} />
      {showScore && finding.score_parts && (
        <details className="mt-3 text-xs text-gris-oscuro">
          <summary className="cursor-pointer select-none">{tr("¿Por qué aparece aquí? Puntuación", "Why is this here? Score")} {num(finding.score, 3)}</summary>
          <ul className="mt-2 space-y-0.5">
            {Object.entries(finding.score_parts).map(([k, v]) => (
              <li key={k}>
                {pick(PART_LABEL[k]) || k}: <b>{num(v, 2)}</b>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
