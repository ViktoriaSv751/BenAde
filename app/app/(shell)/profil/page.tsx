import type { Metadata } from "next";
import { ProfileView } from "@/components/app/Profile";
export const metadata: Metadata = { title: "Profil" };
export default function Page() { return <ProfileView />; }
