// En cualquier componente
import { useLocation } from "@/providers/LocationProvider";

export function AskLocationButton() {
  const { status, coords, precision, requestLocation, error } = useLocation();

  const handleClick = async () => {
    await requestLocation();
  };

  return (
    <div>
      <button onClick={handleClick} disabled={status === "requesting"}>
        {status === "requesting" ? "Obtaining location..." : "Use my location"}
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
