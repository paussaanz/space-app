/* ====== Mini utilidades ====== */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ====== Medidor circular (NO2 / HCHO / AQI) ====== */
function RingGauge({
  label,
  value,
  unit = "µg/m³",
  min = 0,
  max = 200,
  bands = [
    { to: 50, name: "Bueno" },
    { to: 100, name: "Moderado" },
    { to: 150, name: "Malo" },
    { to: 200, name: "Muy malo" },
  ],
}: {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  bands?: { to: number; name: string }[];
}) {
  const size = 168;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const t = clamp01((value - min) / (max - min || 1));
  const dash = C * t;

  // banda activa
  const band = bands.find((b) => value <= b.to) ?? bands[bands.length - 1];

  return (
    <div className="ring">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="ring__svg"
        role="img"
        aria-label={label}
      >
        <defs>
          <linearGradient id="g-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--c-accent-1)" />
            <stop offset="100%" stopColor="var(--c-accent-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255,255,255,.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#g-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${C - dash}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="ring__center">
        <div className="ring__value">
          {Math.round(value)}
          <span className="ring__unit">{unit}</span>
        </div>
        <div className="ring__label">{label}</div>
        <span className="ring__badge">{band.name}</span>
      </div>
    </div>
  );
}

/* ====== Brújula de viento (dirección + velocidad) ====== */
function WindCompass({
  deg = 210, // 0=N
  speed = 12, // m/s
  gust = 18,
  unit = "m/s",
}: {
  deg?: number;
  speed?: number;
  gust?: number;
  unit?: string;
}) {
  const size = 180;
  const r = 70;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="wind"
      role="img"
      aria-label="Viento"
    >
      <defs>
        <radialGradient id="g-w" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,.35)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="g-arrow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--c-accent-1)" />
          <stop offset="100%" stopColor="var(--c-accent-2)" />
        </linearGradient>
      </defs>

      <circle cx={cx} cy={cy} r={r + 16} fill="url(#g-w)" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,.12)"
      />
      {[0, 45, 90, 135].map((d, i) => (
        <g key={i} transform={`rotate(${d} ${cx} ${cy})`}>
          <line
            x1={cx - r}
            y1={cy}
            x2={cx + r}
            y2={cy}
            stroke="rgba(255,255,255,.12)"
          />
        </g>
      ))}

      {/* N E S O */}
      {["N", "E", "S", "O"].map((t, i) => {
        const a = (i * 90 * Math.PI) / 180;
        return (
          <text
            key={t}
            x={cx + Math.cos(a) * (r + 10)}
            y={cy + Math.sin(a) * (r + 10)}
            textAnchor="middle"
            dominantBaseline="middle"
            className="wind__dir"
          >
            {t}
          </text>
        );
      })}

      {/* flecha */}
      <g transform={`rotate(${deg} ${cx} ${cy})`}>
        <polygon
          points={`${cx - 6},${cy} ${cx + 6},${cy} ${cx},${cy - r + 10}`}
          fill="url(#g-arrow)"
          className="wind__arrow"
        />
      </g>

      {/* lectura */}
      <foreignObject x={cx - 70} y={cy + r - 6} width="140" height="60">
        <div className="wind__read">
          <div className="wind__speed">
            {speed}
            <span>{unit}</span>
          </div>
          <div className="wind__gust">
            Rachas {gust}
            {unit}
          </div>
          <div className="wind__label">Dirección {Math.round(deg)}°</div>
        </div>
      </foreignObject>
    </svg>
  );
}

/* ====== Barras de lluvia próxima hora ====== */
function RainNextHour({
  mm = [0.2, 0.0, 0.1, 0.6, 1.2, 0.8, 0.3, 0.0, 0.0, 0.4, 0.7, 1.0],
  stepMin = 5,
}: {
  mm?: number[];
  stepMin?: number;
}) {
  const w = 420,
    h = 110,
    p = 12;
  const bw = (w - p * 2) / mm.length - 4;
  const max = Math.max(1, ...mm);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mini-chart"
      role="img"
      aria-label="Lluvia próxima hora"
    >
      <defs>
        <linearGradient id="g-rain" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--c-accent-1)" />
          <stop offset="100%" stopColor="var(--c-accent-2)" />
        </linearGradient>
      </defs>
      {mm.map((v, i) => {
        const bh = (v / max) * (h - p * 2);
        const x = p + i * (bw + 4);
        const y = h - p - bh;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={bh}
              rx="3"
              fill="url(#g-rain)"
              opacity={0.7}
            />
            {i % 3 === 0 && (
              <text
                x={x + bw / 2}
                y={h - 2}
                textAnchor="middle"
                className="axis__tick"
              >
                {i * stepMin}′
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ====== Cabecera de tiempo actual ====== */
function WeatherNow({
  temp = 23,
  feels = 21,
  hi = 26,
  lo = 17,
  rainProb = 0.64,
  status = "Nublado con claros",
}: {
  temp?: number;
  feels?: number;
  hi?: number;
  lo?: number;
  rainProb?: number;
  status?: string;
}) {
  return (
    <div className="wx">
      <div className="wx__left">
        <div className="wx__temp">
          {temp}°<span className="wx__unit">C</span>
        </div>
        <div className="wx__meta">
          <span>Sensación {feels}°</span> · <span>Max {hi}°</span> ·{" "}
          <span>Min {lo}°</span>
        </div>
        <div className="wx__status">{status}</div>
      </div>
      <div className="wx__right">
        <div className="wx__rain">
          <div className="wx__rain-drop" />
          <div className="wx__rain-label">
            {Math.round(rainProb * 100)}% lluvia
          </div>
        </div>
      </div>
    </div>
  );
}

export { RainNextHour, RingGauge, WeatherNow, WindCompass };
