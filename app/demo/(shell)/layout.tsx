import type { Metadata } from "next";
import { DemoRoot } from "@/components/app/Root";

export const metadata: Metadata = { title: { default: "Bemutató · BenAde", template: "%s · Bemutató · BenAde" }, robots: { index: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoRoot>{children}</DemoRoot>;
}
