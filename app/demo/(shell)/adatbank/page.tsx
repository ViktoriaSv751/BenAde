import type { Metadata } from "next";
import { AdatbankView } from "@/components/app/Adatbank";
export const metadata: Metadata = { title: "Adatbank" };
export default function Page() { return <AdatbankView />; }
