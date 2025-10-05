// app/page.tsx
"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { default as StarMorphCanvas } from "../components/Canvas/CircleCanvas";
import FancyAirQualityMap from "../components/Charts/AirQualityMap";
import { AirQualityPanel } from "../components/Charts/AirQualityModel";
import { default as WeatherSummaryBlock } from "../components/Charts/Rain";
import Temperature from "../components/Charts/Temperature";
import HealthBadge from "../components/Charts/Wind";
import Hero from "../components/UI/Hero";
import WeatherTemperature from "../components/UI/TemperatureProps";
gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const [p, setP] = useState(0);
  const lat = 37.1036,
    lon = -76.3868;
  const STYLE_URL = `https://api.maptiler.com/maps/darkmatter/style.json?key=${
    import.meta.env.VITE_MAPTILER_KEY
  }`;

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

    //  const bgTween2 = gsap.to(document.documentElement, {
    //    backgroundColor: "#212121ff",
    //    ease: "none",
    //    scrollTrigger: {
    //      trigger: tempRef.current,
    //      start: "top top",
    //      endTrigger: dashRef.current,
    //      end: "top 5%",
    //      scrub: true,
    //    },
    //  });

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
        {/* <GlobeCanvas /> */}
        <StarMorphCanvas
          progress={p}
          color="#E6E2FF"
          count={3200}
          circleRadius={200}
          dotRadius={1.25}
          twinkle={0.35}
          starShape="full"
          starWarp={{ barrel: 0, curl: 0, curlScale: 1 }}
          starOverscan={0.25} // 👈 clave: dispersa más allá de la pantalla
        />
        {/* <StarGlobeMorphCanvas
          progress={p}
          globeImageSrc="/assets/nightmap.jpg"
          globeMaskProbabilistic={true}
          globeMaskBlurPx={4}
          globeMaskDensity={1.4}
          // centra Europa/África p.ej. (en radianes):
          globeCenterLon={0}
          globeCenterLat={0}
        /> */}

        {/* <LandscapeParticles lat={lat} lon={lon} aqi={153}/> */}
      </section>

      <section ref={heroRef} className="hero d__vh100 grid">
        <Hero
          title="NASA SpaceApp Challenges"
          subtitle="From EarthData to Action: Cloud Computing with Earth Observation Data for Predicting Cleaner, Safer Skies"
          onEnter={goToDashboard}
        />
      </section>

      <section
        className="temperature-banner container__syp position__relative"
        style={{ zIndex: 2 }}
      >
        <Temperature
          label="TEMP."
          lat={lat}
          lon={lon}
          min={-10}
          max={45}
          unit="°C"
          refreshMs={5 * 60 * 1000} // opcional: refresca cada 5 min
        />
      </section>

      <section className="wind-box"></section>

      <section className="rain-banner container__syp p__5 border__bottom">
        <WeatherSummaryBlock
          title="WEATHER"
          lat={40.4168}
          lon={-3.7038}
          refreshMs={5 * 60_000}
        />
      </section>

      <section
        className="predictions-banner container__syp p__t-5"
        style={{ zIndex: 2 }}
        ref={tempRef}
      >
        <AirQualityPanel lat={lat} lon={lon} placeName="Madrid" />
      </section>

      <section
        ref={dashRef}
        id="dashboard"
        className="container__syp"
        style={{ minHeight: "100svh" }}
      >
        <FancyAirQualityMap
          styleUrl={STYLE_URL}
          center={[-98.5, 39.8]}
          zoom={4}
          useOpenAQ={true}
          lockToNorthAmerica={true}
          fitNorthAmericaOnLoad={true}
          onPickLocation={(lat, lon) => {
            // centra tus paneles/forecast en ese punto, dispara notificaciones si hace falta, etc.
            console.log("Nuevo punto:", lat, lon);
          }}
        />
      </section>
    </>
  );
}
