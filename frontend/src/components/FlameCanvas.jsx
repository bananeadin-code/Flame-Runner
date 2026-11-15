import { useEffect, useRef, useState } from "react";
import { NO_COOL_FLAME, coolFlameState } from "../lib/coolFlame";

// Ilustración de una llama con un shader de WebGL (no es una simulación física).
// gravity: 0 = microgravedad, 1 = Tierra. o2: % de oxígeno. flow: cm/s de flujo de aire.
// Tendencias que dibuja (fuentes de NASA): en microgravedad la llama es casi esférica, azul y tenue,
// porque no hay convección; en la Tierra es alargada, amarilla y parpadea. Más oxígeno la hace más
// grande y brillante; el flujo de aire la estira en la dirección del viento.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uG;
uniform float uOx;
uniform float uFlow;
uniform float uIgnite;
uniform float uGhost;
uniform float uHot;
uniform float uCool;
uniform float uVapor;
uniform float uDrop;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  // escala con el lado más corto: la llama cabe igual en visores anchos o angostos
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  uv *= mix(1.0, 0.7, smoothstep(1.2, 2.4, uRes.y / uRes.x));  // acercamiento en visores altos y angostos
  float t = uTime;

  // encendido: chispa y la llama crece en ~1 s
  float ig = smoothstep(0.0, 1.0, uIgnite);

  // la fuente (combustible) baja con gravedad y se corre a la izquierda con viento
  vec2 src = vec2(-0.2 * uFlow, -0.15 * uG);

  // distorsión por calor: en 1 g el aire caliente sube sobre la llama y dobla la imagen del fondo
  float plumeZone = uG * ig * smoothstep(-0.02, 0.12, uv.y - src.y) * exp(-pow((uv.x - src.x) / (0.1 + 0.25 * max(uv.y - src.y, 0.0)), 2.0));
  vec2 haze = vec2(fbm(vec2(uv.x * 9.0, uv.y * 5.0 - t * 2.6)) - 0.5, 0.0) * 0.035 * plumeZone;
  vec2 bgUv = uv + haze;

  // fondo: interior de una cámara de combustión (oscuro, con viñeta y rejilla técnica tenue)
  float vig = 1.0 - smoothstep(0.35, 0.95, length(uv * vec2(0.8, 1.0)));
  vec3 bg = mix(vec3(0.008, 0.012, 0.025), vec3(0.03, 0.045, 0.075), vig);
  vec2 cell = abs(fract(bgUv * 10.0) - 0.5);
  float grid = (1.0 - smoothstep(0.0, 0.012, min(cell.x, cell.y) - 0.48)) * 0.035 * vig;
  bg += vec3(0.6, 0.75, 1.0) * grid * (1.0 + 2.0 * plumeZone);

  // ignitor de alambre caliente (como el de BASS): aparece solo durante el encendido, al rojo vivo
  vec2 ia = src + vec2(0.11, -0.07), ib = src + vec2(0.03, -0.012);
  vec2 ba = ib - ia;
  float h = clamp(dot(uv - ia, ba) / dot(ba, ba), 0.0, 1.0);
  float wire = smoothstep(0.0028, 0.0, length(uv - ia - ba * h));
  float ignOn = step(0.001, uIgnite) * (1.0 - smoothstep(0.55, 0.9, uIgnite));
  float hotWire = (1.0 - smoothstep(0.3, 0.6, uIgnite)) * smoothstep(0.3, 1.0, h);
  bg += mix(vec3(0.35, 0.37, 0.42), vec3(1.0, 0.35, 0.08) * 2.5, hotWire) * wire * ignOn;
  bg += vec3(1.0, 0.3, 0.05) * hotWire * ignOn * exp(-length(uv - ib) * 40.0) * 0.6;

  // líneas de flujo de aire que avanzan con el viento
  float laneY = uv.y * 7.0 + 0.6 * (noise(vec2(uv.x * 1.5, t * 0.15)) - 0.5);
  float lane = abs(fract(laneY) - 0.5);
  float dash = smoothstep(0.82, 1.0, fract(uv.x * 1.6 - t * (0.25 + 1.4 * uFlow) + hash(vec2(floor(laneY), 1.0)) * 7.0));
  bg += vec3(0.55, 0.75, 1.0) * smoothstep(0.03, 0.0, lane) * dash * smoothstep(0.0, 0.15, uFlow) * 0.11 * vig;

  // fibra que sostiene la gota de combustible (como en FLEX)
  float fiber = smoothstep(0.0025, 0.0, abs(uv.x - src.x)) * step(uv.y, src.y);
  bg += vec3(0.35, 0.38, 0.45) * fiber * 0.6;

  // dirección y alargamiento: flotación hacia arriba (gravedad) + arrastre del viento (flujo)
  vec2 dir = normalize(vec2(uFlow * 1.6, uG * 2.4) + vec2(0.0001, 0.0002));
  float stretch = 1.0 + 1.7 * uG + 1.5 * uFlow * (1.0 - 0.5 * uG);
  vec2 perp = vec2(-dir.y, dir.x);

  // tamaño: más oxígeno = llama más grande; sin flujo en microgravedad le llega menos oxígeno
  float size = mix(0.6, 1.3, uOx) * mix(0.88, 1.0, clamp(uFlow * 3.0 + uG, 0.0, 1.0));
  float breathe = 1.0 + 0.025 * sin(t * 1.3) * (1.0 - uG);
  float R = 0.12 * size * breathe * mix(0.08, 1.0, ig);

  // con flotación o viento la llama se despega del combustible: queda "río abajo" y el combustible en su base
  float lift = clamp(uG + 0.7 * uFlow, 0.0, 1.0);
  vec2 p = uv - (src + dir * R * min(stretch, 2.4) * 0.16 * lift);

  // turbulencia: fuerte con gravedad (parpadeo), casi nula en microgravedad sin flujo
  float turb = 0.01 + 0.07 * uG + 0.025 * uFlow;
  vec2 np = p * 3.4 - dir * t * (0.5 + 1.7 * uG + 1.2 * uFlow);
  float down = max(dot(p, dir), 0.0);
  p += perp * (fbm(np + t * 0.25) - 0.5) * turb * (0.5 + 10.0 * down);
  p += dir * (fbm(np * 1.4 - t * 0.2) - 0.5) * turb * 0.5;

  float a = dot(p, dir), c = dot(p, perp);
  float aS = a > 0.0 ? a / stretch : a * (1.0 + 0.5 * lift);
  float taper = 1.0 + max(aS, 0.0) / R * 0.7 * (stretch - 1.0) / stretch;
  float d = length(vec2(aS, c * taper)) / R;

  // zonas: cuerpo luminoso, núcleo caliente, y el borde azul (zona de reacción)
  float body = smoothstep(1.05, 0.35, d);
  float core = smoothstep(0.75, 0.05, d);
  float rim = exp(-pow((d - 0.98) * 7.0, 2.0));

  // hollín: el amarillo es hollín incandescente; mucho con gravedad, poco en microgravedad; sube con oxígeno
  float soot = clamp((0.08 + 0.92 * uG) * (0.55 + 0.6 * uOx), 0.0, 1.0);
  // la base de la llama (lado del combustible / contra el flujo) se queda azul
  float base = smoothstep(0.15 * R, -0.75 * R, a) * lift;

  vec3 blue = vec3(0.18, 0.42, 1.0);
  vec3 deepBlue = vec3(0.06, 0.16, 0.55);
  vec3 orange = vec3(1.0, 0.33, 0.06);
  vec3 yellow = vec3(1.0, 0.72, 0.24);
  vec3 white = vec3(1.0, 0.97, 0.88);

  vec3 hot = mix(orange, yellow, smoothstep(0.0, 0.7, core));
  hot = mix(hot, white, pow(core, 2.5) * 0.8);
  // en microgravedad el interior es azul tenue con un leve centro anaranjado
  vec3 cool = mix(deepBlue, blue, 0.4 + 0.6 * body) + orange * core * 0.25 * uOx;
  float sootLocal = soot * (1.0 - base * 0.9);
  vec3 col = mix(cool, hot, sootLocal);

  float brightness = mix(0.55, 1.5, uOx);
  float intensity = mix(0.75, 1.9, sootLocal);
  vec3 flame = col * body * intensity * brightness;
  flame += blue * rim * (1.1 - 0.7 * sootLocal) * brightness;
  float glow = exp(-d * d * 0.55) * 0.28 * brightness;
  flame += mix(blue, orange, soot) * glow;

  // en 1 g: columna de aire caliente que sube sobre la llama (convección); en 0 g no existe
  float up = a / R;
  float plumeW = 1.0 + 0.35 * max(up, 0.0);
  float plume = smoothstep(0.6, 2.2, up) * exp(-pow(c / (R * plumeW), 2.0) * 1.5) * (1.0 - smoothstep(6.0, 11.0, up));
  float shimmer = fbm(vec2(c / R * 1.6, up * 0.7 - t * 2.2));
  flame += vec3(1.0, 0.55, 0.25) * plume * shimmer * 0.16 * uG * brightness * ig;

  // destello de la chispa al encender
  float spark = (1.0 - smoothstep(0.0, 0.25, uIgnite)) * step(0.001, uIgnite);
  flame += vec3(1.0, 0.9, 0.7) * spark * exp(-length(uv - src) * 60.0) * 3.0;

  flame *= mix(0.3, 1.0, ig);

  // fuera de los datos de NASA: llama tenue, sin color e intermitente (no sabemos si se apaga)
  float flick = 0.55 + 0.45 * smoothstep(0.35, 0.65, noise(vec2(t * 3.0, 0.5)));
  vec3 ghost = vec3(dot(flame, vec3(0.3, 0.45, 0.25))) * vec3(0.75, 0.85, 1.0) * 0.45 * flick;
  flame = mix(flame, ghost, uGhost);

  // secuencia de llama fría (FLEX): la llama caliente se apaga...
  flame *= uHot;
  float dSrc = length(uv - src);
  // ...queda una llama fría tenue alrededor de la gota (realzada para que se vea)
  float rc = 0.085 + 0.006 * sin(t * 0.9);
  float shell = exp(-pow((dSrc - rc) / 0.028, 2.0));
  float inner = smoothstep(rc + 0.02, 0.0, dSrc) * 0.35;
  float coolNoise = 0.75 + 0.5 * fbm(uv * 7.0 + vec2(t * 0.15, -t * 0.1));
  flame += vec3(0.62, 0.74, 1.0) * (shell + inner) * coolNoise * 0.22 * uCool;
  // ...y la nube de vapor que no alcanzó a quemarse
  float cloudR = 0.05 + 0.2 * uVapor;
  float cloud = smoothstep(cloudR, cloudR * 0.2, dSrc) * fbm(uv * 5.0 + vec2(t * 0.05, t * 0.03));
  flame += vec3(0.55, 0.6, 0.68) * cloud * 0.22 * uVapor;

  // la llama ilumina las paredes de la cámara (cálido con hollín, azul sin él)
  float lightDist = length(uv - (src + dir * R * stretch * 0.5 * lift));
  flame += mix(blue, orange, soot) * brightness * ig * 0.11 * exp(-lightDist * 3.2) * vig;

  // chispas de hollín arrastradas por la flotación o el viento
  float sparks = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float life = fract(t * (0.25 + 0.05 * fi) + hash(vec2(fi, 3.0)));
    vec2 sp = dir * R * stretch * (0.6 + life * 2.2) + perp * (hash(vec2(fi, 7.0)) - 0.5) * 0.12 * life;
    float sd = length(p - sp);
    sparks += smoothstep(0.006, 0.0, sd) * (1.0 - life) * (uG + uFlow) * soot;
  }
  flame += vec3(1.0, 0.6, 0.2) * sparks * 1.5;

  // muestra de combustible (pequeña esfera)
  float fd = length(uv - src) - 0.022 * uDrop;
  vec3 color = bg + flame;
  float fuel = smoothstep(0.004, 0.0, fd);
  color = mix(color, vec3(0.1, 0.1, 0.13) + 0.25 * flame * (1.0 - smoothstep(-0.02, 0.0, fd)), fuel);

  // tono final
  color = 1.0 - exp(-color * 1.4);
  gl_FragColor = vec4(color, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "shader");
  }
  return shader;
}

const IGNITION_MS = 1400;

// ignition: cambia este número para volver a encender la llama (secuencia de chispa)
// ghost: true si las condiciones están fuera de lo que NASA probó (se dibuja tenue e intermitente)
// coolStart: Date.now() al iniciar la secuencia de llama fría (o null)
export function FlameCanvas({ gravity, o2, flow, ghost = false, coolStart = null, ignition = 0, className = "", fallback = null }) {
  const canvasRef = useRef(null);
  const target = useRef({ gravity, o2, flow, ghost: ghost ? 1 : 0 });
  const cool = useRef(coolStart);
  const ignitedAt = useRef(0);
  const [failed, setFailed] = useState(false);

  // el ciclo de dibujo lee los valores más recientes de los controles desde estos refs
  useEffect(() => {
    target.current = { gravity, o2, flow, ghost: ghost ? 1 : 0 };
  }, [gravity, o2, flow, ghost]);

  useEffect(() => {
    cool.current = coolStart;
  }, [coolStart]);

  useEffect(() => {
    ignitedAt.current = performance.now();
  }, [ignition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: true, premultipliedAlpha: false });
    if (!gl) {
      setFailed(true);
      return undefined;
    }
    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      setFailed(true);
      return undefined;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(["uRes", "uTime", "uG", "uOx", "uFlow", "uIgnite", "uGhost", "uHot", "uCool", "uVapor", "uDrop"].map((n) => [n, gl.getUniformLocation(program, n)]));

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const state = { ...target.current };
    let frame = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (now) => {
      // los cambios de los controles se suavizan para que la transición se vea fluida
      const k = reduced ? 1 : 0.06;
      for (const key of ["gravity", "o2", "flow", "ghost"]) state[key] += (target.current[key] - state[key]) * k;
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, reduced ? 0 : (now - start) / 1000);
      gl.uniform1f(u.uG, state.gravity);
      gl.uniform1f(u.uOx, Math.min(Math.max((state.o2 - 10) / 35, 0), 1));
      gl.uniform1f(u.uFlow, Math.min(Math.max(state.flow / 40, 0), 1));
      gl.uniform1f(u.uGhost, state.ghost);
      const c = cool.current ? coolFlameState(Date.now() - cool.current) : NO_COOL_FLAME;
      gl.uniform1f(u.uHot, c.hot);
      gl.uniform1f(u.uCool, c.cool);
      gl.uniform1f(u.uVapor, c.vapor);
      gl.uniform1f(u.uDrop, c.drop);
      gl.uniform1f(u.uIgnite, reduced ? 1 : Math.min(Math.max((now - ignitedAt.current) / IGNITION_MS, 0.001), 1));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  if (failed) return fallback;
  return <canvas ref={canvasRef} className={`block h-full w-full ${className}`} role="img" aria-label="Ilustración animada de una llama" />;
}
