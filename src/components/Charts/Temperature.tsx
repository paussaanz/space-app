import * as React from "react";

export type TemperatureProps = {
  label?: string;
  value: number; // current temp
  min?: number; // scale min
  max?: number; // scale max
  unit?: string; // "°C" | "°F" | custom
  width?: number; // px
  height?: number; // px (bar thickness)
  showTicks?: boolean; // draw min/mid/max ticks
  trend?: "up" | "down" | "flat"; // optional trend indicator
  bands?: { to: number; name: string }[]; // semantic bands to compute status label/color
  className?: string;
  style?: React.CSSProperties;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function Temperature({
  label = "TEMP.",
  value = 25,
  min = -10,
  max = 50,
  unit = "°C",
  width = 420,
  height = 16,
  showTicks = true,
  trend = "down",
  bands = [
    { to: 0, name: "Freezing" },
    { to: 15, name: "Cool" },
    { to: 25, name: "Comfort" },
    { to: 32, name: "Warm" },
    { to: max, name: "Hot" },
  ],
  className,
  style,
}: TemperatureProps) {
  const pct = clamp01((value - min) / (max - min));
  const [animPct, setAnimPct] = React.useState(pct);
  const prevPct = React.useRef(pct);

  React.useEffect(() => {
    // animate fill to new percentage
    const from = prevPct.current;
    const to = pct;
    const dur = 450; // ms
    const t0 = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const k = clamp01((t - t0) / dur);
      // smoothstep
      const s = k * k * (3 - 2 * k);
      setAnimPct(lerp(from, to, s));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prevPct.current = pct;
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  // pick band label
  const status = React.useMemo(() => {
    for (const b of bands) if (value <= b.to) return b.name;
    return bands[bands.length - 1]?.name || "";
  }, [bands, value]);

  const W = width;
  const H = height;
  const R = H / 7; // radius for rounded bar
  const pad = 0; // inner padding for the track
  const dotR = Math.max(3, H * 0.9);
  const x0 = pad;
  const x1 = W - pad;
  const xVal = lerp(x0, x1, animPct);

  // gradient id isolation
  const gid = React.useId();

  return (
    <div
      className="border__bottom p__b-5 h-100"
      // className={className}
      style={{
        color: "white",
        ...style,
      }}
    >
      <div className="flex-col-tem-movil"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 8,

        }}
      >
        <div style={{ fontWeight: 600, opacity: 0.9 }}>
          <h1 className="text__jumbo-2" data-anim="text-anim">
            {label}
          </h1>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "baseline",
            gap: 10,
          }}
        >
          <div className="text__jumbo" data-anim="text-anim">
            {value.toFixed(1)}
            {unit}
          </div>

          {trend && (
            <span
              className="h2"
              aria-label={`trend ${trend}`}
              style={{ opacity: 0.8 }}
            >
              {trend === "up" ? "⬈" : trend === "down" ? "⬊" : "⟷"}
            </span>
          )}
        </div>
      </div>

      {/* Meter */}
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${W} ${H + 24}`}
        preserveAspectRatio="none" // <— añade esto
        role="img"
        aria-label={`${label} ${value}${unit}`}
      >
        <defs>
          {/* cool→hot gradient */}
          <linearGradient id={`g-${gid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3BA3FF" />
            {/* blue */}
            <stop offset="35%" stopColor="#26D7AE" />
            {/* teal */}
            <stop offset="60%" stopColor="#F6D44D" />
            {/* yellow */}
            <stop offset="80%" stopColor="#F59F3B" />
            {/* orange */}
            <stop offset="100%" stopColor="#F05340" />
            {/* red */}
          </linearGradient>
          {/* subtle glow for the dot */}
          <radialGradient id={`dot-${gid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,220,180,0.95)" />
            <stop offset="100%" stopColor="rgba(255,140,0,0.0)" />
          </radialGradient>
        </defs>

        {/* track */}
        <g transform={`translate(0 6)`}>
          <rect
            x={x0}
            y={0}
            rx={R}
            ry={R}
            width={x1 - x0}
            height={H}
            fill="rgba(255,255,255,0.12)"
          />
          {/* fill mask */}
          <clipPath id={`clip-${gid}`}>
            <rect x={x0} y={0} rx={R} ry={R} width={xVal - x0} height={H} />
          </clipPath>
          <rect
            x={x0}
            y={0}
            rx={R}
            ry={R}
            width={x1 - x0}
            height={H}
            fill={`url(#g-${gid})`}
            clipPath={`url(#clip-${gid})`}
          />
          <rect
            x={xVal - 5}
            y={0}
            rx={R}
            width={5}
            height={H}
            ry={R}
            fill="#fff"
            opacity={0.85}
          />
        </g>

        {/* labels */}
        <g className="text__tag" fill="rgba(255,255,255,0.7)">
          <text x={x0} y={H + 22} textAnchor="start">
            {min}
            {unit}
          </text>
          <text x={(x0 + x1) / 2} y={H + 22} textAnchor="middle">
            {status}
          </text>
          <text x={x1} y={H + 22} textAnchor="end">
            {max}
            {unit}
          </text>
        </g>
      </svg>
    </div>
  );
}

// Example:
// <Temperature label="Surface Temp" value={23.4} min={-10} max={45} unit="°C" trend="up" />
