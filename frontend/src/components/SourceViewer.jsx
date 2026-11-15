import { tr } from "../lib/i18n";
import { useEffect, useState } from "react";
import { useApp } from "../state/context";
import { useApi } from "../lib/useApi";
import { ErrorBox, Loading } from "./ui";

function Highlighted({ text, highlight }) {
  if (!highlight) return text;
  return (
    <>
      {text.slice(0, highlight.start)}
      <mark id="cita" className="marca">{text.slice(highlight.start, highlight.end)}</mark>
      {text.slice(highlight.end)}
    </>
  );
}

export function SourceViewer() {
  const { source, closeSource } = useApp();
  const [page, setPage] = useState(source?.page_no);
  const current = page ?? source?.page_no;
  const quote = current === source?.page_no ? source?.quote : undefined;
  const { data, error, loading } = useApi(source ? `/api/documents/${source.document_id}/pages/${current}` : null, { quote });

  useEffect(() => {
    if (data?.highlight) document.getElementById("cita")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [data]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeSource();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSource]);

  if (!source) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-noche/60 animate-aparecer" onClick={closeSource} role="dialog" aria-label={tr("Documento fuente", "Source document")}>
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-4 border-b border-linea p-4 sm:p-5">
          <div className="min-w-0">
            <small className="text-xs uppercase tracking-wide text-gris-oscuro">
              {data?.acronym || data?.accession || tr("Documento", "Document")} · {tr("página", "page")} {current}
              {data?.n_pages ? ` ${tr("de", "of")} ${data.n_pages}` : ""}
            </small>
            <h3 className="mt-1 text-lg break-words sm:text-xl">{data?.title || tr("Cargando…", "Loading…")}</h3>
          </div>
          <button onClick={closeSource} className="text-3xl leading-none text-gris-oscuro hover:text-noche" aria-label={tr("Cerrar", "Close")}>
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading && <Loading text={tr("Cargando página…", "Loading page…")} />}
          <ErrorBox error={error} />
          {data && (
            <pre className="font-serif text-[0.95rem] leading-relaxed whitespace-pre-wrap text-noche">
              <Highlighted text={data.text} highlight={data.highlight} />
            </pre>
          )}
        </div>
        <footer className="flex flex-wrap items-center gap-3 border-t border-linea p-4 text-sm">
          <button disabled={!data?.prev_page} onClick={() => setPage(data.prev_page)} className="rounded-full border border-linea px-4 py-1.5 disabled:opacity-40">
            ← {tr("Anterior", "Previous")}
          </button>
          <button disabled={!data?.next_page} onClick={() => setPage(data.next_page)} className="rounded-full border border-linea px-4 py-1.5 disabled:opacity-40">
            {tr("Siguiente", "Next")} →
          </button>
          {data?.source_url && (
            <a href={data.source_url} target="_blank" rel="noreferrer" className="rounded-full bg-azul px-4 py-1.5 font-medium text-white hover:bg-azul-claro sm:ml-auto">
              {tr("Abrir en", "Open in")} {data.source_label} ↗
            </a>
          )}
        </footer>
      </div>
    </div>
  );
}
