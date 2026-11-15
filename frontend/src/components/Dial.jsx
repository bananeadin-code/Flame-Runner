import { useRef } from "react";

// Dial giratorio accesible: se arrastra con mouse o dedo, y con flechas, Re Pág/Av Pág, Inicio/Fin del teclado.
const START = -135;
const SWEEP = 270;

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arc(cx, cy, r, from, to) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

export function Dial({ label, value, min, max, step = 1, unit = "", onChange, bands = [], color = "#ff3b3b", format }) {
  const ref = useRef(null);
  const clamp = (v) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const toDeg = (v) => START + ((v - min) / (max - min)) * SWEEP;
  const angle = toDeg(value);

  const setFromPointer = (event) => {
    const box = ref.current.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg > 180) deg -= 360;
    deg = Math.min(START + SWEEP, Math.max(START, deg));
    onChange(clamp(min + ((deg - START) / SWEEP) * (max - min)));
  };

  const onKeyDown = (event) => {
    const big = (max - min) / 10;
    const moves = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: big, PageDown: -big };
    if (event.key in moves) onChange(clamp(value + moves[event.key]));
    else if (event.key === "Home") onChange(min);
    else if (event.key === "End") onChange(max);
    else return;
    event.preventDefault();
  };

  const [kx, ky] = polar(60, 60, 40, angle);
  const shown = format ? format(value) : `${value}${unit}`;

  return (
    <div className="flex flex-col items-center">
      <svg
        ref={ref}
        viewBox="0 0 120 120"
        className="h-40 w-40 cursor-grab touch-none select-none active:cursor-grabbing"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={shown}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setFromPointer(e);
        }}
        onPointerMove={(e) => e.buttons && setFromPointer(e)}
      >
        <path d={arc(60, 60, 48, START, START + SWEEP)} stroke="rgba(0,2,15,0.07)" strokeWidth="8" fill="none" strokeLinecap="round" />
        {Array.from({ length: 21 }, (_, i) => {
          const deg = START + (SWEEP * i) / 20;
          const [x1, y1] = polar(60, 60, i % 5 === 0 ? 53.5 : 54.5, deg);
          const [x2, y2] = polar(60, 60, 58, deg);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i % 5 === 0 ? "rgba(0,2,15,0.45)" : "rgba(0,2,15,0.18)"}
              strokeWidth={i % 5 === 0 ? 1.2 : 0.8}
            />
          );
        })}
        {bands.map((b) => (
          <path
            key={b.label}
            d={arc(60, 60, 48, toDeg(Math.max(min, b.from)), toDeg(Math.min(max, b.to)))}
            stroke={b.color}
            strokeWidth="8"
            fill="none"
          >
            <title>{b.label}</title>
          </path>
        ))}
        <path d={arc(60, 60, 36, START, angle)} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
        <circle cx="60" cy="60" r="30" fill="#ffffff" stroke="#d9d9dd" />
        <circle cx={kx} cy={ky} r="6" fill="white" stroke={color} strokeWidth="3" />
        <text x="60" y="58" textAnchor="middle" className="fill-noche font-serif" fontSize="15">
          {shown}
        </text>
        <text x="60" y="74" textAnchor="middle" className="fill-gris-oscuro" fontSize="8">
          {label}
        </text>
      </svg>
    </div>
  );
}
