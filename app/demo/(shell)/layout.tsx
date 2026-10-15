import type { Metadata } from "next";
import { DemoRoot } from "@/components/app/Root";

export const metadata: Metadata = { title: { default: "Tesztfiók · BenAde", template: "%s · BenAde" }, robots: { index: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoRoot>{children}</DemoRoot>;
}
