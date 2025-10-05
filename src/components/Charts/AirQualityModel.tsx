import React, { useEffect, useMemo, useState } from "react";
import { useAQIAlerts } from "../../notifications/AqiAlerts";

/** =========================
 *  1) Tipos y utilidades
 *  ========================= */

export type Pollutant = "pm25" | "pm10" | "o3" | "no2" | "so2" | "co";
export type HourlyPoint = {
  t: string; // ISO
  conc: Partial<Record<Pollutant, number>>; // μg/m³ (o ppb → conviértelo en tu provider real)
  aqi: Partial<Record<Pollutant, number>>;
  aqiMax: { pollutant: Pollutant; value: number };
  met?: { ws?: number; wd?: number; rain?: number }; // opcional, para textos/insights
};
export type ForecastResponse = {
  location: { lat: number; lon: number; name?: string };
  now: HourlyPoint;
  next48h: HourlyPoint[];
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** AQI simplificado – completa tablas luego si quieres más precisión */
type Bp = { cLow: number; cHigh: number; aqiLow: number; aqiHigh: number };
const PM25_BP: Bp[] = [
  { cLow: 0, cHigh: 12, aqiLow: 0, aqiHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, aqiLow: 301, aqiHigh: 500 },
];
// Para ejemplo: reusa PM2.5 como placeholder para otros (ajusta al integrar TEMPO)
const DEFAULT_BP = PM25_BP;

function aqiFromConc(conc: number, bp: Bp[] = DEFAULT_BP) {
  const b = bp.find((r) => conc >= r.cLow && conc <= r.cHigh);
  if (!b) return undefined;
  return Math.round(
    ((b.aqiHigh - b.aqiLow) / (b.cHigh - b.cLow)) * (conc - b.cLow) + b.aqiLow
  );
}

function aqiCategory(aqi?: number) {
  if (aqi === undefined) return { name: "Unknown", color: "#9aa0a6" };
  if (aqi <= 50) return { name: "Good", color: "#2ecc71" };
  if (aqi <= 100) return { name: "Moderate", color: "#f1c40f" };
  if (aqi <= 150) return { name: "Unhealthy (SG)", color: "#e67e22" };
  if (aqi <= 200) return { name: "Unhealthy", color: "#e74c3c" };
  if (aqi <= 300) return { name: "Very Unhealthy", color: "#8e44ad" };
  return { name: "Hazardous", color: "#7f1d1d" };
}

/** =========================
 *  2) Proveedor de datos
 *  ========================= */

export interface IAirQualityProvider {
  getForecast(lat: number, lon: number): Promise<ForecastResponse>;
}

/** ----- MockTempoProvider: genera 48 h sintéticas pero realistas ----- */
export class MockTempoProvider implements IAirQualityProvider {
  constructor(private opts: { seed?: number } = {}) {}
  async getForecast(lat: number, lon: number): Promise<ForecastResponse> {
    const now = new Date();
    const points: HourlyPoint[] = [];
    // Patrón diurno: picos tarde/noche para NO2/PM, mediodía para O3
    for (let h = 0; h < 49; h++) {
      const t = new Date(now.getTime() + h * 3600_000);
      const hour = t.getHours();
      const dayFrac = (hour + t.getMinutes() / 60) / 24;

      // Señales base (ajústalas a tu gusto)
      const o3 = 40 + 20 * Math.sin(Math.PI * (dayFrac - 0.2)) + rand(-5, 5);
      const no2 = 25 + 35 * peak(hour, [8, 21]) + rand(-4, 4);
      const pm25 = 10 + 25 * peak(hour, [7, 22]) + rainWash(h) + rand(-3, 3);

      const conc = {
        o3: Math.max(1, o3),
        no2: Math.max(1, no2),
        pm25: Math.max(1, pm25),
      } as HourlyPoint["conc"];

      const aqi: HourlyPoint["aqi"] = {
        o3: aqiFromConc(conc.o3!),
        no2: aqiFromConc(conc.no2!),
        pm25: aqiFromConc(conc.pm25!),
      };
      const pairs = Object.entries(aqi).filter(([, v]) => v !== undefined) as [
        Pollutant,
        number
      ][];
      const worst = pairs.length
        ? pairs.reduce((a, b) => (a[1] >= b[1] ? a : b))
        : (["pm25", 0] as [Pollutant, number]);

      points.push({
        t: t.toISOString(),
        conc,
        aqi,
        aqiMax: { pollutant: worst[0], value: worst[1] },
        met: {
          ws: 1 + 3 * Math.sin(Math.PI * (dayFrac + 0.1)) + rand(-0.5, 0.5),
          rain: rainFlag(h) ? Math.max(0, 2 + rand(-0.5, 1.5)) : 0,
        },
      });
    }
    return {
      location: { lat, lon },
      now: points[0],
      next48h: points.slice(1),
    };

    function rand(a: number, b: number) {
      return a + Math.random() * (b - a);
    }
    function peak(hour: number, centers: number[]) {
      // Suma de picos gaussianos suaves en horas dadas
      const s = centers
        .map((c) => Math.exp(-Math.pow((hour - c) / 3, 2)))
        .reduce((x, y) => x + y, 0);
      return clamp01(s); // 0..~2 → 0..1
    }
    function rainFlag(h: number) {
      // lluvia intermitente bloques de 6h
      return Math.floor(h / 6) % 4 === 1;
    }
    function rainWash(h: number) {
      // si llueve, reduce PM en horas posteriores
      return rainFlag(h) ? -6 : 0;
    }
  }
}

/** =========================
 *  3) Hook de consumo
 *  ========================= */

export function useAirQuality(
  provider: IAirQualityProvider,
  lat: number,
  lon: number
) {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    provider
      .getForecast(lat, lon)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message ?? "Unknown error");
        setData(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [provider, lat, lon]);

  return { data, error, loading };
}

/** =========================
 *  4) Componentes UI
 *  ========================= */

/** Colores AQI por valor */
function aqiColor(v: number | undefined) {
  return aqiCategory(v).color;
}

function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AirQualityPanel({
  provider,
  lat,
  lon,
  placeName,
}: {
  provider?: IAirQualityProvider;
  lat: number;
  lon: number;
  placeName?: string;
}) {
  const providerInstance = useMemo(
    () => provider ?? new MockTempoProvider(),
    [provider]
  );
  const { data, loading, error } = useAirQuality(providerInstance, lat, lon);

  // 👇 Notificaciones AQI
  const { notifyIfBad } = useAQIAlerts();
  useEffect(() => {
    if (!data) return;
    const nowAQI = data.now.aqiMax.value;
    const dominant = data.now.aqiMax.pollutant;
    notifyIfBad(nowAQI, {
      city: placeName,
      dominant,
      when: new Date(data.now.t),
    });
  }, [data, placeName, notifyIfBad]);

  if (loading) return <SkeletonPanel placeName={placeName} />;
  if (error || !data) return <div style={styles.card}>Error: {error}</div>;

  const nowAQI = data.now.aqiMax.value;
  const cat = aqiCategory(nowAQI);

  return (
    <div className="flex-col-airmodel-movil" style={{ display: "grid", gap: 16 }}>
      <div style={styles.card}>
        <div>
          <p className="text__white h5 p__b-2" style={styles.subtitle}>
            {placeName ?? "Your area"} · {new Date(data.now.t).toLocaleString()}
          </p>
          <div className="flex flex__row flex__j__between">
            <div className="flex flex__col">
              <p className="text__jumbo" style={{ color: cat.color }}>
                AQI
              </p>
              <p className="text__transform-uppercase text__white p__t-4">
                {cat.name}
              </p>
            </div>
            <p className="text__jumbo" style={{ color: cat.color }}>
              {nowAQI}
            </p>
          </div>
          <div style={styles.badgeRow}>
            {Object.entries(data.now.aqi).map(([k, v]) => (
              <span
                key={k}
                style={{ ...styles.badge, background: aqiColor(v) }}
              >
                {k.toUpperCase()}: {v ?? "—"}
              </span>
            ))}
          </div>

          {/* <LandscapeSilhouette
            width={220}
            height={80}
            aqiColor={cat.color}
            calmFactor={1 - clamp01((data.now.met?.ws ?? 0) / 5)} // más calmado si poco viento
          /> */}
        </div>
      </div>

      <div style={styles.card}>
        <h3 className="text__white h5">Próximas 48 h</h3>
        <HorizonChart points={[data.now, ...data.next48h]} />
        <div className="text__white p__t-4">
          Dominante ahora: <b>{data.now.aqiMax.pollutant.toUpperCase()}</b> ·
          mejor hora:{" "}
          <b>{bestHour(data.next48h)?.time /* hora con AQI mínimo en 48h */}</b>
        </div>
      </div>
    </div>
  );

  function bestHour(arr: HourlyPoint[]) {
    if (!arr.length) return null;
    let best = arr[0];
    for (const p of arr) {
      if (p.aqiMax.value < best.aqiMax.value) best = p;
    }
    return { time: formatHour(best.t), aqi: best.aqiMax.value };
  }
}

/** Skeleton de carga (sin dependencias) */
function SkeletonPanel({ placeName }: { placeName?: string }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={styles.card}>
        <div style={styles.skelTitle} />
        <div style={styles.skelBar} />
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <div style={styles.skelChip} />
          <div style={styles.skelChip} />
          <div style={styles.skelChip} />
        </div>
      </div>
      <div style={styles.card}>
        <div style={styles.skelTitle} />
        <div style={{ height: 120, background: "#f3f4f6", borderRadius: 8 }} />
      </div>
    </div>
  );
}

/** Gráfico de horizonte (SVG puro) usando AQI máximo por hora */
function HorizonChart({ points }: { points: HourlyPoint[] }) {
  const w = 640;
  const h = 140;
  const pad = 24;

  const xs = useMemo(() => {
    const n = points.length;
    return points.map((_, i) => pad + (i * (w - 2 * pad)) / (n - 1));
  }, [points]);
  const ys = useMemo(() => {
    const max = 300; // normaliza a 0..300 (suficiente)
    return points.map((p) => {
      const v = clamp01(p.aqiMax.value / max);
      return lerp(h - pad, pad, v);
    });
  }, [points]);

  const path = useMemo(() => {
    return xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x},${ys[i]}`).join(" ");
  }, [xs, ys]);

  const area = useMemo(() => {
    return (
      `M ${xs[0]},${h - pad} ` +
      xs.map((x, i) => `L ${x},${ys[i]}`).join(" ") +
      ` L ${xs[xs.length - 1]},${h - pad} Z`
    );
  }, [xs, ys]);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {/* ejes ligeros */}
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#ddd" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#eee" />
      {/* área de fondo coloreada por valor medio */}
      <defs>
        <linearGradient id="aqiGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e74c3c" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#2ecc71" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#aqiGrad)" />
      {/* línea */}
      <path d={path} fill="none" stroke="#fff" strokeWidth={1.8} />
      {/* puntos cada 6 horas */}
      {points.map((p, i) =>
        i % 6 === 0 ? (
          <g key={i}>
            <circle
              cx={xs[i]}
              cy={ys[i]}
              r={3.2}
              fill={aqiColor(points[i].aqiMax.value)}
            />
            <text
              x={xs[i]}
              y={h - 6}
              fontSize={9}
              textAnchor="middle"
              fill="#555"
            >
              {new Date(p.t).getHours().toString().padStart(2, "0")}h
            </text>
          </g>
        ) : null
      )}
    </svg>
  );
}

/** Silueta de paisaje estilizada (sin DEM aún). Usa ruido suave + color AQI */
function LandscapeSilhouette({
  width = 240,
  height = 80,
  aqiColor = "#2ecc71",
  calmFactor = 0.5, // 0: ondulado, 1: plano (calma)
}: {
  width?: number;
  height?: number;
  aqiColor?: string;
  calmFactor?: number;
}) {
  // Genera un perfil fijo en el render (sin animación)
  const n = 8;
  const pts = useMemo(() => {
    const arr: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width;
      const base = height * 0.65;
      const amp = lerp(12, 2, clamp01(calmFactor));
      const y =
        base -
        amp *
          (Math.sin(i * 0.9) +
            0.6 * Math.sin(i * 1.7 + 0.8) +
            0.4 * Math.sin(i * 2.3 + 1.4));
      arr.push({ x, y });
    }
    return arr;
  }, [width, height, calmFactor]);

  const d =
    `M 0 ${height} L 0 ${pts[0].y.toFixed(1)} ` +
    pts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    ` L ${width} ${height} Z`;

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={aqiColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={aqiColor} stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <path d={d} fill="url(#fillGrad)" stroke={aqiColor} strokeOpacity={0.5} />
    </svg>
  );
}

/** =========================
 *  5) Estilos inline mínimos
 *  ========================= */

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 12,
    padding: 16,
  },
  title: { fontSize: 28, fontWeight: 700, marginTop: 4 },
  badgeRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  badge: {
    padding: "4px 8px",
    color: "white",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
  skelTitle: {
    width: 180,
    height: 14,
    background: "#f3f4f6",
    borderRadius: 6,
    marginBottom: 8,
  },
  skelBar: {
    width: "60%",
    height: 28,
    background: "#f3f4f6",
    borderRadius: 8,
  },
  skelChip: {
    width: 60,
    height: 18,
    background: "#f3f4f6",
    borderRadius: 8,
  },
};
