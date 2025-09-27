// FloralTwinkleParticles.tsx
import { Canvas, useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

type Props = {
  maskUrl: string; // PNG/SVG rasterizado: blanco = puntos, negro = vacío
  count?: number; // puntos base
  sparks?: number; // puntos "firefly" que parpadean más
  size?: number; // px base (1.2–2.2 es buen rango)
  hue?: number; // 28 ≈ naranja
  twinkle?: number; // 0–1 intensidad del parpadeo
  className?: string;
  style?: React.CSSProperties;
};

async function sampleMask(url: string, want = 12000, threshold = 0.33) {
  const resolveUrl = (u: string) => {
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith("/")) return new URL(u, window.location.origin).toString();
    return new URL(u, document.baseURI).toString();
  };
  const res = await fetch(resolveUrl(url));
  if (!res.ok) throw new Error("Mask fetch failed");
  const blob = await res.blob();
  const obj = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((ok, err) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = err;
    i.src = obj;
  });
  const w = Math.min(1600, img.naturalWidth || 1024);
  const h = Math.min(1600, img.naturalHeight || 1024);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(obj);
  const { data } = ctx.getImageData(0, 0, w, h);

  const picks: [number, number][] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx] / 255,
        g = data[idx + 1] / 255,
        b = data[idx + 2] / 255,
        a = data[idx + 3] / 255;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      if (a > 0.05 && l > threshold) {
        if (picks.length < want) picks.push([x, y]);
        else if (Math.random() < want / (picks.length + 1))
          picks[Math.floor(Math.random() * want)] = [x, y];
      }
    }
  const aspect = w / h;
  const out = new Float32Array(picks.length * 3);
  for (let i = 0; i < picks.length; i++) {
    const u = (picks[i][0] / w) * 2 - 1,
      v = (picks[i][1] / h) * 2 - 1;
    out[i * 3] = u * aspect;
    out[i * 3 + 1] = -v;
    out[i * 3 + 2] = 0;
  }
  return out;
}

const vert = /*glsl*/ `
  uniform float uTime;
  uniform float uSize;
  attribute float aSeed;    // 0..1 random
  attribute float aJitter;  // tamaño por partícula
  attribute float aSpark;   // 0 o 1 (firefly)
  varying float vSeed;
  varying float vSpark;
  void main() {
    vSeed = aSeed;
    vSpark = aSpark;
    vec3 p = position;

    float t = uTime*0.35 + aSeed*6.28318;
    // suave “respiración” + swirl
    float breathe = 0.018*sin(t)+0.01*sin(t*2.7);
    p.xy *= (1.0 + breathe);
    float ang = 0.22*sin(t*0.6) + 0.18*aSeed;
    p.xy = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xy;
    p.z = 0.12*sin(t*1.6 + aSeed*11.0); // profundidad ligera

    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_Position = projectionMatrix * mv;
    float sz = uSize*(0.6 + aJitter)*(300.0/ -mv.z);
    gl_PointSize = clamp(sz, 0.5, 6.0);
  }
`;

const frag = /*glsl*/ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uTwinklePhase; // 0..1 tiempo
  uniform float uTwinkleAmp;   // 0..1 intensidad
  varying float vSeed;
  varying float vSpark;

  void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv)*2.0;
  float edge = smoothstep(1.0, 0.82, 1.0 - r);
  float core = smoothstep(0.22, 0.0, r);

  // base flicker + extra en las 'sparks'
  float slow  = 0.5 + 0.5 * sin(vSeed*17.0 + uTwinklePhase*6.28318);
  float fast  = 0.5 + 0.5 * sin(vSeed*55.0 + uTwinklePhase*19.0);
  float spark = mix(1.0, fast, vSpark);           // sólo las sparks tienen el rápido
  float tw    = mix(1.0, slow * spark, uTwinkleAmp); // mezcla por intensidad

  vec3 col = uColor * (0.85 + 0.25*tw);
  float a  = uOpacity * (0.7*edge + 0.3*core) * (0.75 + 0.25*tw);

  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

function Points({
  positions,
  size,
  hue,
  twinkle,
  sparks,
}: {
  positions: Float32Array;
  size: number;
  hue: number;
  twinkle: number;
  sparks: number;
}) {
  const ref = React.useRef<THREE.Points>(null!);
  const mat = React.useRef<THREE.ShaderMaterial>(null!);

  // atributos por partícula
  const n = positions.length / 3;
  const seed = React.useMemo(
    () => Float32Array.from({ length: n }, () => Math.random()),
    [n]
  );
  const jitter = React.useMemo(
    () => Float32Array.from({ length: n }, () => Math.pow(Math.random(), 1.5)),
    [n]
  );
  const sparkAttr = React.useMemo(() => {
    const arr = new Float32Array(n).fill(0);
    for (let i = 0; i < sparks && i < n; i++) {
      const k = Math.floor(Math.random() * n);
      arr[k] = 1;
    }
    return arr;
  }, [n, sparks]);

  useFrame(({ clock }, dt) => {
    if (!mat.current) return;
    const t = clock.getElapsedTime();
    mat.current.uniforms.uTime.value = t;
    mat.current.uniforms.uTwinklePhase.value = (t * 0.5) % 1.0; // fase del parpadeo
    if (ref.current) ref.current.rotation.z += dt * 0.06;
  });

  const color = new THREE.Color().setHSL(hue / 360, 0.9, 0.62);

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          itemSize={3}
          count={n}
        />
        <bufferAttribute
          attach="attributes-aSeed"
          array={seed}
          itemSize={1}
          count={n}
        />
        <bufferAttribute
          attach="attributes-aJitter"
          array={jitter}
          itemSize={1}
          count={n}
        />
        <bufferAttribute
          attach="attributes-aSpark"
          array={sparkAttr}
          itemSize={1}
          count={n}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={{
          uTime: { value: 0 },
          uSize: { value: size },
          uOpacity: { value: 0.18 },
          uColor: { value: color },
          uTwinkle: { value: 0 },
        }}
      />
    </points>
  );
}

function Scene({
  maskUrl,
  count = 11000,
  sparks = 12,
  size = 1.6,
  hue = 28,
}: Required<Pick<Props, "maskUrl">> & Partial<Props>) {
  const [pos, setPos] = React.useState<Float32Array | null>(null);
  React.useEffect(() => {
    let ok = true;
    (async () => {
      const positions = await sampleMask(maskUrl, count, 0.33);
      if (ok) setPos(positions);
    })();
    return () => {
      ok = false;
    };
  }, [maskUrl, count]);

  return (
    <>
      {/* Sin fondo: Canvas con alpha → verás el color de tu página */}
      {pos && (
        <Points
          positions={pos}
          size={size!}
          hue={hue!}
          twinkle={0}
          sparks={sparks!}
        />
      )}
    </>
  );
}

export default function FloralTwinkleParticles({
  className,
  style,
  maskUrl,
  count = 11000,
  sparks = 94,
  size = 8.9,
  hue = 28,
}: Props) {
  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", ...style }}
    >
      <Canvas
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
        camera={{ position: [0, 0, 2.6], fov: 45 }}
      >
        <Scene
          maskUrl={maskUrl}
          count={count}
          sparks={sparks}
          size={size}
          hue={hue}
        />
      </Canvas>
      {/* deja pasar eventos a tu UI */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
    </div>
  );
}
