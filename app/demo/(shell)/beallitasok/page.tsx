import type { Metadata } from "next";
import { SettingsView } from "@/components/app/Settings";
export const metadata: Metadata = { title: "Beállítások" };
export default function Page() { return <SettingsView />; }
