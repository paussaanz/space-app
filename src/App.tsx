// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Navbar from "./components/UI/Navbar";
import { useAQIAlerts } from "./notifications/AqiAlerts";
import AboutPage from "./pages/AboutPage";
import HomePage from "./pages/HomePage";
import LocationGate from "./providers/LocationGate";
import "./sass/style.scss";

import AqiHealthPopup from "./components/UI/AqiHealthPopup";
import { useAqiPopup } from "./notifications/useAqiPopup";

type AqiMeta = { city?: string; dominant?: string; when?: Date };

export default function App() {
  const { notifyIfBad } = useAQIAlerts();
  const [aqi, setAqi] = useState<number | null>(null);
  const [meta, setMeta] = useState<AqiMeta>({});

  // Popup AQI
  const { open, data, close, suppressToday, maybeOpenForAqi } = useAqiPopup();

  useEffect(() => {
    if (aqi == null) return;
    // Mantén tus notificaciones existentes
    notifyIfBad(aqi, meta);
    // Y dispara el popup si aplica
    maybeOpenForAqi(aqi, meta);
  }, [aqi, meta, notifyIfBad, maybeOpenForAqi]);

  const handleAqiUpdate = useMemo(
    () => (value: number, m?: AqiMeta) => {
      setAqi(value);
      setMeta({ ...m, when: m?.when ?? new Date() });
    },
    []
  );

  return (
    <Router>
      <LocationGate requireExact>
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={
              <div className="container">
                <HomePage onAqiUpdate={handleAqiUpdate} />
              </div>
            }
          />
          <Route
            path="/about"
            element={
              <div className="container">
                <AboutPage />
              </div>
            }
          />
        </Routes>

        {/* Modal AQI (renderizado global) */}
        {open && data && (
          <AqiHealthPopup
            aqi={data.aqi}
            city={data.meta?.city}
            dominant={data.meta?.dominant}
            when={data.meta?.when}
            level={data.level}
            onClose={close}
            onSuppressToday={suppressToday}
          />
        )}
      </LocationGate>
    </Router>
  );
}
