import { useMemo, useState } from "react";
import { num } from "../lib/format";

const W = 640;
const H = 360;
const PAD = { l: 56, r: 20, t: 20, b: 48 };

function ticks(min, max, count = 5) {
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

export function ScatterMap({ points, xDomain, yDomain, xLabel, yLabel, marker, vline, legend }) {
  const [hover, setHover] = useState(null);
  const sx = (x) => PAD.l + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * (W - PAD.l - PAD.r);
  const sy = (y) => H - PAD.b - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * (H - PAD.t - PAD.b);
  const visible = useMemo(
    () => points.filter((p) => p.x >= xDomain[0] && p.x <= xDomain[1] && p.y >= yDomain[0] && p.y <= yDomain[1]),
    [points, xDomain, yDomain],
  );
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel} frente a ${xLabel}`}>
        {ticks(...xDomain).map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD.t} y2={H - PAD.b} className="stroke-claro" />
            <text x={sx(t)} y={H - PAD.b + 18} textAnchor="middle" className="fill-gris-oscuro text-[11px]">
              {num(t, 0)}
            </text>
          </g>
        ))}
        {ticks(...yDomain).map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} className="stroke-claro" />
            <text x={PAD.l - 8} y={sy(t) + 4} textAnchor="end" className="fill-gris-oscuro text-[11px]">
              {num(t, 0)}
            </text>
          </g>
        ))}
        <text x={(W + PAD.l) / 2} y={H - 8} textAnchor="middle" className="fill-noche text-[12px]">
          {xLabel}
        </text>
        <text x={14} y={(H - PAD.b) / 2} textAnchor="middle" transform={`rotate(-90 14 ${(H - PAD.b) / 2})`} className="fill-noche text-[12px]">
          {yLabel}
        </text>
        {vline != null && vline >= xDomain[0] && vline <= xDomain[1] && (
          <line x1={sx(vline)} x2={sx(vline)} y1={PAD.t} y2={H - PAD.b} className="stroke-azul" strokeDasharray="4 4" strokeWidth="1.5" />
        )}
        {visible.map((p, i) => (
          <circle
            key={p.id ?? i}
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={p.highlight ? 5 : 3.5}
            className={`${p.highlight ? "fill-rojo" : "fill-azul/45"} cursor-pointer transition-[r] hover:opacity-100`}
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        {marker && marker.x >= xDomain[0] && marker.x <= xDomain[1] && marker.y >= yDomain[0] && marker.y <= yDomain[1] && (
          <g>
            <circle cx={sx(marker.x)} cy={sy(marker.y)} r="11" className="fill-none stroke-noche" strokeWidth="2" />
            <circle cx={sx(marker.x)} cy={sy(marker.y)} r="3" className="fill-noche" />
            <text x={sx(marker.x) + 15} y={sy(marker.y) - 10} className="fill-noche text-[12px] font-semibold">
              {marker.label}
            </text>
          </g>
        )}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute top-2 right-2 max-w-xs rounded-lg bg-noche px-3 py-2 text-xs text-white shadow-lg">
          {hover.title}
        </div>
      )}
      {legend && <div className="mt-2 flex flex-wrap gap-4 text-xs text-gris-oscuro">{legend}</div>}
    </div>
  );
}

export function LegendDot({ tone, children }) {
  const cls = tone === "rojo" ? "bg-rojo" : tone === "noche" ? "border-2 border-noche bg-white" : "bg-azul/45";
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={`inline-block size-3 rounded-full ${cls}`} />
      {children}
    </span>
  );
}
