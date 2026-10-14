import type { Metadata } from "next";
import { NotificationsView } from "@/components/app/Notifications";
export const metadata: Metadata = { title: "Értesítések" };
export default function Page() { return <NotificationsView />; }
