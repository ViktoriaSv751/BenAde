import Link from "next/link";

export function TruckIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

export function Wordmark({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="wordmark" aria-label="BenAde – kezdőlap">
      <span className="mark"><TruckIcon /></span>
      <span>
        <span className="w" style={light ? { color: "#fff" } : undefined}>Ben<b>Ade</b></span>
        <span className="s" style={{ display: "block", color: light ? "#AFBCDD" : undefined }}>Tachográf emlékeztető</span>
      </span>
    </Link>
  );
}
