import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect } from "react";

gsap.registerPlugin(SplitText, ScrollTrigger);

export default function useTextAnimations() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      '[data-anim="text-anim"]'
    );

    elements.forEach((el) => {
      // Dividir texto en letras (puedes usar "words" o "lines" también)
      const split = new SplitText(el, { type: "words,chars" });
      const chars = split.chars;

      gsap.from(chars, {
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none none reset",
        },
        opacity: 0,
        y: 40,
        rotateX: -90,
        stagger: 0.03,
        duration: 0.8,
        ease: "power3.out",
      });
    });
  }, []);
}
