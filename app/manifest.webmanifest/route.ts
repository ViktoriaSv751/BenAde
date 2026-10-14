export function GET() {
  return Response.json({
    name: "BenAde – Tachográf Emlékeztető",
    short_name: "BenAde",
    description: "Tachográf-határidők egy helyen.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0B1530",
    theme_color: "#0B1530",
    lang: "hu",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, { headers: { "Content-Type": "application/manifest+json" } });
}
