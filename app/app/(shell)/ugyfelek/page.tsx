import type { Metadata } from "next";
import { CustomersView } from "@/components/app/Customers";
export const metadata: Metadata = { title: "Ügyfelek" };
export default function Page() { return <CustomersView />; }
