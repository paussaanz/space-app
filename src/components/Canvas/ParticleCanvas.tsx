import { Canvas, useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

/**
 * FlowerParticlesR3F
 *
 * 3D particle bouquet made with THREE Points + custom shaders.
 * Particles are sampled from a mask image (white/bright areas spawn points),
 * then animated with gentle noise to evoke a living, shimmering flower
 * like your screenshot. Includes a purple background gradient and additive glow.
 *
 * Requirements: @react-three/fiber and three
 */

export type FlowerParticlesProps = {
  /** URL of a monochrome mask (PNG/SVG rasterized) where light pixels form the flower */
  maskUrl?: string;
  /** How many particles to try to spawn from the mask */
  count?: number; // 12_000 default
  /** Particle hue (orange by default) */
  hue?: number; // ~25
  /** Background purple hue */
  bgHue?: number; // ~285
  /** Particle size in screen pixels */
  size?: number;
  /** Camera zoom (distance). Lower = closer */
  zoom?: number;
  /** If true, rotates slowly */
  autoRotate?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/** Utility: sample bright pixels from an image into XY positions */
async function sampleMask(url: string, want = 12000, threshold = 0.35) {
  // Robust loader that works with Vite/Next/static servers and avoids CORS/SVG tainting.
  // 1) Resolve relative URLs against the app base
  const resolveUrl = (u: string) => {
    try {
      if (/^https?:\/\//i.test(u)) return u; // absolute http(s)
      if (u.startsWith("/"))
        return new URL(u, window.location.origin).toString();
      // relative to current document base (handles Vite/Next basePath)
      return new URL(u, document.baseURI).toString();
    } catch (e) {
      throw new Error(`Invalid mask URL: "${u}"`);
    }
  };
  const resolved = resolveUrl(url);

  // 2) Fetch as blob to ensure same-origin and proper error reporting
  const res = await fetch(resolved, { mode: "same-origin" }).catch((e) => {
    throw new Error("Failed to fetch mask: " + e);
  });
  if (!res || !res.ok)
    throw new Error(`Mask fetch failed: ${res?.status} ${res?.statusText}`);
  const blob = await res.blob();

  // If it's an SVG, rasterize it via Image + ObjectURL; PNG/JPEG also work
  const objUrl = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = (e) => reject(new Error("Mask image decode error"));
    i.src = objUrl;
  });

  const w = Math.min(1600, img.naturalWidth || 1024);
  const h = Math.min(1600, img.naturalHeight || 1024);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(objUrl);

  const { data } = ctx.getImageData(0, 0, w, h);

  // reservoir sampling of bright pixels
  const picks: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx] / 255,
        g = data[idx + 1] / 255,
        b = data[idx + 2] / 255,
        a = data[idx + 3] / 255;
      const l = 0.299 * r + 0.587 * g + 0.114 * b; // luma
      if (a > 0.05 && l > threshold) {
        if (picks.length < want) picks.push([x, y]);
        else if (Math.random() < want / (picks.length + 1))
          picks[Math.floor(Math.random() * want)] = [x, y];
      }
    }
  }
  if (!picks.length)
    throw new Error(
      "Mask contained no bright pixels above threshold; try a whiter image or lower threshold."
    );

  // normalize to [-1,1] range keeping aspect
  const aspect = w / h;
  const nx: number[] = [];
  const ny: number[] = [];
  for (const [x, y] of picks) {
    const u = (x / w) * 2 - 1;
    const v = (y / h) * 2 - 1;
    nx.push(u * aspect);
    ny.push(-v);
  }
  return { x: nx, y: ny };
}

const vert = /* glsl */ `
  uniform float uTime;
  uniform float uSize;     // base size in px
  attribute float aSeed;   // 0..1 random
  attribute float aSizeJ;  // per-particle size jitter
  varying float vSeed;
  // hash for cheap noise
  float hash(vec3 p){ return fract(sin(dot(p, vec3(27.1, 61.7, 12.4))) * 43758.5453); }
  void main(){
    vSeed = aSeed;
    vec3 pos = position;
    float t = uTime * 0.4 + aSeed * 6.28318;

    // subtle breathing & flutter
    float breathe = 0.02 * sin(t) + 0.01 * sin(t * 3.1);
    pos.xy *= (1.0 + breathe);
    pos.z += 0.15 * sin(t * 1.7 + aSeed * 13.0); // give depth to avoid flat blob

    // gentle swirl
    float ang = 0.25 * sin(t * 0.6) + 0.2 * aSeed;
    float s = sin(ang), c = cos(ang);
    pos.xy = mat2(c, -s, s, c) * pos.xy;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    // size attenuation w.r.t. distance, plus per-point jitter
    float size = uSize * (0.6 + aSizeJ) * (300.0 / -mv.z);
    gl_PointSize = clamp(size, 0.5, 6.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vSeed;
  void main(){
    // circular soft sprite with sharpish edge to look like a dot
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;         // 0 at center, ~1 at edge
    float edge = smoothstep(1.0, 0.82, 1.0 - r); // crisp edge

    // tiny inner hotspot -> glow but not saturate
    float core = smoothstep(0.22, 0.0, r);
    float twinkle = 0.85 + 0.15 * sin(vSeed * 40.0);

    vec3 col = uColor * twinkle;
    float a = uOpacity * (0.7 * edge + 0.3 * core);

    if (a < 0.01) discard; // avoid overdraw
    gl_FragColor = vec4(col, a);
  }
`;

function FlowerPoints({
  positions,
  hue = 25,
  size = 1.6,
  autoRotate = true,
}: {
  positions: Float32Array;
  hue?: number;
  size?: number;
  autoRotate?: boolean;
}) {
  const ref = React.useRef<THREE.Points>(null!);
  const matRef = React.useRef<THREE.ShaderMaterial>(null!);

  const seeds = React.useMemo(() => {
    const n = positions.length / 3;
    const arr = new Float32Array(n);
    for (let i = 0; i < n; i++) arr[i] = Math.random();
    return arr;
  }, [positions]);

  const sizeJitter = React.useMemo(() => {
    const n = positions.length / 3;
    const arr = new Float32Array(n);
    for (let i = 0; i < n; i++) arr[i] = Math.pow(Math.random(), 1.5); // mostly small
    return arr;
  }, [positions]);

  useFrame(({ clock }, delta) => {
    if (matRef.current)
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    if (autoRotate && ref.current) ref.current.rotation.z += delta * 0.06;
  });

  const color = new THREE.Color().setHSL(hue / 360, 0.85, 0.62);

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSeed"
          count={seeds.length}
          array={seeds}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSizeJ"
          count={sizeJitter.length}
          array={sizeJitter}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
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
        }}
      />
    </points>
  );
}

function Scene({
  maskUrl,
  count = 10000,
  hue = 28,
  bgHue = 285,
  size = 1.6,
  autoRotate = false,
  zoom = 1.3,
}: FlowerParticlesProps) {
  const [positions, setPositions] = React.useState<Float32Array | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (maskUrl) {
        const { x, y } = await sampleMask(maskUrl, count, 0.33);
        const n = x.length;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          arr[i * 3] = x[i];
          arr[i * 3 + 1] = y[i];
          arr[i * 3 + 2] = 0;
        }
        if (mounted) setPositions(arr);
      } else {
        // fallback: procedural flower (rose curve + stem)
        const n = count;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const t = Math.random() * Math.PI * 2;
          const k = 6.0; // petals
          const r =
            Math.abs(sin(k * t)) *
            0.9 *
            (0.4 + 0.6 * Math.pow(Math.random(), 0.6));
          const jitter = (Math.random() - 0.5) * 0.04;
          arr[i * 3] = (r + jitter) * Math.cos(t);
          arr[i * 3 + 1] = (r + jitter) * Math.sin(t);
          arr[i * 3 + 2] = (Math.random() - 0.5) * 0.2; // add depth
        }
        if (mounted) setPositions(arr);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [maskUrl, count]);

  return (
    <>
      {/* Background radial gradient as a huge plane */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[8, 8]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          fragmentShader={`
          varying vec2 vUv; void main(){
            vec2 p = gl_FragCoord.xy; // will ignore vUv due to screen-space
            gl_FragColor = vec4(0.0); }
        `}
          vertexShader={`
          varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} 
        `}
        />
      </mesh>
      {/* Simpler: use a large purple fog-like background via plain color */}
      {/* <color
        attach="background"
        args={[new THREE.Color(`hsl(${bgHue},60%,18%)`)]}
      /> */}
      <fog
        attach="fog"
        args={[new THREE.Color(`hsl(${bgHue},60%,18%)`), 2, 8]}
      />

      {positions && (
        <FlowerPoints
          positions={positions}
          hue={hue}
          size={size}
          autoRotate={autoRotate}
        />
      )}
      <ambientLight intensity={0.5} />
    </>
  );
}

export default function FlowerParticlesR3F({
  className,
  style,
  ...props
}: FlowerParticlesProps) {
  const { zoom = 1.3 } = props;
  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100vh", ...style }}
    >
      <Canvas camera={{ position: [0, 0, 2.8 / zoom], fov: 45 }} dpr={[1, 2]}>
        <Scene {...props} />
      </Canvas>
    </div>
  );
}

// Usage example:
// <FlowerParticlesR3F maskUrl="/masks/flower_mask.png" count={15000} hue={28} bgHue={285} size={2.2} />
