import { useCallback, useEffect, useRef, useState } from "react";

export type AqiMeta = { city?: string; dominant?: string; when?: Date };

type PopupData = {
  aqi: number;
  meta?: AqiMeta;
  level: "unhealthy" | "very-unhealthy" | "hazardous";
};

const SUPPRESS_KEY = "aqi-popup-suppress-until";

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function classifyAQI(aqi: number): PopupData["level"] | null {
  if (aqi >= 301) return "hazardous"; // Peligroso
  if (aqi >= 201) return "very-unhealthy"; // Muy perjudicial
  if (aqi >= 151) return "unhealthy"; // Perjudicial
  return null;
}

function isSuppressedNow(): boolean {
  try {
    const until = Number(localStorage.getItem(SUPPRESS_KEY) || 0);
    return until && Date.now() < until;
  } catch {
    return false;
  }
}

export function useAqiPopup() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PopupData | null>(null);
  const lastShownLevel = useRef<PopupData["level"] | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const suppressToday = useCallback(() => {
    try {
      localStorage.setItem(SUPPRESS_KEY, String(endOfToday()));
    } catch {}
    setOpen(false);
  }, []);

  const maybeOpenForAqi = useCallback(
    (aqi: number, meta?: AqiMeta) => {
      const level = classifyAQI(aqi);
      if (!level) return;

      // Evita re-abrir si ya está suprimido hoy
      if (isSuppressedNow()) return;

      // Evita parpadeos si re-llega el mismo nivel
      if (lastShownLevel.current === level && open) return;

      lastShownLevel.current = level;
      setData({ aqi, meta, level });
      setOpen(true);
    },
    [open]
  );

  return { open, data, close, suppressToday, maybeOpenForAqi };
}
