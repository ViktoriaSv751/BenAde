"use client";
import { useEffect, useState } from "react";
export type Layout = "phone" | "tablet" | "desktop";
export function useLayout(): { layout: Layout; touch: boolean; width: number } {
  const [s, set] = useState<{ layout: Layout; touch: boolean; width: number }>({ layout: "desktop", touch: false, width: 1280 });
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth; const touch = window.matchMedia("(pointer: coarse)").matches;
      set({ layout: w < 900 ? "phone" : w < 1280 ? "tablet" : "desktop", touch, width: w });
    };
    calc(); window.addEventListener("resize", calc); return () => window.removeEventListener("resize", calc);
  }, []);
  return s;
}
