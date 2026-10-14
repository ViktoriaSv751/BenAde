import type { Metadata } from "next";
import { TodayView } from "@/components/app/Today";
export const metadata: Metadata = { title: "Ma" };
export default function Page() { return <TodayView />; }
