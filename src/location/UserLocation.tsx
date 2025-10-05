import { useEffect, useState } from "react";

type Position = {
  lat: number;
  lon: number;
};

export default function UserLocation() {
  const [pos, setPos] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPos({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Has denegado el acceso a tu ubicación.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("No se pudo obtener la ubicación.");
            break;
          case err.TIMEOUT:
            setError("La solicitud de ubicación tardó demasiado.");
            break;
          default:
            setError("Error desconocido al obtener la ubicación.");
        }
      },
      {
        enableHighAccuracy: true, // usa GPS si está disponible
        timeout: 10_000, // máximo 10s
        maximumAge: 0, // no usar datos cacheados
      }
    );
  }, []);

  if (error) return <p>❌ {error}</p>;
  if (!pos) return <p>📍 Obteniendo ubicación…</p>;

  return (
    <p>
      🌎 Lat: {pos.lat.toFixed(4)}, Lon: {pos.lon.toFixed(4)}
    </p>
  );
}
