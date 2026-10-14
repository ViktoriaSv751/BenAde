import type { Metadata } from "next";
import { TeamView } from "@/components/app/Team";
export const metadata: Metadata = { title: "Csapat" };
export default function Page() { return <TeamView />; }
