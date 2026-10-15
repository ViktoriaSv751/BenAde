import Link from "next/link";

/** Text-only wordmark – the product has no pictorial logo. */
export function Wordmark({ href = "/login", sub = "", className = "brand" }: { href?: string; sub?: string; className?: string }) {
  return (
    <Link href={href} className={className} aria-label="BenAde">
      <span className="w">Ben<b>Ade</b></span>
      {sub && <span className="s">{sub}</span>}
    </Link>
  );
}
