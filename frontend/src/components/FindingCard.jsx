import { useApp } from "../state/context";
import { AREA_LABEL, FINDING_TYPE_LABEL, GRAVITY_LABEL, label, num } from "../lib/format";
import { Tag } from "./ui";

const TYPE_TONE = { quantitative: "azul", qualitative: "gris", gap: "rojo" };

const PART_LABEL = {
  confidence: "confianza de la cita",
  source: "peso de la fuente",
  oxygen: "cercanía de O₂ al escenario",
  gravity: "coincidencia de gravedad",
};

export function SourceActions({ item }) {
  const { openSource } = useApp();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="text-gris-oscuro">
        {item.document_title} · pág. {item.page_no}
        {item.accession && ` · ${item.accession}`}
      </span>
      <button
        className="font-medium text-azul hover:underline"
        onClick={() => openSource({ document_id: item.document_id, page_no: item.page_no, quote: item.quote })}
      >
        Ver en contexto
      </button>
      {item.source_url && (
        <a href={item.source_url} target="_blank" rel="noreferrer" className="font-medium text-azul hover:underline">
          Abrir en {item.source_label} ↗
        </a>
      )}
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
    <article className={`rounded-xl border border-linea bg-white ${compact ? "p-4" : "p-5"} animate-aparecer`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Tag tone="azul">{label(AREA_LABEL, finding.safety_area)}</Tag>
        <Tag tone={TYPE_TONE[finding.finding_type]}>{label(FINDING_TYPE_LABEL, finding.finding_type)}</Tag>
        {finding.acronym && <Tag>{finding.acronym}</Tag>}
        {finding.value != null && (
          <Tag tone="gris">
            {num(finding.value)} {finding.unit}
          </Tag>
        )}
      </div>
      <p className={compact ? "text-base" : "text-lg leading-snug"}>{finding.statement}</p>
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
          <summary className="cursor-pointer select-none">¿Por qué aparece aquí? Puntuación {num(finding.score, 3)}</summary>
          <ul className="mt-2 space-y-0.5">
            {Object.entries(finding.score_parts).map(([k, v]) => (
              <li key={k}>
                {PART_LABEL[k] || k}: <b>{num(v, 2)}</b>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
