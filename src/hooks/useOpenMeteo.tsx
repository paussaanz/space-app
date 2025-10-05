// src/hooks/useOpenMeteo.ts

import { useEffect, useRef, useState } from "react";
import { fetchCurrentWeather } from "../api/openMeto";

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

export function useOpenMeteo(lat: number, lon: number) {
  const [temp, setTemp] = useState<number | null>(null);
  const [desc, setDesc] = useState("—");
  const [trend, setTrend] = useState<"up" | "down" | "flat">("flat");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetchCurrentWeather(lat, lon)
      .then(({ temp, code }) => {
        if (!alive) return;
        setTemp(temp);
        setDesc(code != null ? WMO[code] ?? "Unknown" : "Unknown");

        if (temp != null && last.current != null) {
          const d = temp - last.current;
          setTrend(Math.abs(d) < 0.05 ? "flat" : d > 0 ? "up" : "down");
        }
        if (temp != null) last.current = temp;
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [lat, lon]);

  return { temp, desc, trend, loading, error };
}
