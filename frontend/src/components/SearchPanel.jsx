import { useEffect, useRef, useState } from "react";
import { useApp } from "../state/context";
import { apiPost } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Link } from "../components/Link";
import { AREA_LABEL, AREAS, label } from "../lib/format";
import { AnswerText } from "./AnswerText";
import { FindingCard, SourceActions } from "./FindingCard";
import { Chip, ErrorBox, Loading } from "./ui";
import { pick, tr } from "../lib/i18n";
import { EXAMPLES } from "../content/narrative";
import { ScenarioSelect } from "./Layout";

const PROVIDER_LABEL = { local: ["Gemma 4 · servidor del equipo", "Gemma 4 · team server"], anthropic: ["Claude Haiku · respaldo", "Claude Haiku · fallback"] };

const OFF_TOPIC_TITLE = {
  scope: ["Fuera del alcance", "Out of scope"],
  task: ["Petición no admitida", "Request not supported"],
  manipulation: ["Instrucción ignorada", "Instruction ignored"],
};

function Examples({ onAsk }) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((e) => (
        <button key={e[0]} onClick={() => onAsk(pick(e))} className="rounded-full border border-linea bg-white px-4 py-2 text-left text-sm hover:border-azul hover:text-azul">
          {pick(e)}
        </button>
      ))}
    </div>
  );
}

function OffTopic({ reason, text, onAsk }) {
  return (
    <div className="mt-4 rounded-xl border border-rojo/40 bg-rojo/5 p-5" role="status">
      <small className="text-xs font-semibold uppercase tracking-wide text-rojo">{pick(OFF_TOPIC_TITLE[reason] || OFF_TOPIC_TITLE.scope)}</small>
      <p className="mt-2">{text}</p>
      <p className="mt-4 mb-3 text-sm text-gris-oscuro">
        {tr(
          "Este asistente solo consulta los experimentos de la NASA sobre fuego en el espacio. Prueba con una de estas preguntas:",
          "This assistant only searches NASA experiments on fire in space. Try one of these questions:",
        )}
      </p>
      <Examples onAsk={onAsk} />
    </div>
  );
}

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SourceList({ sources, cited, focus }) {
  const citedSources = sources.filter((s) => s.cited);
  const others = sources.filter((s) => !s.cited);
  const item = (s) => (
    <li key={s.n} id={`fuente-${s.n}`} className={`rounded-lg border p-4 transition ${focus === s.n ? "border-azul bg-azul/5" : "border-linea"}`}>
      <div className="flex gap-3">
        <span className={`flex size-6 shrink-0 items-center justify-center rounded text-xs font-bold ${cited.includes(s.n) ? "bg-azul text-white" : "bg-claro text-gris-oscuro"}`}>
          {s.n}
        </span>
        <div className="min-w-0">
          {s.statement && <p className="text-sm">{s.statement}</p>}
          <blockquote className="mt-1 border-l-2 border-rojo pl-2 font-serif text-xs italic text-gris-oscuro">“{s.quote}”</blockquote>
          <SourceActions item={s} />
        </div>
      </div>
    </li>
  );
  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">{tr("Fuentes citadas", "Cited sources")} ({citedSources.length})</h4>
      <ol className="space-y-2">{citedSources.map(item)}</ol>
      {others.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gris-oscuro">{tr("Otras fuentes consultadas", "Other sources consulted")} ({others.length})</summary>
          <ol className="mt-2 space-y-2">{others.map(item)}</ol>
        </details>
      )}
    </div>
  );
}

function Assistant({ question, scenarioId, area, lang, onReset }) {
  const [turns, setTurns] = useState([]);
  const [focus, setFocus] = useState(null);
  const [followUp, setFollowUp] = useState("");
  const asked = useRef(new Set());

  const ask = (text) => {
    const history = turns.flatMap((t) => (t.answer && !t.answer.off_topic ? [{ role: "user", content: t.question }, { role: "assistant", content: t.answer.answer }] : [])).slice(-6);
    const index = turns.length;
    setTurns((prev) => [...prev, { question: text, answer: null, error: null }]);
    apiPost("/api/chat", { question: text, scenario: scenarioId || undefined, area: area || undefined, history, lang })
      .then((answer) => setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, answer } : t))))
      .catch((error) => setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, error } : t))));
  };

  useEffect(() => {
    if (question && !asked.current.has(question)) {
      asked.current.add(question);
      ask(question);
    }
  }, [question]);

  const cite = (n) => {
    setFocus(n);
    document.getElementById(`fuente-${n}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const pending = turns.some((t) => !t.answer && !t.error);
  return (
    <div className="mt-6 space-y-10">
      {turns.map((t, i) => (
        <section key={i} className="animate-aparecer">
          <p className="font-serif text-xl break-words sm:text-2xl">{t.question}</p>
          {!t.answer && !t.error && (
            <Loading text={tr("Consultando la base de datos de la NASA y redactando la respuesta… puede tardar unos segundos.", "Searching the NASA database and writing the answer… this can take a few seconds.")} />
          )}
          <ErrorBox error={t.error} />
          {t.answer?.off_topic && <OffTopic reason={t.answer.off_topic} text={t.answer.answer} onAsk={(q) => !pending && ask(q)} />}
          {t.answer && !t.answer.off_topic && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-gris-oscuro">
                <span className="rounded-full bg-azul/10 px-2.5 py-0.5 font-medium text-azul">{tr("Asistente de evidencia", "Evidence assistant")}</span>
                {t.answer.provider && <span className="rounded-full bg-claro px-2.5 py-0.5">{pick(PROVIDER_LABEL[t.answer.provider]) || t.answer.provider}</span>}
                {t.answer.search_query && (
                  <span className="max-w-full truncate rounded-full bg-claro px-2.5 py-0.5">
                    {tr("Búsqueda", "Search")}: {t.answer.search_query}
                  </span>
                )}
              </div>
              {t.answer.notice && (
                <p className="mb-3 rounded-lg border border-rojo/40 bg-rojo/5 p-3 text-sm" role="alert">
                  {t.answer.notice}
                </p>
              )}
              <div className="rounded-xl bg-claro/60 p-4 text-[1.02rem] sm:p-5">
                <AnswerText text={t.answer.answer} cited={t.answer.cited} onCite={cite} />
              </div>
              {t.answer.sources.length > 0 && <SourceList sources={t.answer.sources} cited={t.answer.cited} focus={focus} />}
            </div>
          )}
        </section>
      ))}
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (followUp.trim().length > 2 && !pending) {
            ask(followUp.trim());
            setFollowUp("");
          }
        }}
      >
        <input
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          placeholder={tr("Pregunta de seguimiento…", "Follow-up question…")}
          aria-label={tr("Pregunta de seguimiento", "Follow-up question")}
          className="min-w-0 flex-1 basis-full rounded-full border border-linea px-5 py-2.5 outline-none focus:border-azul sm:basis-auto"
        />
        <button disabled={pending} className="flex-1 rounded-full bg-azul px-5 py-2.5 font-medium text-white disabled:opacity-50 sm:flex-none">
          {tr("Preguntar", "Ask")}
        </button>
        <button type="button" onClick={onReset} className="flex-1 rounded-full border border-linea px-4 py-2.5 text-sm sm:flex-none">
          {tr("Nueva búsqueda", "New search")}
        </button>
      </form>
    </div>
  );
}

function InstantResults({ query, area, onAsk }) {
  const debounced = useDebounced(query.trim(), 300);
  const { data, error, loading } = useApi(debounced.length >= 2 ? "/api/search/all" : null, { q: debounced, area });
  if (debounced.length < 2) {
    return (
      <div className="mt-8">
        <p className="mb-3 text-sm text-gris-oscuro">{tr("Prueba con una pregunta:", "Try a question:")}</p>
        <Examples onAsk={onAsk} />
        <p className="mt-6 max-w-2xl text-xs text-gris-oscuro">
          {tr(
            "El asistente de evidencia solo responde con hallazgos verificados y páginas de documentos de la NASA sobre fuego en el espacio, y cita cada afirmación. No es un chat general.",
            "The evidence assistant only answers with verified findings and NASA document pages about fire in space, and cites every claim. It is not a general chatbot.",
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-8">
      <button onClick={() => onAsk(query.trim())} className="flex w-full items-center justify-between gap-4 rounded-xl bg-noche p-4 text-left text-white transition hover:bg-noche-2 sm:p-5">
        <span>
          <small className="block text-xs uppercase tracking-wide text-azul-palido">{tr("Asistente de evidencia · fuentes verificadas", "Evidence assistant · verified sources")}</small>
          <span className="font-serif text-lg break-words sm:text-xl">
            {tr("Preguntar", "Ask")}: “{query.trim()}”
          </span>
        </span>
        <span aria-hidden="true" className="text-2xl">→</span>
      </button>
      {loading && <Loading text={tr("Buscando…", "Searching…")} />}
      <ErrorBox error={error} />
      {data && (
        <>
          {data.investigations.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">{tr("Investigaciones", "Investigations")}</h4>
              <div className="flex flex-wrap gap-2">
                {data.investigations.map((inv) => (
                  <Link key={inv.accession} to="investigaciones" query={{ acc: inv.accession }} className="rounded-full border border-linea px-4 py-1.5 text-sm hover:border-azul">
                    <b>{inv.acronym || inv.accession}</b> <span className="text-gris-oscuro">· {inv.accession}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">{tr("Hallazgos verificados", "Verified findings")} ({data.findings.length})</h4>
            {data.findings.length === 0 && <p className="text-sm text-gris-oscuro">{tr("Sin hallazgos para esa búsqueda. Prueba a preguntar al asistente.", "No findings for that search. Try asking the assistant.")}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {data.findings.map((f) => (
                <FindingCard key={f.finding_id} finding={f} compact />
              ))}
            </div>
          </div>
          {data.pages.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">{tr("En los documentos", "In the documents")}</h4>
              <ul className="space-y-2">
                {data.pages.map((p) => (
                  <li key={`${p.document_id}-${p.page_no}`} className="rounded-lg border border-linea p-4">
                    <p className="font-serif text-sm italic text-gris-oscuro">{p.excerpt}</p>
                    <SourceActions item={{ ...p, quote: p.excerpt.replaceAll("…", "") }} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function SearchPanel() {
  const { search, closeSearch, scenarioId, area, setArea, lang } = useApp();
  const [text, setText] = useState(search?.text || "");
  const [question, setQuestion] = useState(search?.ask ? search.text : null);
  const input = useRef(null);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e) => e.key === "Escape" && closeSearch();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [closeSearch]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white animate-aparecer" role="dialog" aria-label={tr("Buscar y preguntar", "Search and ask")}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-8 md:px-8">
        <div className="flex items-center justify-between gap-3">
          <ScenarioSelect showLabel />
          <button onClick={closeSearch} className="text-4xl leading-none text-gris-oscuro hover:text-noche" aria-label={tr("Cerrar", "Close")}>
            ×
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length > 2) setQuestion(text.trim());
          }}
        >
          <input
            ref={input}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setQuestion(null);
            }}
            placeholder={tr("Busca o pregunta sobre fuego en el espacio…", "Search or ask about fire in space…")}
            aria-label={tr("Buscar o preguntar", "Search or ask")}
            className="mt-4 w-full border-b-2 border-noche bg-transparent py-3 font-serif text-2xl outline-none placeholder:text-gris sm:text-3xl md:text-4xl"
          />
        </form>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={tr("Filtrar por área", "Filter by area")}>
          <Chip active={!area} onClick={() => setArea("")} tone="azul">
            {tr("Todas las áreas", "All areas")}
          </Chip>
          {AREAS.map((a) => (
            <Chip key={a} active={area === a} onClick={() => setArea(a)} tone="azul">
              {label(AREA_LABEL, a)}
            </Chip>
          ))}
        </div>
        {question ? (
          <Assistant key={`${question}|${scenarioId}|${area}|${lang}`} question={question} scenarioId={scenarioId} area={area} lang={lang} onReset={() => setQuestion(null)} />
        ) : (
          <InstantResults query={text} area={area} onAsk={(q) => { setText(q); setQuestion(q); }} />
        )}
      </div>
    </div>
  );
}
