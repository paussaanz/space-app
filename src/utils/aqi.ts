// src/utils/aqi.ts
export type AQICategory =
  | "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE"
  | "UNHEALTHY" | "VERY_UNHEALTHY" | "HAZARDOUS";

export function aqiCategory(aqi: number): AQICategory {
  if (aqi <= 50) return "GOOD";
  if (aqi <= 100) return "MODERATE";
  if (aqi <= 150) return "UNHEALTHY_SENSITIVE";
  if (aqi <= 200) return "UNHEALTHY";
  if (aqi <= 300) return "VERY_UNHEALTHY";
  return "HAZARDOUS";
}

export function categoryLabel(cat: AQICategory) {
  switch (cat) {
    case "GOOD": return "Good";
    case "MODERATE": return "Moderate";
    case "UNHEALTHY_SENSITIVE": return "Unhealthy for Sensitive Groups";
    case "UNHEALTHY": return "Unhealthy";
    case "VERY_UNHEALTHY": return "Very Unhealthy";
    case "HAZARDOUS": return "Hazardous";
  }
}

export function categoryColor(cat: AQICategory) {
  // Ajusta a tu paleta
  switch (cat) {
    case "GOOD": return "#4CAF50";
    case "MODERATE": return "#FFEB3B";
    case "UNHEALTHY_SENSITIVE": return "#FFA726";
    case "UNHEALTHY": return "#F44336";
    case "VERY_UNHEALTHY": return "#8E24AA";
    case "HAZARDOUS": return "#6D4C41";
  }
}

export function aqiFromPM25(x: number) {
  const bp = [
    [0,12,0,50],[12.1,35.4,51,100],[35.5,55.4,101,150],
    [55.5,150.4,151,200],[150.5,250.4,201,300],[250.5,500.4,301,500],
  ];
  const b = bp.find(([cL,cH]) => x>=cL && x<=cH);
  if(!b) return undefined;
  const [cL,cH,aL,aH] = b;
  return Math.round(((aH-aL)/(cH-cL))*(x-cL)+aL);
}
