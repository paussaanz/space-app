// src/notifications/aqiAlerts.ts
import { useRef } from "react";
import { useNotifications } from "../providers/NotificationsProvider";
import { aqiCategory, categoryLabel } from "../utils/aqi";

export function useAQIAlerts() {
  const { add } = useNotifications();
  const lastCategoryRef = useRef<string | null>(null);

  function notifyIfBad(
    aqi: number,
    opts?: { city?: string; dominant?: string; when?: Date }
  ) {
    const cat = aqiCategory(aqi);
    const isBad = [
      "UNHEALTHY_SENSITIVE",
      "UNHEALTHY",
      "VERY_UNHEALTHY",
      "HAZARDOUS",
    ].includes(cat);
    const label = categoryLabel(cat);
    const changed = lastCategoryRef.current !== cat;

    if (isBad && changed) {
      lastCategoryRef.current = cat;
      const city = opts?.city ? ` · ${opts.city}` : "";
      const when = opts?.when
        ? ` – ${opts.when.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        : "";
      const dom = opts?.dominant
        ? `Dominant: ${opts.dominant.toUpperCase()}`
        : "";

      add({
        title: `AQI ${aqi} (${label})${city}${when}`,
        body:
          dom ||
          "Air quality is deteriorating. Consider limiting outdoor activity.",
        level: cat === "HAZARDOUS" ? "error" : "warn",
        meta: { aqi, category: cat },
      });
    }
    // Si mejora mucho, también avisa
    if (!isBad && changed) {
      lastCategoryRef.current = cat;
      add({
        title: `Air quality improved: ${aqi} (${label})`,
        body: "Conditions are safer now.",
        level: "info",
        meta: { aqi, category: cat },
      });
    }
  }

  return { notifyIfBad };
}
