// src/providers/LocationGate.tsx
import { AskLocationButton } from "@/components/UI/AskLocation"; // ajusta ruta si hace falta
import { useLocation } from "@/providers/LocationProvider";
import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  requireExact?: boolean;
  minSplashMs?: number;
};

export default function LocationGate({
  children,
  requireExact = true,
  minSplashMs = 2500, // duración mínima del loader en ms
}: Props) {
  const { status, precision } = useLocation();
  const [splashDone, setSplashDone] = useState(false);

  // ⏱ Loader visible al menos X ms
  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), minSplashMs);
    return () => clearTimeout(t);
  }, [minSplashMs]);

  // 1️⃣ Loader inicial con logo SVG
  if (!splashDone) {
    return (
      <div className="gate gate--loader">
        <svg
          className="gate__logo"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 388.88 177.6"
        >
          <g className="gate__logo-group">
            <g>
              <path d="M256.7,26.18c46.72,45.86,27.94,126.49-34.3,146.83-67.56,22.07-131.44-38.91-113.11-107.45C126.6.79,208.89-20.74,256.7,26.18ZM223.66,54.03c-25.1-21.63-64.18-8.65-73.11,22.6-11.02,38.53,31.33,73.15,66.34,52.19,27.45-16.44,31.18-53.75,6.77-74.78Z" />
              <path d="M301,.06c27.39-1.05,54.1,12.47,70.52,34.02,15.63,20.51,20.8,46.99,15.15,72.17-8.62,38.39-44.35,66.89-83.78,66.54l-.44-40.77c.41-1.35,4.96-1.12,6.21-1.36,23.09-4.46,39.69-23.74,38.14-47.79-1.45-22.57-22.25-41.83-44.86-41.27L301,.06Z" />
            </g>
            <path d="M87.89.06C60.5-.99,33.79,12.53,17.37,34.08,1.73,54.59-3.43,81.07,2.22,106.25c8.62,38.39,44.35,66.89,83.78,66.54l.44-40.77c-.41-1.35-4.96-1.12-6.21-1.36-23.09-4.46-39.69-23.74-38.14-47.79,1.45-22.57,22.25-41.83,44.86-41.27L87.89.06Z" />
          </g>
        </svg>
      </div>
    );
  }

  // 2️⃣ Pantalla para pedir ubicación
  if (status === "idle" || status === "requesting") {
    return (
      <div className="gate gate--ask container__syp d__h100">
        <div className="gate--inner d__h100 d__w100">
          <header className="gate--header">
            <h1 className="gate--title text__jumbo-2">
              WE NEED ACCESS TO YOUR LOCATION
            </h1>
            <p className="gate--subtitle">Please allow to continue</p>
          </header>
          <div className="gate--cta">
            <AskLocationButton />
          </div>
        </div>
      </div>
    );
  }

  // 3️⃣ Bloqueo si no se concede
  const lacksExact = requireExact && precision !== "exact";
  if (status === "error" || lacksExact) {
    return (
      <div className="gate gate--blocked">
        <h2 className="gate__title">Acceso denegado</h2>
        <p className="gate__subtitle">
          ⚠️ No puedes entrar sin permitir tu ubicación.
        </p>
      </div>
    );
  }

  // 4️⃣ OK → mostrar contenido real
  return <>{children}</>;
}
