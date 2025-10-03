"use client";
import maplibregl, {
  LngLatLike,
  MapMouseEvent,
  Map as MLMap,
} from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { aqiFromPM25 } from "../../utils/aqi";

/* =======================
   Tipos y props
   ======================= */
type Props = {
  center?: [number, number]; // [lon, lat]
  zoom?: number;
  styleUrl: string;
  useOpenAQ?: boolean;
  height?: number;
  onPickLocation?: (lat: number, lon: number) => void;
  lockToNorthAmerica?: boolean;
  fitNorthAmericaOnLoad?: boolean;
};

type Point = {
  lon: number;
  lat: number;
  value: number;
  aqi: number;
  time?: string;
  source: "mock" | "openaq";
};

type BBox = [number, number, number, number];

/* =======================
   Utils
   ======================= */
function debounce<T extends (...args: any[]) => void>(fn: T, ms = 500) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Divide un BBOX grande en nx*ny sub-bboxes
function splitBBox([W, S, E, N]: BBox, nx = 3, ny = 2): BBox[] {
  const dx = (E - W) / nx;
  const dy = (N - S) / ny;
  const out: BBox[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      out.push([W + i * dx, S + j * dy, W + (i + 1) * dx, S + (j + 1) * dy]);
    }
  }
  return out;
}

// Llama al endpoint vía proxy (evita CORS); lanza si no ok
async function fetchOpenAQLatestBBox(bbox: BBox, page = 1, limit = 1000) {
  const [W, S, E, N] = bbox;
  const url = `/openaq/v2/latest?parameter=pm25&bbox=${W},${S},${E},${N}&limit=${limit}&page=${page}&order_by=coordinates&sort=asc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Loader robusto: tiles + paginado + dedupe + tolerante a 410/429
async function loadOpenAQTiled(bbox: BBox): Promise<Point[]> {
  const tiles = splitBBox(bbox, 3, 2);
  const out: Point[] = [];
  const seen = new Set<string>();

  for (const t of tiles) {
    for (let page = 1; page <= 5; page++) {
      try {
        const json = await fetchOpenAQLatestBBox(t, page, 1000);
        const results = json?.results ?? [];
        if (!results.length) break;

        for (const r of results) {
          const la = r?.coordinates?.latitude;
          const lo = r?.coordinates?.longitude;
          const m = (r?.measurements ?? []).find(
            (x: any) => x.parameter === "pm25"
          );
          if (typeof la !== "number" || typeof lo !== "number" || !m) continue;
          const key = `${la.toFixed(4)},${lo.toFixed(4)}`; // de-dupe espacial
          if (seen.has(key)) continue;
          const value = Number(m.value);
          const aqi = aqiFromPM25(value);
          if (aqi == null) continue;
          seen.add(key);
          out.push({
            lat: la,
            lon: lo,
            value,
            aqi,
            time: m.lastUpdated,
            source: "openaq",
          });
        }

        if (results.length < 1000) break; // última página del tile
      } catch (e) {
        console.warn("OpenAQ tile error", t, e); // 410/429/etc
        break; // salta a siguiente tile
      }
    }
  }

  return out.length > 8000 ? out.filter((_, i) => i % 2 === 0) : out;
}

// Mock: nube amplia (fallback visual en dev/offline)
async function loadMock(lat: number, lon: number): Promise<Point[]> {
  const pts: Point[] = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const la = lat + (i - N / 2) * 0.15;
      const lo = lon + (j - N / 2) * 0.15;
      const pm = Math.max(
        2,
        10 +
          40 * Math.exp(-(Math.hypot(i - N / 2, j - N / 2) / 4)) +
          (Math.random() - 0.5) * 10
      );
      const aqi = aqiFromPM25(pm) ?? 40;
      pts.push({ lat: la, lon: lo, value: pm, aqi, source: "mock" });
    }
  }
  return pts;
}

/* =======================
   Componente
   ======================= */
export default function FancyAirQualityMap({
  center = [-98.5, 39.8],
  zoom = 4,
  styleUrl,
  useOpenAQ = true,
  height = 860,
  onPickLocation,
  lockToNorthAmerica = true,
  fitNorthAmericaOnLoad = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const pointsRef = useRef<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"heat" | "grid">("heat");

  const pickRef = useRef(onPickLocation);
  useEffect(() => {
    pickRef.current = onPickLocation;
  }, [onPickLocation]);

  /** Inicia mapa y capas */
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: center as LngLatLike,
      zoom,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    if (lockToNorthAmerica)
      map.setMaxBounds([
        [-168, 5],
        [-52, 72],
      ]);
    if (fitNorthAmericaOnLoad) {
      map.once("load", () => {
        map.fitBounds(
          [
            [-125, 25],
            [-66, 49],
          ],
          { padding: 40, duration: 0 }
        );
      });
    }

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );
    map.on("click", (e: MapMouseEvent) =>
      pickRef.current?.(e.lngLat.lat, e.lngLat.lng)
    );
    map.on("error", (e) => console.warn("Map error:", (e as any)?.error ?? e));

    map.on("load", () => {
      // Fuente de puntos
      map.addSource("aq-source", {
        type: "geojson",
        data: toPointsFC(pointsRef.current),
      });

      // Heatmap (optimizado para zoom país → ciudad)
      map.addLayer({
        id: "aq-heat",
        type: "heatmap",
        source: "aq-source",
        maxzoom: 15,
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "aqi"],
            0,
            0,
            50,
            0.25,
            100,
            0.5,
            150,
            0.8,
            200,
            0.95,
            300,
            1,
          ],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            0.8,
            5,
            1.2,
            7,
            1.6,
            10,
            1.8,
          ],
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3,
            18,
            5,
            32,
            7,
            48,
            9,
            64,
            12,
            80,
            14,
            96,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0.0,
            "rgba(0,0,0,0)",
            0.15,
            "#2ecc71",
            0.35,
            "#f1c40f",
            0.55,
            "#e67e22",
            0.75,
            "#e74c3c",
            1.0,
            "#8e44ad",
          ],
          "heatmap-opacity": 0.9,
        },
      });

      // Círculos (a partir de z~7)
      map.addLayer({
        id: "aq-circles",
        type: "circle",
        source: "aq-source",
        minzoom: 7,
        paint: {
          "circle-color": [
            "step",
            ["get", "aqi"],
            "#9aa0a6",
            0,
            "#2ecc71",
            50,
            "#f1c40f",
            100,
            "#e67e22",
            150,
            "#e74c3c",
            200,
            "#8e44ad",
            300,
            "#7f1d1d",
          ],
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            [
              "interpolate",
              ["linear"],
              ["get", "aqi"],
              0,
              2,
              200,
              4,
              300,
              5,
              500,
              6,
            ],
            12,
            [
              "interpolate",
              ["linear"],
              ["get", "aqi"],
              0,
              4,
              200,
              7,
              300,
              9,
              500,
              10,
            ],
            15,
            [
              "interpolate",
              ["linear"],
              ["get", "aqi"],
              0,
              6,
              200,
              9,
              300,
              11,
              500,
              13,
            ],
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(10,10,10,.8)",
        },
      });

      // Grid (choropleth)
      map.addSource("aq-grid", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "aq-grid-fill",
        type: "fill",
        source: "aq-grid",
        layout: { visibility: "none" },
        paint: {
          "fill-color": [
            "step",
            ["get", "aqi"],
            "#9aa0a6",
            0,
            "#2ecc71",
            50,
            "#f1c40f",
            100,
            "#e67e22",
            150,
            "#e74c3c",
            200,
            "#8e44ad",
            300,
            "#7f1d1d",
          ],
          "fill-opacity": 0.55,
        },
      });
      map.addLayer({
        id: "aq-grid-line",
        type: "line",
        source: "aq-grid",
        layout: { visibility: "none" },
        paint: { "line-color": "rgba(255,255,255,.12)", "line-width": 0.5 },
      });
      map.addLayer({
        id: "aq-grid-label",
        type: "symbol",
        source: "aq-grid",
        layout: {
          "text-field": ["to-string", ["get", "aqi"]],
          "text-size": 11,
          "text-allow-overlap": true,
          visibility: "none",
        },
        paint: {
          "text-color": "#fff",
          "text-halo-color": "rgba(0,0,0,.5)",
          "text-halo-width": 1.2,
        },
      });

      applyModeVisibility(map, mode);
    });

    // Fetch de datos por viewport (debounced) usando tiles
    const fetchViewport = debounce(async () => {
      const b = map.getBounds();
      if (lockToNorthAmerica) {
        const c = map.getCenter();
        if (c.lng < -170 || c.lng > -50 || c.lat < 5 || c.lat > 72) return;
      }

      setLoading(true);
      try {
        if (useOpenAQ) {
          const bbox: BBox = [
            b.getWest(),
            b.getSouth(),
            b.getEast(),
            b.getNorth(),
          ];
          const pts = await loadOpenAQTiled(bbox);
          console.log("OpenAQ puntos:", pts.length, bbox);
          pointsRef.current = pts;
          setPoints(pts);
        } else {
          const c = map.getCenter();
          const pts = await loadMock(c.lat, c.lng);
          pointsRef.current = pts;
          setPoints(pts);
        }
      } catch (e) {
        console.error("OpenAQ viewport fetch error:", e);
      } finally {
        setLoading(false);
      }
    }, 700);

    map.on("moveend", fetchViewport);
    map.once("load", fetchViewport);

    return () => {
      map.off("moveend", fetchViewport);
      map.remove();
    };
  }, [
    styleUrl,
    useOpenAQ,
    lockToNorthAmerica,
    fitNorthAmericaOnLoad,
    center[0],
    center[1],
    zoom,
  ]);

  /** Empuja puntos a la source (si ya hay estilo) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const update = () => {
      (
        map.getSource("aq-source") as maplibregl.GeoJSONSource | undefined
      )?.setData(toPointsFC(points));
    };
    if (map.isStyleLoaded()) update();
    else map.once("load", update);
  }, [points]);

  /** Recalcula grid al cambiar puntos o al mover/zoom */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    function recomputeGrid() {
      const src = map.getSource("aq-grid") as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!src) return;
      const z = map.getZoom();
      const meters = cellSizeMeters(z);
      const bounds = map.getBounds();
      src.setData(buildGridChoropleth(points, bounds, meters));
    }
    recomputeGrid();
    map.on("moveend", recomputeGrid);
    return () => map.off("moveend", recomputeGrid);
  }, [points]);

  /** Toggle visibilidad */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) applyModeVisibility(map, mode);
    else map.once("load", () => applyModeVisibility(map, mode));
  }, [mode]);

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 5,
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={() => setMode("heat")} style={btn(mode === "heat")}>
          Heatmap
        </button>
        <button onClick={() => setMode("grid")} style={btn(mode === "grid")}>
          Zonas
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ height, width: "100%", borderRadius: 16, overflow: "hidden" }}
      />
      {loading && <div style={loaderStyle}>Cargando datos…</div>}
    </div>
  );
}

/* =======================
   Grid helpers
   ======================= */
type BoundsLike = {
  getWest: () => number;
  getEast: () => number;
  getNorth: () => number;
  getSouth: () => number;
};

function cellSizeMeters(zoom: number) {
  if (zoom >= 15) return 400;
  if (zoom >= 13) return 800;
  if (zoom >= 11) return 1500;
  if (zoom >= 8) return 3000;
  return 6000;
}

function buildGridChoropleth(
  points: { lat: number; lon: number; aqi: number }[],
  bounds: BoundsLike,
  cellMeters: number
): GeoJSON.FeatureCollection {
  const west = bounds.getWest(),
    east = bounds.getEast();
  const south = bounds.getSouth(),
    north = bounds.getNorth();
  const latDegPerM = 1 / 111320;
  const midLat = (north + south) / 2;
  const lonDegPerM = 1 / (111320 * Math.cos((midLat * Math.PI) / 180));
  const dLat = cellMeters * latDegPerM;
  const dLon = cellMeters * lonDegPerM;

  const features: GeoJSON.Feature[] = [];
  for (let lat0 = Math.floor(south / dLat) * dLat; lat0 < north; lat0 += dLat) {
    for (let lon0 = Math.floor(west / dLon) * dLon; lon0 < east; lon0 += dLon) {
      const lat1 = lat0 + dLat,
        lon1 = lon0 + dLon;
      const cellPts = points.filter(
        (p) => p.lat >= lat0 && p.lat < lat1 && p.lon >= lon0 && p.lon < lon1
      );
      if (!cellPts.length) continue;
      const aqiAvg = cellPts.reduce((s, p) => s + p.aqi, 0) / cellPts.length;
      const aqiVal = Math.round(aqiAvg);
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lon0, lat0],
              [lon1, lat0],
              [lon1, lat1],
              [lon0, lat1],
              [lon0, lat0],
            ],
          ],
        },
        properties: { aqi: aqiVal, n: cellPts.length },
      } as GeoJSON.Feature);
    }
  }
  return { type: "FeatureCollection", features } as any;
}

/* =======================
   Sources & UI helpers
   ======================= */
function toPointsFC(points: Point[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: {
        aqi: p.aqi,
        value: p.value,
        time: p.time ?? null,
        source: p.source,
      },
    })),
  } as any;
}
function emptyFC(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] } as any;
}

const loaderStyle: React.CSSProperties = {
  position: "absolute",
  left: 12,
  bottom: 12,
  padding: "6px 10px",
  borderRadius: 10,
  background: "rgba(20,20,20,.65)",
  color: "#fff",
  fontSize: 12,
  border: "1px solid rgba(255,255,255,.15)",
};
const btn = (active: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.2)",
  background: active ? "rgba(255,255,255,.12)" : "rgba(20,20,20,.6)",
  color: "#fff",
  fontSize: 12,
  backdropFilter: "blur(6px)",
});

function applyModeVisibility(map: MLMap, mode: "heat" | "grid") {
  const show = (id: string, visible: boolean) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
  };
  const ready =
    !!map.getLayer("aq-heat") &&
    !!map.getLayer("aq-circles") &&
    !!map.getLayer("aq-grid-fill") &&
    !!map.getLayer("aq-grid-line") &&
    !!map.getLayer("aq-grid-label");

  if (!ready) {
    map.once("load", () => applyModeVisibility(map, mode));
    return;
  }

  show("aq-heat", mode === "heat");
  show("aq-circles", mode === "heat");
  show("aq-grid-fill", mode === "grid");
  show("aq-grid-line", mode === "grid");
  show("aq-grid-label", mode === "grid");
}
