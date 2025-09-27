import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * DotWaveBackground — Bands → Clean Circle morph (mono, calm, stable)
 *
 * - Inicio: bandas horizontales en la franja superior (ordenadas, con perspectiva).
 * - Idle: movimiento suave (seno + value-noise muy sutil).
 * - Scroll progress (0→1): trayectoria estable por “líneas” hacia un círculo
 *   con control Bezier (funnel) y asignación de ángulos estratificada (sin cruces).
 *
 * Props clave:
 *   progress: 0..1 (requerido)
 *   color: "#FF6A00" por defecto
 *   rows, cols: densidad por bandas (default 18 x 140)
 *   topFraction: franja vertical usada al inicio (default 0.48)
 *   ring: { radius, thickness } → grosor 0 = anillo fino; >0 = disco (relleno)
 *   idle: { amp, freqX, drift, timeScale } → “personalidad” del idle (suave por defecto)
 *
 * Rendimiento: 2D canvas, sin blend raro ni sombras. Redibuja en RAF (idle) + progress.
 */

export type DotWaveBackgroundProps = {
  progress: number; // 0..1 (requerido)
  color?: string; // monocromo
  dotRadius?: number; // px
  rows?: number; // bandas
  cols?: number; // puntos por banda
  topFraction?: number; // franja superior usada (0..1)

  // idle / forma inicial
  idle?: {
    amp?: number; // px de ondulación base (default 26)
    freqX?: number; // frecuencia horizontal (default 0.012)
    drift?: number; // px deriva lateral (default 6)
    timeScale?: number; // velocidad idle (default 0.6)
    noiseScale?: number; // escala ruido (default 0.9)
  };

  // círculo destino
  ring?: {
    radius?: number; // px (default 240)
    thickness?: number; // px (0 → anillo fino; >0 → disco relleno)
    center?: [number, number]; // normalizado (default [0.5, 0.58])
  };

  // trayectoria
  funnel?: {
    bend?: number; // 0..1 curvatura hacia el centro (default 0.85)
    swirl?: number; // vueltas máx (default 0.6 → elegante)
  };

  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
  pointerEvents?: "auto" | "none";
};

export default function DotWaveBackground({
  progress,
  color = "#FF6A00",
  dotRadius = 1.0,
  rows = 18,
  cols = 140,
  topFraction = 0.48,

  idle = { amp: 26, freqX: 0.012, drift: 6, timeScale: 0.6, noiseScale: 0.9 },

  ring = { radius: 240, thickness: 0, center: [0.5, 0.58] },

  funnel = { bend: 0.85, swirl: 0.6 },

  className,
  style,
  zIndex = 0,
  pointerEvents = "none",
}: DotWaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tRef = useRef(0);
  const [vp, setVp] = useState({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    const onResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setVp({ w: window.innerWidth, h: window.innerHeight, dpr });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --------- Precalcular bandas: inicio ordenado + destinos ordenados en círculo ---------
  const data = useMemo(() => {
    const { w, h } = vp;
    if (!w || !h) return null;

    const bandH = Math.max(1, h * topFraction);

    const N = rows * cols;
    const baseX = new Float32Array(N);
    const baseY = new Float32Array(N);
    const theta = new Float32Array(N);
    const radiusTarget = new Float32Array(N);
    const rowIndex = new Uint16Array(N);

    // Círculo destino
    const cx = w * (ring.center?.[0] ?? 0.5);
    const cy = h * (ring.center?.[1] ?? 0.58);
    const R = ring.radius ?? 240;
    const thick = Math.max(0, ring.thickness ?? 0);

    // --- controles de la "malla techo" inicial (onda + perspectiva) ---
    const ridgeAmp = 22; // altura de cresta (px)
    const ridgeAmpFar = 32; // algo más de “relieve” al fondo
    const fx1 = 0.045,
      fx2 = 0.08; // frecuencias de onda a lo largo de X
    const dzWarp1 = 6.0,
      dzWarp2 = 4.2; // curvatura por profundidad
    const jitter = 0.9; // micro-jitter para no ver patrón perfecto
    const perspPow = 1.65; // curva de “acercamiento” vertical
    const xJitterScale = 3.0; // jitter que decrece con la profundidad
    const yJitterScale = 2.0;

    let k = 0;
    for (let r = 0; r < rows; r++) {
      // tZ = 0 cercano al usuario (parte baja de la franja), 1 = al fondo (arriba)
      const tZ = r / Math.max(1, rows - 1);

      // Distribución vertical con “perspectiva” (más comprimido hacia arriba)
      const yRow = lerp(18, bandH - 36, Math.pow(tZ, perspPow));

      // Amplitud de las ondulaciones aumenta con profundidad (para el look de la referencia)
      const ampZ = ridgeAmp + (ridgeAmpFar - ridgeAmp) * tZ;

      for (let c = 0; c < cols; c++, k++) {
        const colT = c / Math.max(1, cols - 1);

        // Base X uniforme a lo ancho + curvaturas sutiles (dos senos desfasados)
        const x0 = colT * w;
        const warpX =
          Math.sin(c * fx1 + tZ * dzWarp1) * (ampZ * 0.35) +
          Math.sin(c * fx2 + tZ * dzWarp2 + 1.7) * (ampZ * 0.22);

        // Ondulación vertical suave (crestas tipo “dunas”)
        const warpY =
          (Math.sin(c * (fx2 * 0.9) + tZ * (dzWarp1 * 1.1)) +
            Math.sin(c * (fx1 * 1.15) + tZ * (dzWarp2 * 0.9) + 1.4)) *
          0.5 *
          ampZ;

        // Jitter determinista muy pequeño (evita patrón de rejilla)
        const jx =
          (hash2(c, r) - 0.5) * jitter * (0.3 + 0.7 * tZ) * xJitterScale;
        const jy =
          (hash2(r, c) - 0.5) * jitter * (0.3 + 0.7 * tZ) * yJitterScale;

        baseX[k] = x0 + warpX + jx;
        baseY[k] = yRow + warpY + jy;
        rowIndex[k] = r;

        // Ángulo de destino: estratificación por columna + leve offset por fila + pequeño jitter
        const rowOffset = (r / Math.max(1, rows - 1)) * 0.12; // evita “rayos”
        const jitterTh = (hash1(k * 7.13) - 0.5) * 0.06; // aleatorio sutil
        theta[k] = ((colT + rowOffset) % 1) * Math.PI * 2 + jitterTh;

        // Radio destino: anillo limpio o disco uniforme por sqrt
        if (thick <= 0.01) {
          radiusTarget[k] = R;
        } else {
          const rr = R - thick / 2 + Math.sqrt(hash1(k * 29.7)) * thick;
          radiusTarget[k] = rr;
        }
      }
    }

    return { baseX, baseY, theta, radiusTarget, rowIndex, cx, cy, N, w, h };
  }, [
    vp.w,
    vp.h,
    rows,
    cols,
    topFraction,
    ring.radius,
    ring.thickness,
    ring.center,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const draw = () => {
      const { w, h, dpr } = vp;
      if (!w || !h) return;

      const cw = Math.floor(w * dpr);
      const ch = Math.floor(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = color;

      const p = easeInOutCubic(clamp01(progress));
      const t = tRef.current;

      const { baseX, baseY, theta, radiusTarget, rowIndex, cx, cy, N } = data;

      // parámetros de idle y trayectoria
      const amp = idle.amp ?? 26;
      const freqX = idle.freqX ?? 0.012;
      const drift = idle.drift ?? 6;
      const timeScale = idle.timeScale ?? 0.6;
      const noiseScale = idle.noiseScale ?? 0.9;

      const bend = clamp01(funnel.bend ?? 0.85);
      const swirl = funnel.swirl ?? 0.6; // vueltas máximas (suave)

      // Atenuar movimiento idle a medida que nos acercamos al círculo
      const idleAtt = 1 - p;

      for (let i = 0; i < N; i++) {
        const rIdx = rowIndex[i];
        const rowPhase = rIdx * 0.22; // desfase por banda

        // START (idle): banda con seno + ruido MUY sutil (calmo)
        const sx0 = baseX[i];
        const sy0 = baseY[i];

        const idleWave =
          Math.sin(sx0 * freqX + t * timeScale + rowPhase) *
            (amp * 0.65 * idleAtt) +
          (noise2(sx0 * noiseScale, sy0 * noiseScale + t * (timeScale * 0.35)) -
            0.5) *
            (amp * 0.35 * idleAtt);

        const sx =
          sx0 +
          Math.cos(sy0 * 0.004 + t * (timeScale * 0.3) + rowPhase) *
            (drift * 0.5 * idleAtt);
        const sy = sy0 + idleWave;

        // END (circle)
        const th = theta[i];
        const rr = radiusTarget[i];
        const tx = cx + Math.cos(th) * rr;
        const ty = cy + Math.sin(th) * rr;

        // TRAYECTORIA: Bezier (sx,sy) → control → (tx,ty)
        // control = mezcla hacia el centro (funnel) + pequeña torsión dependiente de fila
        const toC_x = cx - sx;
        const toC_y = cy - sy;
        const ctrlBaseX = sx + toC_x * (0.55 + 0.25 * bend); // acerco el control hacia el centro
        const ctrlBaseY = sy + toC_y * (0.55 + 0.25 * bend);

        // swirl suave (máx “swirl” vueltas a p=1), más en filas superiores
        const swirlAngle =
          swirl *
          Math.PI *
          2 *
          p *
          (0.25 + 0.75 * (1 - rIdx / Math.max(1, rows - 1)));
        const dx = ctrlBaseX - cx;
        const dy = ctrlBaseY - cy;
        const rotX =
          cx + (dx * Math.cos(swirlAngle) - dy * Math.sin(swirlAngle));
        const rotY =
          cy + (dx * Math.sin(swirlAngle) + dy * Math.cos(swirlAngle));

        // tBezier: progreso extra suavizado en la curva (deja el círculo muy limpio al final)
        const tb = smooth01(p);

        const x = quadBezier(sx, rotX, tx, tb);
        const y = quadBezier(sy, rotY, ty, tb);

        // profundidad normalizada (filas al fondo = 1)
        const depth = rowIndex[i] / Math.max(1, rows - 1);

        // tamaño del punto: más pequeño al fondo; converge a uniforme al final
        const sizeStart = dotRadius * (0.65 + 0.85 * depth);
        const size = lerp(sizeStart, dotRadius, p);

        // alpha: más tenue al fondo; vuelve a 1 al final
        const aStart = 0.45 + 0.55 * depth;
        const alpha = lerp(aStart, 1, p);

        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // primer frame
    draw();

    const tick = () => {
      if (progress < 0.999) tRef.current += 0.016; // idle suave
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [vp, data, color, dotRadius, progress, rows, cols, idle, funnel]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex,
        pointerEvents,
        ...style,
      }}
    />
  );
}

/* ---------------- utils ---------------- */
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const smooth01 = (t: number) => t * t * (3 - 2 * t);

// value-noise 2D muy barato (0..1)
function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function hash1(n: number) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
function fade(t: number) {
  return t * t * (3 - 2 * t);
}
function noise2(x: number, y: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y);
  const xf = x - xi,
    yf = y - yi;
  const u = fade(xf),
    v = fade(yf);
  const tl = hash2(xi, yi);
  const tr = hash2(xi + 1, yi);
  const bl = hash2(xi, yi + 1);
  const br = hash2(xi + 1, yi + 1);
  const top = tl * (1 - u) + tr * u;
  const bot = bl * (1 - u) + br * u;
  return top * (1 - v) + bot * v;
}
// Bezier cuadrática
function quadBezier(p0: number, p1: number, p2: number, t: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}
