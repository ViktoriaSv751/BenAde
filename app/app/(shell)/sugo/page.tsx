import type { Metadata } from "next";
import { HelpView } from "@/components/app/Help";
export const metadata: Metadata = { title: "Súgó" };
export default function Page() { return <HelpView />; }
