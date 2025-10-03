import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** Progreso 0..1: 0 círculo, ~0.5 cielo estrellado, 1 círculo */
  progress: number;
  /** Número de partículas */
  count?: number;
  /** Radio del círculo inicial (px) */
  circleRadius?: number;
  /** Centro del círculo inicial (normalizado 0..1 del viewport) */
  circleCenter?: [number, number];
  /** Radio visual del punto (px @ dpr=1) */
  dotRadius?: number;
  /** Color de las partículas */
  color?: string;
  /** Tamaño/alpha con “profundidad” en el cielo */
  starDepth?: boolean;
  /** Brillo titilante en cielo */
  twinkle?: number;

  /** Forma del campo — por defecto “full” para evitar nubes raras */
  starShape?: "full" | "vignette" | "radial";
  /** Margen interior en px dentro del viewport (aire visual) */
  starMargin?: number;
  /** Warps orgánicos (por defecto desactivados para un campo neutro) */
  starWarp?: {
    barrel?: number; // 0..1
    curl?: number; // 0..1
    curlScale?: number; // 0.5..4
  };
  /** Rotación global del campo de estrellas (radianes) */
  starRotate?: number;

  /** ⬅️ NUEVO: “sangrado” más allá de la pantalla (proporción del viewport) */
  starOverscan?: number; // 0..0.5 típicamente (0.25 = 25% a cada lado)

  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
  pointerEvents?: "auto" | "none";
};

export default function StarMorphCanvas({
  progress,
  count = 3600,
  circleRadius = 240,
  circleCenter = [0.5, 0.55],
  dotRadius = 1.2,
  color = "#FFFFFF",
  starDepth = true,
  twinkle = 0.35,

  starShape = "full",
  starMargin = 0,
  starWarp = { barrel: 0, curl: 0, curlScale: 1.2 },
  starRotate,

  /** overscan por defecto 0.25 = 25% por cada borde → área 1.5× */
  starOverscan = 0.25,

  className,
  style,
  zIndex = 0,
  pointerEvents = "none",
}: Props) {
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

  const data = useMemo(() => {
    const { w, h } = vp;
    if (!w || !h) return null;

    const cx = w * clamp01(circleCenter[0]);
    const cy = h * clamp01(circleCenter[1]);
    const R = circleRadius;

    const circX = new Float32Array(count);
    const circY = new Float32Array(count);
    const starX = new Float32Array(count);
    const starY = new Float32Array(count);
    const starDepthA = new Float32Array(count);
    const seed = new Float32Array(count);

    // Helpers locales
    const rotate = (x: number, y: number, ang: number) => {
      const ca = Math.cos(ang),
        sa = Math.sin(ang);
      return [x * ca - y * sa, x * sa + y * ca] as const;
    };
    const vignetteFalloff = (nx: number, ny: number) => {
      const dx = nx - 0.5,
        dy = ny - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);
      return 1 - smooth01(Math.min(1, (r - 0.25) * 1.9));
    };
    const curl2 = (x: number, y: number, s: number) => {
      const e = 0.001;
      const n1 = noise2((x + e) * s, y * s);
      const n2 = noise2((x - e) * s, y * s);
      const n3 = noise2(x * s, (y + e) * s);
      const n4 = noise2(x * s, (y - e) * s);
      const gx = (n1 - n2) / (2 * e);
      const gy = (n3 - n4) / (2 * e);
      return [-gy, gx] as const;
    };

    const rotGlobal =
      typeof starRotate === "number"
        ? starRotate
        : hash1(999.123) * Math.PI * 2;

    // Área extendida en normalizado:
    // nx,ny ∈ [-o, 1+o], luego se escalan a píxeles sin clamp.
    const o = Math.max(0, Math.min(0.6, starOverscan)); // seguridad 0..0.6

    for (let i = 0; i < count; i++) {
      // Círculo (relleno)
      const u = hash1(i * 19.17 + 7.3);
      const v = hash1(i * 31.77 + 9.1);
      const r = R * Math.sqrt(u);
      const th = 2 * Math.PI * v;
      circX[i] = cx + Math.cos(th) * r;
      circY[i] = cy + Math.sin(th) * r;

      // Base uniforme 0..1 (Hammersley-like sería aún más fino; aquí hash simple)
      let nx = hash1(i * 3.133 + 0.123);
      let ny = hash1(i * 5.271 + 0.777);

      // Rotación global (rompe alineación con ejes)
      {
        const [rx, ry] = rotate(nx - 0.5, ny - 0.5, rotGlobal);
        nx = rx + 0.5;
        ny = ry + 0.5;
      }

      // Forma general
      if (starShape !== "full") {
        const f =
          starShape === "vignette"
            ? vignetteFalloff(nx, ny)
            : smooth01(1 - Math.hypot(nx - 0.5, ny - 0.5) * 1.35);
        nx = 0.5 + (nx - 0.5) * (0.8 + 0.2 * f);
        ny = 0.5 + (ny - 0.5) * (0.8 + 0.2 * f);
      }

      // Warps (opcionales)
      const barrel = clamp01(starWarp?.barrel ?? 0);
      if (barrel > 0) {
        const dx = nx - 0.5,
          dy = ny - 0.5;
        const r2 = dx * dx + dy * dy;
        const g = 1 + 0.6 * barrel * r2;
        nx = 0.5 + dx * g;
        ny = 0.5 + dy * g;
      }
      const curl = clamp01(starWarp?.curl ?? 0);
      const curlScale = starWarp?.curlScale ?? 1.2;
      if (curl > 0) {
        const [cxn, cyn] = curl2(nx + 17.3, ny + 9.7, curlScale);
        nx += cxn * 0.06 * curl;
        ny += cyn * 0.06 * curl;
      }

      // ⬅️ Overscan: expandimos de [0,1] a [-o, 1+o] SIN clamp
      nx = nx * (1 + 2 * o) - o;
      ny = ny * (1 + 2 * o) - o;

      // Margen interior dentro del viewport (opcional, para aire visual)
      const left = starMargin / w;
      const top = starMargin / h;
      const right = 1 - left;
      const bottom = 1 - top;
      // Ojo: el margen solo afecta la porción visible [0,1]; fuera de eso no importa.
      // Mapeamos linealmente solo la parte central:
      nx = nx < 0 ? nx : nx > 1 ? nx : left + nx * (right - left);
      ny = ny < 0 ? ny : ny > 1 ? ny : top + ny * (bottom - top);

      // Escala a píxeles (pueden quedar <0 o >w/ h — perfecto)
      starX[i] = nx * w;
      starY[i] = ny * h;

      // Profundidad + seed
      const d = hash1(i * 11.57 + 4.2);
      starDepthA[i] = d;
      seed[i] = hash1(i * 7.77 + 1.17) * 1000.0;
    }

    return {
      circX,
      circY,
      starX,
      starY,
      starDepthA,
      seed,
      cx,
      cy,
      R,
      w,
      h,
      N: count,
    };
  }, [
    vp.w,
    vp.h,
    count,
    circleRadius,
    circleCenter[0],
    circleCenter[1],
    starShape,
    starMargin,
    starWarp?.barrel,
    starWarp?.curl,
    starWarp?.curlScale,
    starRotate,
    starOverscan,
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

      const t = tRef.current;

      const p = clamp01(progress);
      const spread = 1 - Math.abs(1 - 2 * p); // 0..1..0
      const s = easeInOutCubic(spread);
      const twinkleAmt = twinkle * s;

      ctx.fillStyle = color;

      const { circX, circY, starX, starY, starDepthA, seed: seeds, N } = data;

      for (let i = 0; i < N; i++) {
        const sx = circX[i];
        const sy = circY[i];
        const tx = starX[i];
        const ty = starY[i];

        // Curva Bezier con control suave (ligero giro, sin abanico)
        const mx = (sx + tx) * 0.5;
        const my = (sy + ty) * 0.5;
        const ang = (seeds[i] * 0.001 + t * 0.12) * (p < 0.5 ? 1 : -1);
        const ox = mx - w * 0.5;
        const oy = my - h * 0.5;
        const ctrlScale = 0.96;
        let ctrlX =
          w * 0.5 + (ox * Math.cos(ang) - oy * Math.sin(ang)) * ctrlScale;
        let ctrlY =
          h * 0.5 + (ox * Math.sin(ang) + oy * Math.cos(ang)) * ctrlScale;

        // pequeño empuje perpendicular solo a mitad del morph (quitar “pañuelo”)
        const mid = s * (1 - s); // pico en 0.5
        const perpX = -(ty - sy);
        const perpY = tx - sx;
        const norm = Math.hypot(perpX, perpY) || 1;
        const bump = 0.04 * mid;
        ctrlX += (perpX / norm) * w * bump;
        ctrlY += (perpY / norm) * h * bump;

        const x = quadBezier(sx, ctrlX, tx, s);
        const y = quadBezier(sy, ctrlY, ty, s);

        const depth = starDepth ? starDepthA[i] : 0.5;
        const sizeStar = dotRadius * (0.7 + 1.3 * (1 - depth));
        const alphaStar = 0.45 + 0.55 * (1 - depth);

        const sizeCircle = dotRadius;
        const alphaCircle = 1.0;

        const size = lerp(sizeCircle, sizeStar, s);
        let alpha = lerp(alphaCircle, alphaStar, s);

        if (twinkleAmt > 0) {
          const tw = 0.6 + 0.4 * Math.sin(t * 3.1 + seeds[i] * 0.013);
          alpha *= lerp(1.0, tw, twinkleAmt);
        }

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    draw();
    const tick = () => {
      tRef.current += 0.016;
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [vp, data, color, dotRadius, progress, twinkle, starDepth]);

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
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function smooth01(t: number) {
  return t * t * (3 - 2 * t);
}
function quadBezier(p0: number, p1: number, p2: number, t: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}
function hash1(n: number) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
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
  const tl = hash2(xi, yi),
    tr = hash2(xi + 1, yi);
  const bl = hash2(xi, yi + 1),
    br = hash2(xi + 1, yi + 1);
  const top = tl * (1 - u) + tr * u;
  const bot = bl * (1 - u) + br * u;
  return top * (1 - v) + bot * v;
}
