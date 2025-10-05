import React, { useEffect, useRef } from "react";

type Props = {
  aqi: number;
  city?: string;
  dominant?: string;
  when?: Date;
  level: "unhealthy" | "very-unhealthy" | "hazardous";
  onClose: () => void;
  onSuppressToday: () => void;
};

const levelText: Record<Props["level"], { title: string; tips: string[] }> = {
  unhealthy: {
    title: "Calidad del aire perjudicial",
    tips: [
      "Evita la actividad física intensa al aire libre.",
      "Personas sensibles: mejor permanecer en interiores.",
      "Mantén puertas y ventanas cerradas si es posible.",
    ],
  },
  "very-unhealthy": {
    title: "Calidad del aire muy perjudicial",
    tips: [
      "Reduce al mínimo la exposición al exterior.",
      "Usa mascarilla con filtro si necesitas salir.",
      "Utiliza purificador de aire si dispones de uno.",
    ],
  },
  hazardous: {
    title: "Calidad del aire peligrosa",
    tips: [
      "Evita salir salvo estricta necesidad.",
      "Sella ventanas y puertas; limita la ventilación exterior.",
      "Busca espacios con filtrado HEPA si debes desplazarte.",
    ],
  },
};

export default function AqiHealthPopup({
  aqi,
  city,
  dominant,
  when,
  level,
  onClose,
  onSuppressToday,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Foco inicial + cierre por Esc
  useEffect(() => {
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { title, tips } = levelText[level];

  return (
    <div
      className="aqi-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aqi-popup-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(); // clic fuera cierra
      }}
    >
      <div
        className={`aqi-popup__panel aqi-popup__panel--${level}`}
        ref={panelRef}
      >
        <div className="aqi-popup__header">
          <h2 id="aqi-popup-title" className="h4" style={{ margin: 0 }}>
            {title}
          </h2>
          <button
            className="aqi-popup__close"
            aria-label="Cerrar"
            onClick={onClose}
            ref={closeBtnRef}
          >
            ×
          </button>
        </div>

        <div className="aqi-popup__body">
          <p className="b4" style={{ marginTop: 0 }}>
            {city ? <strong>{city} · </strong> : null}
            AQI: <strong>{aqi}</strong>
            {dominant ? (
              <>
                {" "}
                · Dominante: <strong>{dominant.toUpperCase()}</strong>
              </>
            ) : null}
            {when ? <> · {new Date(when).toLocaleString()}</> : null}
          </p>

          <ul className="b4 aqi-popup__tips">
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>

        <div className="aqi-popup__actions">
          <button className="btn btn--primary" onClick={onClose}>
            Entendido
          </button>
          <button className="btn btn--ghost" onClick={onSuppressToday}>
            No volver a mostrar hoy
          </button>
        </div>
      </div>
    </div>
  );
}
