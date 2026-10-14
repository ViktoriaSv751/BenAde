import type { Metadata } from "next";
import { ImportWizard } from "@/components/app/ImportWizard";
export const metadata: Metadata = { title: "Excel import" };
export default function Page() { return <ImportWizard />; }
