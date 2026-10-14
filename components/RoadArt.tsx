/* Decorative hero illustration: a tachograph dial over a night road, with the app's
   three deadline chips. Pure SVG, scales with its container, honours reduced motion via CSS. */
export default function RoadArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg viewBox="0 0 560 440" role="img" aria-label="Tachográf számlap egy éjszakai országút felett, határidő-címkékkel" className="roadart">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E5EFF" stopOpacity=".35" />
          <stop offset="1" stopColor="#0B1530" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A2A5C" />
          <stop offset="1" stopColor="#0A1330" />
        </linearGradient>
        <linearGradient id="dial" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#15224F" />
          <stop offset="1" stopColor="#0B1530" />
        </linearGradient>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#1E5EFF" />
        </linearGradient>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#1E5EFF" stopOpacity=".55" />
          <stop offset="1" stopColor="#1E5EFF" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* sky + glow */}
      <rect x="0" y="0" width="560" height="440" fill="url(#sky)" />
      <circle cx="280" cy="190" r="190" fill="url(#glow)" />

      {/* road perspective */}
      <path d="M0 440 L205 250 L355 250 L560 440 Z" fill="url(#road)" />
      <path d="M278 250 L282 250 L292 300 L268 300 Z" fill="#FFB020" opacity=".9" />
      <path d="M262 320 L298 320 L314 370 L246 370 Z" fill="#FFB020" opacity=".75" />
      <path d="M238 392 L322 392 L348 440 L212 440 Z" fill="#FFB020" opacity=".6" />
      <path d="M205 250 L0 440" stroke="#5B8CFF" strokeOpacity=".5" strokeWidth="2" />
      <path d="M355 250 L560 440" stroke="#5B8CFF" strokeOpacity=".5" strokeWidth="2" />

      {/* dial */}
      <circle cx="280" cy="190" r="128" fill="url(#dial)" stroke="#2A3C7A" strokeWidth="2" />
      <circle cx="280" cy="190" r="112" fill="none" stroke="#1E2C5C" strokeWidth="14" />
      <circle cx="280" cy="190" r="112" fill="none" stroke="url(#ring)" strokeWidth="14" strokeLinecap="round"
        strokeDasharray="520 704" transform="rotate(135 280 190)" className="roadart-arc" />
      {Array.from({ length: 28 }).map((_, i) => {
        const a = (135 + (i * 270) / 27) * (Math.PI / 180);
        const r1 = 92, r2 = i % 9 === 0 ? 74 : 82;
        return <line key={i} x1={280 + r1 * Math.cos(a)} y1={190 + r1 * Math.sin(a)} x2={280 + r2 * Math.cos(a)} y2={190 + r2 * Math.sin(a)} stroke={i % 9 === 0 ? "#BFD0FF" : "#3F5190"} strokeWidth={i % 9 === 0 ? 3 : 2} strokeLinecap="round" />;
      })}
      <text x="280" y="176" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontWeight="700" fontSize="44" fill="#fff" letterSpacing="-1">90</text>
      <text x="280" y="200" textAnchor="middle" fontFamily="var(--font-body), sans-serif" fontWeight="700" fontSize="12" fill="#AFBCDD" letterSpacing="2">NAP A LETÖLTÉSIG</text>
      {/* needle */}
      <g className="roadart-needle" style={{ transformOrigin: "280px 190px" }}>
        <path d="M280 190 L352 118" stroke="#FFB020" strokeWidth="5" strokeLinecap="round" />
        <circle cx="280" cy="190" r="9" fill="#FFB020" />
        <circle cx="280" cy="190" r="4" fill="#0B1530" />
      </g>

      {/* truck silhouette on the road */}
      <g transform="translate(222 268)">
        <rect x="0" y="18" width="78" height="40" rx="8" fill="#1E5EFF" />
        <rect x="78" y="30" width="32" height="28" rx="6" fill="#5B8CFF" />
        <rect x="84" y="34" width="16" height="12" rx="3" fill="#0B1530" opacity=".7" />
        <circle cx="20" cy="60" r="8" fill="#0B1530" stroke="#AFBCDD" strokeWidth="3" />
        <circle cx="92" cy="60" r="8" fill="#0B1530" stroke="#AFBCDD" strokeWidth="3" />
        <rect x="104" y="40" width="6" height="6" rx="2" fill="#FFB020" />
      </g>

      {/* floating chips */}
      {!compact && (
        <>
          <g transform="translate(26 70)"><g className="roadart-chip">
            <rect width="150" height="50" rx="14" fill="#0F1A3C" stroke="#2A3C7A" />
            <rect x="12" y="12" width="26" height="26" rx="8" fill="#DDF5E8" />
            <circle cx="25" cy="22" r="4" fill="#0F9D58" />
            <path d="M18 33c1.5-4 4.3-6 7-6s5.5 2 7 6" stroke="#0F9D58" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <text x="48" y="24" fontFamily="var(--font-body), sans-serif" fontSize="11" fontWeight="800" fill="#AFBCDD" letterSpacing="1">KÁRTYA</text>
            <text x="48" y="40" fontFamily="var(--font-display), sans-serif" fontSize="15" fontWeight="700" fill="#fff">+28 nap</text>
          </g></g>
          <g transform="translate(392 86)"><g className="roadart-chip" style={{ animationDelay: "1.2s" }}>
            <rect width="142" height="50" rx="14" fill="#0F1A3C" stroke="#2A3C7A" />
            <rect x="12" y="12" width="26" height="26" rx="8" fill="#FFEFD9" />
            <path d="M16 23l9-4 9 4-9 4z" fill="#E07B00" />
            <path d="M20 25v4c0 1.5 2.3 3 5 3s5-1.5 5-3v-4" stroke="#E07B00" strokeWidth="2" fill="none" />
            <text x="48" y="24" fontFamily="var(--font-body), sans-serif" fontSize="11" fontWeight="800" fill="#AFBCDD" letterSpacing="1">OKTATÁS</text>
            <text x="48" y="40" fontFamily="var(--font-display), sans-serif" fontSize="15" fontWeight="700" fill="#fff">06:00</text>
          </g></g>
          <g transform="translate(372 318)"><g className="roadart-chip" style={{ animationDelay: ".6s" }}>
            <rect width="160" height="50" rx="14" fill="#0F1A3C" stroke="#2A3C7A" />
            <rect x="12" y="12" width="26" height="26" rx="8" fill="#FDE4E8" />
            <path d="M19 17h12v16l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" fill="none" stroke="#E0243A" strokeWidth="2" strokeLinejoin="round" />
            <text x="48" y="24" fontFamily="var(--font-body), sans-serif" fontSize="11" fontWeight="800" fill="#AFBCDD" letterSpacing="1">SZÁMLA</text>
            <text x="48" y="40" fontFamily="var(--font-display), sans-serif" fontSize="15" fontWeight="700" fill="#fff">+30 nap</text>
          </g></g>
        </>
      )}
      <style>{`
        .roadart-chip{animation:chipfloat 5s ease-in-out infinite}
        .roadart-needle{animation:needle 6s ease-in-out infinite}
        .roadart-arc{animation:arc 2.4s cubic-bezier(.2,.8,.2,1) 1 both}
        @keyframes chipfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes needle{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-14deg)}}
        @keyframes arc{from{stroke-dasharray:0 704}to{stroke-dasharray:520 704}}
        @media (prefers-reduced-motion:reduce){.roadart-chip,.roadart-needle,.roadart-arc{animation:none}}
      `}</style>
    </svg>
  );
}
