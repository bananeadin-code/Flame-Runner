import { useEffect, useRef, useState } from "react";
import { useApp } from "../state/context";
import { apiPost } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Link } from "../components/Link";
import { AREA_LABEL, AREAS, label } from "../lib/format";
import { AnswerText } from "./AnswerText";
import { FindingCard, SourceActions } from "./FindingCard";
import { Chip, ErrorBox, Loading } from "./ui";

const EXAMPLES = [
  "¿El helio sirve para apagar fuegos en microgravedad?",
  "¿Qué materiales se apagan solos con poco flujo de aire?",
  "¿Cómo se detecta el humo en una nave?",
  "¿Qué pasa con una llama a 34 % de oxígeno?",
];

const PROVIDER_LABEL = { local: "Gemma 4 · servidor del equipo", anthropic: "Claude Haiku · respaldo" };

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
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">Fuentes citadas ({citedSources.length})</h4>
      <ol className="space-y-2">{citedSources.map(item)}</ol>
      {others.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gris-oscuro">Otras fuentes consultadas ({others.length})</summary>
          <ol className="mt-2 space-y-2">{others.map(item)}</ol>
        </details>
      )}
    </div>
  );
}

function Assistant({ question, scenarioId, area, onReset }) {
  const [turns, setTurns] = useState([]);
  const [focus, setFocus] = useState(null);
  const [followUp, setFollowUp] = useState("");
  const asked = useRef(new Set());

  const ask = (text) => {
    const history = turns.flatMap((t) => (t.answer ? [{ role: "user", content: t.question }, { role: "assistant", content: t.answer.answer }] : [])).slice(-6);
    const index = turns.length;
    setTurns((prev) => [...prev, { question: text, answer: null, error: null }]);
    apiPost("/api/chat", { question: text, scenario: scenarioId || undefined, area: area || undefined, history })
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
          <p className="font-serif text-2xl">{t.question}</p>
          {!t.answer && !t.error && <Loading text="Consultando la base de datos de la NASA y redactando la respuesta… puede tardar unos segundos." />}
          <ErrorBox error={t.error} />
          {t.answer && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap gap-2 text-xs text-gris-oscuro">
                <span className="rounded-full bg-claro px-2.5 py-0.5">{PROVIDER_LABEL[t.answer.provider] || t.answer.provider}</span>
                <span className="rounded-full bg-claro px-2.5 py-0.5">Búsqueda: {t.answer.search_query}</span>
              </div>
              <div className="rounded-xl bg-claro/60 p-5 text-[1.02rem]">
                <AnswerText text={t.answer.answer} cited={t.answer.cited} onCite={cite} />
              </div>
              {t.answer.sources.length > 0 && <SourceList sources={t.answer.sources} cited={t.answer.cited} focus={focus} />}
            </div>
          )}
        </section>
      ))}
      <form
        className="flex gap-2"
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
          placeholder="Pregunta de seguimiento…"
          className="flex-1 rounded-full border border-linea px-5 py-2.5 outline-none focus:border-azul"
        />
        <button disabled={pending} className="rounded-full bg-azul px-5 py-2.5 font-medium text-white disabled:opacity-50">
          Preguntar
        </button>
        <button type="button" onClick={onReset} className="rounded-full border border-linea px-4 py-2.5 text-sm">
          Nueva búsqueda
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
        <p className="mb-3 text-sm text-gris-oscuro">Prueba con una pregunta:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => onAsk(e)} className="rounded-full border border-linea px-4 py-2 text-left text-sm hover:border-azul hover:text-azul">
              {e}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-8">
      <button onClick={() => onAsk(query.trim())} className="flex w-full items-center justify-between gap-4 rounded-xl bg-noche p-5 text-left text-white transition hover:bg-noche-2">
        <span>
          <small className="block text-xs uppercase tracking-wide text-azul-palido">Asistente con fuentes verificadas</small>
          <span className="font-serif text-xl">Preguntar: “{query.trim()}”</span>
        </span>
        <span aria-hidden="true" className="text-2xl">→</span>
      </button>
      {loading && <Loading text="Buscando…" />}
      <ErrorBox error={error} />
      {data && (
        <>
          {data.investigations.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">Investigaciones</h4>
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
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">Hallazgos verificados ({data.findings.length})</h4>
            {data.findings.length === 0 && <p className="text-sm text-gris-oscuro">Sin hallazgos para esa búsqueda. Prueba a preguntar al asistente.</p>}
            <div className="grid gap-3 md:grid-cols-2">
              {data.findings.map((f) => (
                <FindingCard key={f.finding_id} finding={f} compact />
              ))}
            </div>
          </div>
          {data.pages.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gris-oscuro">En los documentos</h4>
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
  const { search, closeSearch, scenario, scenarioId, area, setArea } = useApp();
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white animate-aparecer" role="dialog" aria-label="Buscar y preguntar">
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
        <div className="flex items-center justify-between">
          <small className="text-xs uppercase tracking-wide text-gris-oscuro">
            Escenario: <b className="text-noche">{scenario?.name || "—"}</b>
          </small>
          <button onClick={closeSearch} className="text-4xl leading-none text-gris-oscuro hover:text-noche" aria-label="Cerrar">
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
            placeholder="Busca o pregunta sobre fuego en el espacio…"
            aria-label="Buscar o preguntar"
            className="mt-4 w-full border-b-2 border-noche bg-transparent py-3 font-serif text-3xl outline-none placeholder:text-gris md:text-4xl"
          />
        </form>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por área">
          <Chip active={!area} onClick={() => setArea("")} tone="azul">
            Todas las áreas
          </Chip>
          {AREAS.map((a) => (
            <Chip key={a} active={area === a} onClick={() => setArea(a)} tone="azul">
              {label(AREA_LABEL, a)}
            </Chip>
          ))}
        </div>
        {question ? (
          <Assistant key={`${question}|${scenarioId}|${area}`} question={question} scenarioId={scenarioId} area={area} onReset={() => setQuestion(null)} />
        ) : (
          <InstantResults query={text} area={area} onAsk={(q) => { setText(q); setQuestion(q); }} />
        )}
      </div>
    </div>
  );
}
