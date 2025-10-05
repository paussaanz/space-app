// En cualquier componente
import { useLocation } from "@/contexts/LocationContext";

export function AskLocationButton() {
  const { status, coords, precision, requestLocation, error } = useLocation();

  const handleClick = async () => {
    console.log("📡 Solicitando ubicación...");
    await requestLocation();
    console.log("✅ Estado actualizado:", { status, coords, precision, error });
  };

  return (
    <div className="p__t-5" style={{ zIndex: 500 }}>
      <button onClick={handleClick} disabled={status === "requesting"}>
        {status === "requesting"
          ? "Obteniendo ubicación..."
          : "Usar mi ubicación"}
      </button>

      {coords && (
        <p>
          📍 {coords.lat}, {coords.lon} ({precision})
        </p>
      )}
      {error && <p>⚠️ {error}</p>}
    </div>
  );
}
