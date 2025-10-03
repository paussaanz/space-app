// src/contexts/AnimationProvider.tsx
import { ReactNode } from "react";
import useTextAnimations from "../animations/TextAnim";

export function AnimationProvider({ children }: { children: ReactNode }) {
  useTextAnimations(); // activa animaciones globales
  return <>{children}</>;
}
