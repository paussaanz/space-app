// src/components/WeatherTemperature.tsx
import * as React from "react";
import { useOpenMeteo } from "../../hooks/useOpenMeteo";
import Temperature from "../Charts/Temperature";

type Props = {
  lat: number;
  lon: number;
  label?: string;
  min?: number;
  max?: number;
};

export default function WeatherTemperature({
  lat,
  lon,
  label = "Temperature",
  min = -10,
  max = 45,
}: Props) {
  const { temp, desc, trend, loading, error } = useOpenMeteo(lat, lon);

  if (error)
    return (
      <div className="b4" style={{ opacity: 0.8 }}>
        Error al cargar el tiempo.
      </div>
    );
  if (loading || temp == null)
    return (
      <div className="b4" style={{ opacity: 0.8 }}>
        Cargando tiempo…
      </div>
    );

  return (
    <Temperature
      label={`${label} — ${desc}`}
      value={temp}
      min={min}
      max={max}
      unit="°C"
      trend={trend}
    />
  );
}
