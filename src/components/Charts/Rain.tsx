// src/components/Charts/Rain.tsx (o WeatherSummaryBlock.tsx)
import * as React from "react";
import { meteo } from "../../lib/http";
import WeatherIcon from "../UI/WeatherIcons";

// ====== Tipos existentes ======
export type TempoObservation = {
  cloudFraction?: number;
  aerosolOpticalDepth?: number;
  absorbingAerosolIndex?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  hcho?: number;
  labelOverride?: string;
};

export type WeatherSummaryProps = {
  title?: string;

  // MODO 1: TEMPO (como ya tenías)
  tempo?: TempoObservation;

  // MODO 2: Open-Meteo (novedad)
  lat?: number;
  lon?: number;
  refreshMs?: number; // refresco opcional

  iconSize?: number; // px, por defecto 126
  className?: string;
  style?: React.CSSProperties;
  color?: string; // color principal del icono
  accent?: string; // color acento del icono
};

type Condition =
  | "sunny"
  | "cloudy"
  | "partly"
  | "rain"
  | "snow"
  | "fog"
  | "thunder";

const mapToIconKind = (
  c: Condition
): "sun" | "cloud" | "sun-cloud" | "cloud-rain" | "thunderstorm" => {
  switch (c) {
    case "sunny":
      return "sun";
    case "cloudy":
      return "cloud";
    case "partly":
      return "sun-cloud";
    case "rain":
      return "cloud-rain";
    case "thunder":
      return "thunderstorm";
    case "fog":
      return "cloud";
    case "snow":
      // si tienes "cloud-snow", cámbialo aquí
      return "cloud-rain";
    default:
      return "cloud";
  }
};

/** ====== UMBRALES TEMPO (como los tenías) ====== */
const THRESHOLDS = {
  cloud: { clear: 0.3, broken: 0.7 }, // <0.3 despejado, 0.3–0.7 parcial, >0.7 nublado
  aod: { haze: 0.4, heavyHaze: 0.8 },
  uvai: { smokeDust: 1.0 },
  no2: { elevated: 3e-5, high: 7e-5 },
  o3: { elevated: 6e-5, high: 1.2e-4 },
  so2: { elevated: 5e-6, high: 1.5e-5 },
  hcho: { elevated: 5e-6, high: 1.2e-5 },
};

// ====== Derivación desde TEMPO (como tenías) ======
function deriveConditionFromTempo(t: TempoObservation): Condition {
  const cf = t.cloudFraction ?? 0;
  const aod = t.aerosolOpticalDepth ?? 0;
  const uvai = t.absorbingAerosolIndex ?? 0;

  let cond: Condition =
    cf < THRESHOLDS.cloud.clear
      ? "sunny"
      : cf < THRESHOLDS.cloud.broken
      ? "partly"
      : "cloudy";

  if (aod >= THRESHOLDS.aod.heavyHaze || uvai >= THRESHOLDS.uvai.smokeDust)
    cond = "fog";
  return cond;
}
function deriveStatusFromTempo(t: TempoObservation): string {
  if (t.labelOverride) return t.labelOverride;

  const cf = t.cloudFraction ?? 0;
  const aod = t.aerosolOpticalDepth ?? 0;
  const uvai = t.absorbingAerosolIndex ?? 0;

  if (aod >= THRESHOLDS.aod.heavyHaze) return "HEAVY HAZE";
  if (uvai >= THRESHOLDS.uvai.smokeDust) return "SMOKE / DUST";
  if (aod >= THRESHOLDS.aod.haze) return "HAZY";
  if (cf < THRESHOLDS.cloud.clear) return "CLEAR SKY";
  if (cf < THRESHOLDS.cloud.broken) return "PARTLY CLOUDY";
  return cf > 0.9 ? "OVERCAST" : "MOSTLY CLOUDY";
}
function deriveIntensityFromTempo(t: TempoObservation) {
  const notes: string[] = [];
  const pushBand = (
    name: string,
    v: number | undefined,
    bands: { elevated: number; high: number }
  ) => {
    if (v == null) return;
    if (v >= bands.high) notes.push(`${name} high`);
    else if (v >= bands.elevated) notes.push(`${name} elevated`);
  };
  pushBand("NO₂", t.no2, THRESHOLDS.no2);
  pushBand("O₃", t.o3, THRESHOLDS.o3);
  pushBand("SO₂", t.so2, THRESHOLDS.so2);
  pushBand("HCHO", t.hcho, THRESHOLDS.hcho);

  if (t.aerosolOpticalDepth != null) {
    if (t.aerosolOpticalDepth >= THRESHOLDS.aod.heavyHaze)
      notes.push("Aerosols very high");
    else if (t.aerosolOpticalDepth >= THRESHOLDS.aod.haze)
      notes.push("Aerosols elevated");
  }
  return notes.length ? notes.join(" · ") : undefined;
}

// ====== Derivación desde Open-Meteo ======
type OMCurrent = {
  weather_code?: number;
  cloud_cover?: number; // 0..100
  precipitation?: number; // mm
  rain?: number; // mm
  showers?: number; // mm
  snowfall?: number; // cm
  is_day?: number; // 1/0
};

const WMO_TO_CONDITION = (code?: number): Condition => {
  if (code == null) return "cloudy";
  // grupos principales WMO (simplificados)
  if ([0].includes(code)) return "sunny"; // Clear
  if ([1, 2].includes(code)) return "partly"; // Mainly clear / partly cloudy
  if ([3].includes(code)) return "cloudy"; // Overcast
  if ([45, 48].includes(code)) return "fog"; // Fog / rime fog
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code))
    return "rain"; // drizzle/rain/showers
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow"; // snow
  if ([95, 96, 99].includes(code)) return "thunder"; // thunderstorm
  return "cloudy";
};

const WMO_TO_STATUS = (code?: number): string => {
  if (code == null) return "UNKNOWN";
  const t: Record<number, string> = {
    0: "CLEAR SKY",
    1: "MAINLY CLEAR",
    2: "PARTLY CLOUDY",
    3: "OVERCAST",
    45: "FOG",
    48: "RIME FOG",
    51: "LIGHT DRIZZLE",
    53: "DRIZZLE",
    55: "HEAVY DRIZZLE",
    56: "FREEZING DRIZZLE",
    57: "HEAVY FREEZING DRIZZLE",
    61: "LIGHT RAIN",
    63: "RAIN",
    65: "HEAVY RAIN",
    71: "LIGHT SNOW",
    73: "SNOW",
    75: "HEAVY SNOW",
    77: "SNOW GRAINS",
    80: "LIGHT SHOWERS",
    81: "SHOWERS",
    82: "HEAVY SHOWERS",
    85: "SNOW SHOWERS",
    86: "HEAVY SNOW SHOWERS",
    95: "THUNDERSTORM",
    96: "THUNDER + HAIL",
    99: "SEVERE THUNDER + HAIL",
  };
  return t[code] ?? "UNKNOWN";
};

export default function WeatherSummaryBlock({
  title = "WEATHER",
  tempo, // si viene, usamos TEMPO
  lat,
  lon, // si vienen, usamos Open-Meteo
  refreshMs,
  iconSize = 126,
  className,
  style,
  color = "#fff",
  accent = "#6EC1FF",
}: WeatherSummaryProps) {
  const useOpenMeteo = typeof lat === "number" && typeof lon === "number";

  // Estado Open-Meteo
  const [om, setOm] = React.useState<OMCurrent | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<unknown>(null);

  const fetchOM = React.useCallback(async () => {
    if (!useOpenMeteo) return;
    try {
      setLoading(true);
      setError(null);
      const data = await meteo.get<{ current?: OMCurrent }>("/v1/forecast", {
        latitude: lat,
        longitude: lon,
        current:
          "weather_code,cloud_cover,precipitation,rain,showers,snowfall,is_day",
        timezone: "auto",
      });
      setOm(data.current ?? null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [useOpenMeteo, lat, lon]);

  React.useEffect(() => {
    if (!useOpenMeteo) return;
    fetchOM();
    if (!refreshMs) return;
    const id = setInterval(fetchOM, refreshMs);
    return () => clearInterval(id);
  }, [useOpenMeteo, fetchOM, refreshMs]);

  // Derivar UI segun modo
  let condition: Condition = "cloudy";
  let statusText = "—";
  let intensityText: string | undefined;

  if (useOpenMeteo && om) {
    condition = WMO_TO_CONDITION(om.weather_code);
    statusText = WMO_TO_STATUS(om.weather_code);
    // “intensidad” simple con precipitación / nubosidad
    const notes: string[] = [];
    if ((om.rain ?? 0) > 0) notes.push(`Rain ${om.rain?.toFixed(1)} mm`);
    if ((om.showers ?? 0) > 0)
      notes.push(`Showers ${om.showers?.toFixed(1)} mm`);
    if ((om.snowfall ?? 0) > 0)
      notes.push(`Snow ${om.snowfall?.toFixed(1)} cm`);
    if (om.cloud_cover != null) notes.push(`Clouds ${om.cloud_cover}%`);
    intensityText = notes.length ? notes.join(" · ") : undefined;
  } else if (!useOpenMeteo && tempo) {
    condition = deriveConditionFromTempo(tempo);
    statusText = deriveStatusFromTempo(tempo);
    intensityText = deriveIntensityFromTempo(tempo);
  } else {
    statusText = "NO DATA";
  }

  const kind = mapToIconKind(condition);

  return (
    <div
      className={`flex-col-rain-movil ${className ?? ""}`}
      style={{
        color: "white",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 16,
        ...style,
      }}
    >
      {/* Columna izquierda: título + estado */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, opacity: 0.9, marginBottom: 6 }}>
          <h1 className="text__jumbo-2" data-anim="text-anim">
            {title}
          </h1>
        </div>

        <div
          className="text__transform-uppercase overflow__hidden"
          style={{
            fontWeight: 700,
            letterSpacing: 0.5,
            opacity: 0.95,
            fontSize: 18,
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          data-anim="text-anim"
        >
          {useOpenMeteo && loading
            ? "LOADING…"
            : useOpenMeteo && error
            ? "ERROR"
            : statusText}
        </div>
      </div>

      {/* Columna derecha: icono + intensidad */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <WeatherIcon
          kind={kind}
          size={iconSize}
          color={color}
          secondary={accent}
          strokeWidth={4}
        />
        {intensityText && (
          <div
            style={{
              fontSize: 12,
              opacity: 0.8,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
            data-anim="text-anim"
          >
            {intensityText}
          </div>
        )}
      </div>
    </div>
  );
}
