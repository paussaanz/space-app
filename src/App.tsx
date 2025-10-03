// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import "./sass/style.scss";

import Navbar from "./components/UI/Navbar";
import { useAQIAlerts } from "./notifications/AqiAlerts";
import HomePage from "./pages/HomePage";

// Tipo opcional para pasar metadatos (ciudad, contaminante dominante, etc.)
type AqiMeta = { city?: string; dominant?: string; when?: Date };

export default function App() {
  const { notifyIfBad } = useAQIAlerts();

  // 🔌 Estado en App para recibir actualizaciones desde HomePage (o desde tu store)
  const [aqi, setAqi] = useState<number | null>(null);
  const [meta, setMeta] = useState<AqiMeta>({});

  // Cada vez que cambie el AQI (por fetch/WS), disparamos la notificación si toca
  useEffect(() => {
    if (aqi == null) return;
    notifyIfBad(aqi, meta);
  }, [aqi, meta, notifyIfBad]);

  // Handler que le pasamos a HomePage para que reporte el AQI nuevo
  const handleAqiUpdate = useMemo(
    () => (value: number, m?: AqiMeta) => {
      setAqi(value);
      setMeta({ ...m, when: m?.when ?? new Date() });
    },
    []
  );

  return (
    <>
      <Navbar />
      {/* 
        Pasa el callback a HomePage (o a tu componente que hace el fetch).
        Cuando tengas el AQI real, llama: onAqiUpdate(152, { city: "Madrid", dominant: "O3" })
      */}
      <div className="container">
        <HomePage onAqiUpdate={handleAqiUpdate} />
      </div>
    </>
  );
}
