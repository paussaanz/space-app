import * as React from "react";

/**
 * WeatherIcons — tiny animated SVG glyphs (no deps)
 * Variants: "sun", "cloud", "cloud-rain", "sun-cloud", "thunderstorm".
 *
 * - Works on any background (uses currentColor by default)
 * - Size responsive: pass `size` (px) or `width/height` or set `style={{ width: '100%' }}`
 * - Subtle built‑in animations: sun rays rotate, clouds drift, drops fall, bolt flicker
 */

export type WeatherIconProps = {
  kind: "sun" | "cloud" | "cloud-rain" | "sun-cloud" | "thunderstorm";
  size?: number; // square size in px
  color?: string; // main stroke/fill (defaults to currentColor)
  secondary?: string; // accent color (e.g., sun/rain)
  strokeWidth?: number; // default 4
  className?: string;
  style?: React.CSSProperties;
};

const Sun = ({
  color,
  secondary,
  strokeWidth = 4,
}: Required<Pick<WeatherIconProps, "color" | "secondary" | "strokeWidth">>) => (
  <g>
    <circle
      cx="64"
      cy="64"
      r="18"
      fill={secondary}
      stroke={color}
      strokeWidth={strokeWidth}
    />
    {/* rays */}
    <g stroke={secondary} strokeWidth={strokeWidth} strokeLinecap="round">
      {[0, 30, 60, 90, 120, 150].map((deg, i) => (
        <line
          key={i}
          x1="64"
          y1="12"
          x2="64"
          y2="0"
          transform={`rotate(${deg} 64 64)`}
        >
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from={`${deg} 64 64`}
            to={`${deg + 360} 64 64`}
            dur="12s"
            repeatCount="indefinite"
          />
        </line>
      ))}
    </g>
  </g>
);

const Cloud = ({
  color,
  strokeWidth = 4,
  fill = "rgba(255,255,255,0.1)",
}: {
  color: string;
  strokeWidth?: number;
  fill?: string;
}) => (
  <g>
    <path
      d="M34 86c-8 0-14-6-14-14s6-14 14-14c2 0 4 .4 6 1.2C43 52 52 46 62 46c12 0 22 7 26 18 1.5-.3 3-.5 4.5-.5 9.4 0 17 7.6 17 17s-7.6 17-17 17H34z"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </g>
);

const Drops = ({ color }: { color: string }) => (
  <g fill={color} opacity={0.9}>
    {[40, 64, 88].map((x, i) => (
      <g key={i} transform={`translate(${x} 92)`}>
        <path d="M0 0c2-4 4-7 4-10s-2-6-4-8c-2 2-4 5-4 8s2 6 4 10z" />
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`${x} 78; ${x} 104`}
          dur={`${0.9 + i * 0.2}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="1;0"
          dur={`${0.9 + i * 0.2}s`}
          repeatCount="indefinite"
        />
      </g>
    ))}
  </g>
);

const Bolt = ({ color }: { color: string }) => (
  <g fill={color}>
    <path d="M64 70l12-20-12 4 8-22-24 32 12-2-8 20z">
      <animate
        attributeName="opacity"
        values="0.6;1;0.6"
        dur="0.8s"
        repeatCount="indefinite"
      />
    </path>
  </g>
);

export default function WeatherIcon({
  kind,
  size = 96,
  color = "currentColor",
  secondary = "#FFD166",
  strokeWidth = 4,
  className,
  style,
}: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      role="img"
      aria-label={kind}
    >
      {kind === "sun" && (
        <Sun color={color} secondary={secondary} strokeWidth={strokeWidth} />
      )}

      {kind === "cloud" && (
        <g>
          <Cloud color={color} strokeWidth={strokeWidth} />
          {/* gentle drift */}
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-2 0; 2 0; -2 0"
            dur="8s"
            repeatCount="indefinite"
          />
        </g>
      )}

      {kind === "cloud-rain" && (
        <g>
          <Cloud color={color} strokeWidth={strokeWidth} />
          <Drops color={secondary} />
        </g>
      )}

      {kind === "sun-cloud" && (
        <g>
          <g transform="translate(22 -6) scale(0.9)">
            <Sun
              color={color}
              secondary={secondary}
              strokeWidth={strokeWidth}
            />
          </g>
          <g transform="translate(0 10)">
            <Cloud color={color} strokeWidth={strokeWidth} />
          </g>
        </g>
      )}

      {kind === "thunderstorm" && (
        <g>
          <Cloud color={color} strokeWidth={strokeWidth} />
          <Bolt color={secondary} />
          <Drops color={secondary} />
        </g>
      )}
    </svg>
  );
}

// Usage examples:
// <WeatherIcon kind="sun" size={72} />
// <WeatherIcon kind="cloud-rain" size={96} secondary="#6EC1FF" />
// <WeatherIcon kind="sun-cloud" style={{ width: 128, height: 'auto' }} />
