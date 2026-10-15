import VersionWatch from "@/components/VersionWatch";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import "./globals.css";
import "./styles/invoices.css";
import "./styles/customers.css";
import "./styles/capture.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://benade.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "BenAde – Tachográf Emlékeztető", template: "%s · BenAde" },
  description: "Fedélzeti egység és vezetői kártya letöltések, oktatások és számlahatáridők egy helyen. Időben szólunk, Ön nyugodtan vezethet.",
  applicationName: "BenAde",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BenAde", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  openGraph: { title: "BenAde – Tachográf Emlékeztető", description: "Minden fontos tachográf-határidő időben.", type: "website", locale: "hu_HU", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F4F5F8" }, { media: "(prefers-color-scheme: dark)", color: "#0A0D14" }],
  width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover",
};

const themeInit = `try{var t=localStorage.getItem('benade.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);if(localStorage.getItem('benade.textsize')==='lg')document.documentElement.setAttribute('data-textsize','lg')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>{children}<VersionWatch /></body>
    </html>
  );
}
