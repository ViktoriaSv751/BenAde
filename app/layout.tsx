import type { Metadata, Viewport } from "next";
import "./globals.css";


const site = process.env.NEXT_PUBLIC_SITE_URL || "https://benade.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "BenAde – Tachográf Emlékeztető", template: "%s · BenAde" },
  description: "Fedélzeti egység és vezetői kártya letöltések, oktatások és számlahatáridők egy helyen. Időben szólunk, Ön nyugodtan vezethet.",
  applicationName: "BenAde",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "BenAde", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  openGraph: { title: "BenAde – Tachográf Emlékeztető", description: "Minden fontos tachográf-határidő időben.", type: "website", locale: "hu_HU", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#05080F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
