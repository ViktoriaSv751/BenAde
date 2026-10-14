import type { Metadata } from "next";
import { CalendarView } from "@/components/app/Calendar";
export const metadata: Metadata = { title: "Naptár" };
export default function Page() { return <CalendarView />; }
