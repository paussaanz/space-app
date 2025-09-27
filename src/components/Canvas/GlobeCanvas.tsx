// components/GlobeCanvas.tsx
import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = { p?: number }; // 0→1
const L = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
// suavizados cortos
const smooth = (t: number) => t * t * (3 - 2 * t); // smoothstep(0,1)
const sstep = (a: number, b: number, t: number) =>
  smooth(clamp01((t - a) / (b - a)));

export default function GlobeCanvas({ p = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pRef = useRef(p);

  useEffect(() => {
    pRef.current = p;
  }, [p]);

  useEffect(() => {
    if (!canvasRef.current || !mountRef.current) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current!,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const setSize = () =>
      renderer.setSize(
        mountRef.current!.clientWidth,
        mountRef.current!.clientHeight
      );
    setSize();

    // Scene / Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 22);

    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current!.clientWidth / mountRef.current!.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 3.2);
    camera.lookAt(0, 0, 0); // cámara fija

    // Luces
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 2, 4);
    scene.add(dir, new THREE.AmbientLight(0xffffff, 0.2));

    // Stars
    // --- Stars (brillantes con halo) ---
    function generateStarTexture() {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const g = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      g.addColorStop(0.0, "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(255,255,255,0.6)");
      g.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    {
      const starCount = 1000;

      // Sitúalas dentro del far de cámara (y por delante de fog far si usas fog)
      const minR = 60;
      const maxR = 70; // <= 300 (camera.far)
      const positions = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        const r = minR + Math.random() * (maxR - minR);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
        positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const starTexture = generateStarTexture();

      const mat = new THREE.PointsMaterial({
        size: 1, // un poco más grandes
        sizeAttenuation: true, // perspectiva correcta
        color: 0xffffff,
        map: starTexture, // halo suave
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      // cruciales para que no se oscurezcan:
      (mat as any).fog = false; // ignora la fog para las estrellas
      (mat as any).toneMapped = false; // evita que el tonemapping/renderer las atenúe

      const stars = new THREE.Points(geo, mat);
      scene.add(stars);
    }

    // Texturas
    const loader = new THREE.TextureLoader();
    const day = loader.load("/images/ipcc_bluemarble_east_lrg.jpg");
    const night = loader.load(
      "https://threejs.org/examples/textures/planets/earth_clouds_1024.png"
    );
    const clouds = loader.load(
      "https://threejs.org/examples/textures/planets/earth_clouds_1024.png"
    );
    day.colorSpace =
      night.colorSpace =
      clouds.colorSpace =
        THREE.SRGBColorSpace;

    // Tierra
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    earthGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.01, 64, 64),
        new THREE.MeshPhongMaterial({
          map: clouds,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        })
      )
    );
    const dayMat = new THREE.MeshPhongMaterial({
      map: day,
      specular: new THREE.Color("#000"),
      shininess: 8,
      emissive: new THREE.Color("#ffffff"),
      emissiveMap: night,
      emissiveIntensity: 0.45,
    });
    earthGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), dayMat));
    earthGroup.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.03, 64, 64),
        new THREE.MeshPhongMaterial({
          color: new THREE.Color("#66aaff"),
          transparent: true,
          opacity: 0.08,
          side: THREE.BackSide,
        })
      )
    );

    // Helper: colocar en NDC a una distancia
    const ray = new THREE.Vector3();
    const ndc = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    function placeAtNDC(
      obj: THREE.Object3D,
      ndcX: number,
      ndcY: number,
      distance: number
    ) {
      ndc.set(ndcX, ndcY, 0.5).unproject(camera);
      ray.copy(ndc).sub(camera.position).normalize();
      tmp.copy(camera.position).add(ray.multiplyScalar(distance));
      obj.position.copy(tmp);
    }

    // Resize
    const onResize = () => {
      if (!mountRef.current) return;
      setSize();
      camera.aspect =
        mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);
    };
    window.addEventListener("resize", onResize);

    // Loop
    let mounted = true;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      if (!mounted) return;
      clock.getDelta();

      // --- SIN ROTACIÓN ---
      earthGroup.rotation.set(0, 0, 0);

      // --- CURVA DE ESCALA: encoge y re-crece justo al final ---
      // encoge de 1 → 0.72 en 0..0.65, luego re-crece 0.65..1 (pulso de “comeback”)
      const t = clamp01(pRef.current);
      const shrink = sstep(0.0, 0.65, t); // 0→1
      const growBack = sstep(0.85, 1.0, t); // 0→1 al final
      const s0 = L(1.0, 0.72, shrink); // encogido
      const s1 = L(s0, 0.95, growBack); // comeback final
      earthGroup.scale.setScalar(s1);

      // --- TRAYECTORIA SERPENTEANTE EN NDC ---
      // Y: baja con easing suave
      const ndcY = L(0.0, -0.9, smooth(t)); // -1 es borde inferior
      // X: serpenteo + deriva ligera a la derecha
      const amplitude = 0.8; // amplitud del zigzag
      const waves = 0.25; // nº de ondas en el recorrido
      const drift = L(0.0, 0.12, t); // deriva suave a la derecha
      const ndcX =
        drift + Math.sin(t * Math.PI * 2 * waves) * amplitude * (1 - t * 0.35);
      // (el factor (1 - t*0.35) reduce un pelín la amplitud al final para no “chocar” con bordes)

      // Distancia constante (puedes ligarla a t si quieres profundidad)
      const dist = 3.0;
      placeAtNDC(earthGroup, ndcX, ndcY, dist);

      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Cleanup
    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
      scene.traverse((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          Array.isArray(o.material)
            ? o.material.forEach((m: any) => m?.dispose?.())
            : o.material?.dispose?.();
        }
      });
      day.dispose();
      night.dispose();
      clouds.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
