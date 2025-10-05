// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import Navbar from "./components/UI/Navbar";
import { useAQIAlerts } from "./notifications/AqiAlerts";
import HomePage from "./pages/HomePage";
import LocationGate from "./providers/LocationGate";
import "./sass/style.scss";

type AqiMeta = { city?: string; dominant?: string; when?: Date };

export default function App() {
  const { notifyIfBad } = useAQIAlerts();
  const [aqi, setAqi] = useState<number | null>(null);
  const [meta, setMeta] = useState<AqiMeta>({});

  useEffect(() => {
    if (aqi == null) return;
    notifyIfBad(aqi, meta);
  }, [aqi, meta, notifyIfBad]);

  const handleAqiUpdate = useMemo(
    () => (value: number, m?: AqiMeta) => {
      setAqi(value);
      setMeta({ ...m, when: m?.when ?? new Date() });
    },
    []
  );

  return (
    <LocationGate requireExact>
      <Navbar />
      <div className="container">
        <HomePage onAqiUpdate={handleAqiUpdate} />
      </div>
    </LocationGate>
  );
}
