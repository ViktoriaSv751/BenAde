import type { Viewport } from "next";
export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };
export default function L({ children }: { children: React.ReactNode }) { return children; }
