// WeatherSummaryBlock.tsx
import * as React from "react";
import WeatherIcon from "../UI/WeatherIcons";

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
  tempo: TempoObservation; // <-- obligatorio, TODO se deriva de aquí
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
      return "cloud-rain"; // añade "cloud-snow" en WeatherIcons si quieres
    default:
      return "cloud";
  }
};

/** UMBRALES — Ajusta a las UNIDADES reales de tu API TEMPO */
const THRESHOLDS = {
  cloud: { clear: 0.3, broken: 0.7 }, // <0.3 despejado, 0.3–0.7 parcial, >0.7 nublado
  aod: { haze: 0.4, heavyHaze: 0.8 }, // bruma >0.4, bruma intensa >0.8
  uvai: { smokeDust: 1.0 }, // humo/polvo significativo
  // Bandas de trazas (ejemplo). Calibra con tus escalas/unidades:
  no2: { elevated: 3e-5, high: 7e-5 },
  o3: { elevated: 6e-5, high: 1.2e-4 },
  so2: { elevated: 5e-6, high: 1.5e-5 },
  hcho: { elevated: 5e-6, high: 1.2e-5 },
};

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

  // Si hay bruma intensa o humo/polvo, visualmente mostramos niebla
  if (aod >= THRESHOLDS.aod.heavyHaze || uvai >= THRESHOLDS.uvai.smokeDust) {
    cond = "fog";
  }

  return cond;
}

function deriveStatusFromTempo(
  t: TempoObservation,
  baseCond: Condition
): string {
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

export default function WeatherSummaryBlock({
  title = "WEATHER",
  tempo,
  iconSize = 126,
  className,
  style,
  color = "#fff",
  accent = "#6EC1FF",
}: WeatherSummaryProps) {
  // 1) Derivar todo desde TEMPO
  const condition = deriveConditionFromTempo(tempo);
  const statusText = deriveStatusFromTempo(tempo, condition);
  const intensityText = deriveIntensityFromTempo(tempo);

  // 2) Icono según condición
  const kind = mapToIconKind(condition);

  return (
    <div
      className={`flex-col-rain-movil ${className}`}
      style={{
        color: "white",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: 16,
        ...style,
      }}
    >
      {/* Columna izquierda: título + estado en texto */}
      <div  style={{ minWidth: 0 }}>
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
          {statusText}
        </div>
      </div>

      {/* Columna derecha: icono + intensidad debajo */}
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
