// src/contexts/LocationContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type Coords = { lat: number; lon: number };
type Precision = "exact" | "approx" | "none";
type Status = "idle" | "requesting" | "ready" | "error";

type LocationState = {
  status: Status;
  coords: Coords | null;
  precision: Precision;
  error: string | null;
};

type LocationContextValue = LocationState & {
  requestLocation: () => Promise<void>;
  refreshApproxByIp: () => Promise<void>;
};

const LocationContext = createContext<LocationContextValue | null>(null);

async function getApproxByIp(): Promise<Coords | null> {
  try {
    const res = await fetch("/api/location/approx"); // tu endpoint de fallback por IP
    if (!res.ok) return null;
    const { lat, lon } = await res.json();
    return typeof lat === "number" && typeof lon === "number"
      ? { lat, lon }
      : null;
  } catch {
    return null;
  }
}

function quantize(n: number, decimals = 3) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocationState>({
    status: "idle",
    coords: null,
    precision: "none",
    error: null,
  });

  // Evita peticiones duplicadas simultáneas
  const inFlight = useRef(false);

  const requestLocation = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState((s) => ({ ...s, status: "requesting", error: null }));

    if (!("geolocation" in navigator)) {
      setState({
        status: "error",
        coords: null,
        precision: "none",
        error: "Geolocalización no soportada",
      });
      inFlight.current = false;
      return;
    }

    // Pedimos posición exacta
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = quantize(pos.coords.latitude, 3); // ~110m
          const lon = quantize(pos.coords.longitude, 3);
          setState({
            status: "ready",
            coords: { lat, lon },
            precision: "exact",
            error: null,
          });
          resolve();
        },
        async () => {
          // Fallback por IP si usuario deniega o falla
          const approx = await getApproxByIp();
          if (approx) {
            setState({
              status: "ready",
              coords: approx,
              precision: "approx",
              error: null,
            });
          } else {
            setState({
              status: "error",
              coords: null,
              precision: "none",
              error: "No se pudo obtener la ubicación",
            });
          }
          resolve();
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
      );
    });

    inFlight.current = false;
  }, []);

  const refreshApproxByIp = useCallback(async () => {
    setState((s) => ({ ...s, status: "requesting", error: null }));
    const approx = await getApproxByIp();
    if (approx) {
      setState({
        status: "ready",
        coords: approx,
        precision: "approx",
        error: null,
      });
    } else {
      setState({
        status: "error",
        coords: null,
        precision: "none",
        error: "No se pudo estimar por IP",
      });
    }
  }, []);

  const value = useMemo<LocationContextValue>(
    () => ({ ...state, requestLocation, refreshApproxByIp }),
    [state, requestLocation, refreshApproxByIp]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error("useLocation debe usarse dentro de <LocationProvider>");
  return ctx;
}
