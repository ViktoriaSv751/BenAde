import type { Metadata } from "next";
import { InvoicesView } from "@/components/app/Invoices";
export const metadata: Metadata = { title: "Számlák" };
export default function Page() { return <InvoicesView />; }
