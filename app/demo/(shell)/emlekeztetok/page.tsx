import type { Metadata } from "next";
import { RemindersView } from "@/components/app/Reminders";
export const metadata: Metadata = { title: "Emlékeztetők" };
export default function Page() { return <RemindersView />; }
