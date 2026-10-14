import type { Metadata } from "next";
import { CustomerPage } from "@/components/app/CustomerPage";
export const metadata: Metadata = { title: "Ügyfél" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <CustomerPage id={id} />; }
