import type { Metadata } from "next";
import { DemoRoot } from "@/components/app/Root";
import DemoGuard from "@/components/DemoGuard";

export const metadata: Metadata = { title: { default: "Tesztfiók · BenAde", template: "%s · BenAde" }, robots: { index: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoGuard><DemoRoot>{children}</DemoRoot></DemoGuard>;
}
