import React, { useRef, type MouseEvent, type ReactNode } from "react";

type SpotlightCardProps = {
  children?: ReactNode;
  className?: string;
  /** Cualquier color CSS válido (rgba, hex, hsl, etc.) */
  spotlightColor?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = "",
  spotlightColor = "rgba(255, 255, 255, 0.25)",
  ...rest
}) => {
  const divRef = useRef<HTMLDivElement | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = divRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
    el.style.setProperty("--spotlight-color", spotlightColor);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={`card-spotlight ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default SpotlightCard;
