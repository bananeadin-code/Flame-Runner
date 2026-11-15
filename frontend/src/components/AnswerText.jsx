import { tr } from "../lib/i18n";

function inline(text, onCite, cited) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).filter(Boolean);
  return parts.map((part, i) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const cite = /^\[(\d+)\]$/.exec(part);
    if (cite) {
      const n = Number(cite[1]);
      const known = cited.includes(n);
      return (
        <button
          key={i}
          onClick={() => known && onCite?.(n)}
          className={`mx-0.5 inline-flex min-w-5 items-center justify-center rounded px-1 align-super text-[0.7rem] font-semibold ${known ? "bg-azul/10 text-azul hover:bg-azul hover:text-white" : "bg-claro text-gris"}`}
          aria-label={`${tr("Fuente", "Source")} ${n}`}
        >
          {n}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const CARET = <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-azul align-middle" aria-hidden="true" />;

export function AnswerText({ text, cited = [], onCite, caret = false }) {
  const blocks = [];
  let list = null;
  text.split("\n").forEach((raw) => {
    const line = raw.trim();
    const bullet = /^[*\-•]\s+(.*)$/.exec(line);
    if (bullet) {
      list ??= [];
      list.push(bullet[1]);
      return;
    }
    if (list) {
      blocks.push({ type: "list", items: list });
      list = null;
    }
    if (line) blocks.push({ type: "p", text: line });
  });
  if (list) blocks.push({ type: "list", items: list });
  if (caret && !blocks.length) return CARET;
  const last = blocks.length - 1;

  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <ul key={i} className="list-disc space-y-1.5 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                {inline(item, onCite, cited)}
                {caret && i === last && j === block.items.length - 1 && CARET}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {inline(block.text, onCite, cited)}
            {caret && i === last && CARET}
          </p>
        ),
      )}
    </div>
  );
}
