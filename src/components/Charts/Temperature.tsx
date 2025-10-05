// src/components/Charts/Temperature.tsx
import * as React from "react";
import { meteo } from "../../lib/http"; // ← usamos el cliente multi-base que ya tienes

export type TemperatureProps = {
  // Presentación
  label?: string;
  value?: number; // si NO usas lat/lon, puedes pasar el valor manual
  min?: number; // escala min
  max?: number; // escala max
  unit?: string; // "°C" | "°F" | custom
  width?: number; // px
  height?: number; // px (grosor barra)
  showTicks?: boolean; // min/mid/max ticks
  trend?: "up" | "down" | "flat"; // permite forzar tendencia (si no, se calcula)
  bands?: { to: number; name: string }[]; // etiquetas por rangos
  className?: string;
  style?: React.CSSProperties;

  // 🔥 Nuevo: modo Open-Meteo
  lat?: number;
  lon?: number;
  refreshMs?: number; // intervalo de refresco (ms). Por defecto: no refetch.
  autoLabelFromWeather?: boolean; // si true, añade la descripción WMO al label
  onData?: (temp: number | null) => void; // callback opcional al recibir datos
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  61: "Rain",
  63: "Rain",
  65: "Rain",
  71: "Snow",
  80: "Rain showers",
  95: "Thunderstorm",
};

export default function Temperature({
  // presentación
  label = "TEMP.",
  value,
  min = -10,
  max = 50,
  unit = "°C",
  width = 420,
  height = 16,
  showTicks = true,
  trend,
  bands = [
    { to: 0, name: "Freezing" },
    { to: 15, name: "Cool" },
    { to: 25, name: "Comfort" },
    { to: 32, name: "Warm" },
    { to: max, name: "Hot" },
  ],
  className,
  style,

  // open-meteo
  lat,
  lon,
  refreshMs,
  autoLabelFromWeather = true,
  onData,
}: TemperatureProps) {
  // ─────────────────────────────────────────────────────────────
  // 1) Fuente del dato: manual (prop value) o remoto (open-meteo)
  // ─────────────────────────────────────────────────────────────
  const useRemote = typeof lat === "number" && typeof lon === "number";
  const [remoteTemp, setRemoteTemp] = React.useState<number | null>(null);
  const [remoteDesc, setRemoteDesc] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<unknown>(null);

  // tendencia interna si no viene por prop
  const lastValRef = React.useRef<number | null>(null);
  const [autoTrend, setAutoTrend] = React.useState<"up" | "down" | "flat">(
    "flat"
  );

  // fetcher Open-Meteo
  const fetchWeather = React.useCallback(async () => {
    if (!useRemote) return;
    try {
      setLoading(true);
      setError(null);
      const data = await meteo.get<{
        current?: { temperature_2m?: number; weather_code?: number };
      }>("/v1/forecast", {
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,weather_code",
        timezone: "auto",
      });

      const t = data.current?.temperature_2m ?? null;
      const code = data.current?.weather_code;
      const desc = code != null ? WMO[code] ?? "Unknown" : null;

      setRemoteTemp(t);
      setRemoteDesc(desc ?? null);
      if (typeof onData === "function") onData(t);

      // tendencia
      if (t != null && lastValRef.current != null) {
        const d = t - lastValRef.current;
        setAutoTrend(Math.abs(d) < 0.05 ? "flat" : d > 0 ? "up" : "down");
      }
      if (t != null) lastValRef.current = t;
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [useRemote, lat, lon, onData]);

  // Primera carga + refresh opcional
  React.useEffect(() => {
    if (!useRemote) return;
    fetchWeather();
    if (!refreshMs) return;
    const id = setInterval(fetchWeather, refreshMs);
    return () => clearInterval(id);
  }, [useRemote, fetchWeather, refreshMs]);

  // valor a mostrar
  const displayValue = useRemote ? remoteTemp ?? value ?? 0 : value ?? 0;
  const effectiveTrend = trend ?? autoTrend;

  // ─────────────────────────────────────────────────────────────
  // 2) Animación de la barra
  // ─────────────────────────────────────────────────────────────
  const pct = clamp01((displayValue - min) / (max - min));
  const [animPct, setAnimPct] = React.useState(pct);
  const prevPct = React.useRef(pct);

  React.useEffect(() => {
    const from = prevPct.current;
    const to = pct;
    const dur = 450; // ms
    const t0 = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const k = clamp01((t - t0) / dur);
      const s = k * k * (3 - 2 * k); // smoothstep
      setAnimPct(lerp(from, to, s));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prevPct.current = pct;
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  // etiqueta de banda (status)
  const status = React.useMemo(() => {
    for (const b of bands) if (displayValue <= b.to) return b.name;
    return bands[bands.length - 1]?.name || "";
  }, [bands, displayValue]);

  // ─────────────────────────────────────────────────────────────
  // 3) Render
  // ─────────────────────────────────────────────────────────────
  const W = width;
  const H = height;
  const R = H / 7;
  const pad = 0;
  const x0 = pad;
  const x1 = W - pad;
  const xVal = lerp(x0, x1, animPct);
  const gid = React.useId();

  const finalLabel =
    useRemote && autoLabelFromWeather && remoteDesc ? `${label}` : label;

  return (
    <div
      className={className ?? "border__bottom p__b-5 h-100"}
      style={{ color: "white", ...style }}
    >
      {/* Estado de carga / error en modo remoto */}
      {useRemote && (
        <div className="b4" style={{ minHeight: 0, opacity: 0.8 }}>
          {loading
            ? "Cargando tiempo…"
            : error
            ? "Error al cargar el tiempo."
            : null}
        </div>
      )}

      <div
        className="flex-col-tem-movil"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 600, opacity: 0.9 }}>
          <h1 className="text__jumbo-2" data-anim="text-anim">
            {finalLabel}
          </h1>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "baseline",
            gap: 10,
          }}
        >
          <div className="text__jumbo" data-anim="text-anim">
            {Number.isFinite(displayValue) ? displayValue.toFixed(1) : "—"}
            {unit}
          </div>

          {effectiveTrend && (
            <span
              className="h2"
              aria-label={`trend ${effectiveTrend}`}
              style={{ opacity: 0.8 }}
            >
              {effectiveTrend === "up"
                ? "⬈"
                : effectiveTrend === "down"
                ? "⬊"
                : "⟷"}
            </span>
          )}
        </div>
      </div>

      {/* Meter */}
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${W} ${H + 24}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${finalLabel} ${displayValue}${unit}`}
      >
        <defs>
          <linearGradient id={`g-${gid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3BA3FF" />
            <stop offset="35%" stopColor="#26D7AE" />
            <stop offset="60%" stopColor="#F6D44D" />
            <stop offset="80%" stopColor="#F59F3B" />
            <stop offset="100%" stopColor="#F05340" />
          </linearGradient>
          <radialGradient id={`dot-${gid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,220,180,0.95)" />
            <stop offset="100%" stopColor="rgba(255,140,0,0.0)" />
          </radialGradient>
        </defs>

        <g transform={`translate(0 6)`}>
          <rect
            x={x0}
            y={0}
            rx={R}
            ry={R}
            width={x1 - x0}
            height={H}
            fill="rgba(255,255,255,0.12)"
          />
          <clipPath id={`clip-${gid}`}>
            <rect
              x={x0}
              y={0}
              rx={R}
              ry={R}
              width={Math.max(0, xVal - x0)}
              height={H}
            />
          </clipPath>
          <rect
            x={x0}
            y={0}
            rx={R}
            ry={R}
            width={x1 - x0}
            height={H}
            fill={`url(#g-${gid})`}
            clipPath={`url(#clip-${gid})`}
          />
          <rect
            x={xVal - 5}
            y={0}
            rx={R}
            width={5}
            height={H}
            ry={R}
            fill="#fff"
            opacity={0.85}
          />
        </g>

        {showTicks && (
          <g className="text__tag" fill="rgba(255,255,255,0.7)">
            <text x={x0} y={H + 22} textAnchor="start">
              {min}
              {unit}
            </text>
            <text x={(x0 + x1) / 2} y={H + 22} textAnchor="middle">
              {status}
            </text>
            <text x={x1} y={H + 22} textAnchor="end">
              {max}
              {unit}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
