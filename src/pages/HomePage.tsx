// app/page.tsx
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import GlobeCanvas from "../components/Canvas/GlobeCanvas";
import FlowerParticlesR3F from "../components/Canvas/ParticleCanvas";
import {
  default as DotWaveBackground,
  default as ParticleCircleMorph,
} from "../components/Canvas/ParticleCircle";
import { default as WeatherSummaryBlock } from "../components/Charts/Rain";
import Temperature from "../components/Charts/Temperature";
import Hero from "../components/UI/Hero";

gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const [p, setP] = useState(0);

  const heroRef = useRef<HTMLElement | null>(null);
  const dashRef = useRef<HTMLElement | null>(null);
  const tempRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!heroRef.current || !dashRef.current || !tempRef.current) return;

    // Progreso de 0→1 desde el inicio del hero hasta el inicio del dashboard
    const st = ScrollTrigger.create({
      trigger: heroRef.current,
      start: "top top",
      endTrigger: dashRef.current,
      end: "top top",
      scrub: 0.2,
      onUpdate: (self) => setP(self.progress), // 0..1
    });

    // (Opcional) transición del color de fondo del body
    const bgTween = gsap.to(document.documentElement, {
      backgroundColor: "#000",
      ease: "none",
      scrollTrigger: {
        trigger: heroRef.current,
        start: "35% top",
        endTrigger: tempRef.current,
        end: "top top",
        scrub: true,
      },
    });

    return () => {
      st.kill();
      bgTween.kill();
    };
  }, []);

  const goToDashboard = () => {
    dashRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section
        className="position__fixed pointer__events-none overflow__hidden"
        aria-hidden
        style={{
          inset: 0,
          zIndex: 0,
        }}
      >
        <DotWaveBackground
          progress={p} // tu 0..1 de scroll
          color="#FF6A00"
          dotRadius={1.15}
          rows={24}
          cols={220}
          topFraction={0.58}
          ring={{ radius: 255, thickness: 0, center: [0.58, 0.62] }}
          idle={{ drift: 3.2, timeScale: 0.5 }}
          funnel={{ bend: 0.82, swirl: 0.42 }}
        />
      </section>

      <section ref={heroRef} className="hero d__vh100 grid">
        <Hero
          title="NASA, SpaceApp Challenges"
          subtitle="From EarthData to Action: Cloud Computing with Earth Observation Data for Predicting Cleaner, Safer Skies"
          onEnter={goToDashboard}
        />
      </section>
      <section
        ref={tempRef}
        className="temperature-banner container__syp position__relative"
        style={{ zIndex: 2 }}
      >
        <Temperature />
      </section>
      <section className="wind-box"></section>
      <section className="rain-banner container__syp p__t-5">
        <WeatherSummaryBlock
          tempo={{
            cloudFraction: 0.62,
            aerosolOpticalDepth: 0.55,
            absorbingAerosolIndex: 0.3,
            no2: 4.2e-5,
            o3: 8.0e-5,
            so2: 2.0e-6,
            hcho: 6.0e-6,
          }}
        />
      </section>
      <section
        ref={dashRef}
        id="dashboard"
        className="container__syp"
        style={{ minHeight: "100svh" }}
      ></section>
    </>
  );
}
