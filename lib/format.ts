export function titleCase(s: string): string {
  return String(s || "").trim().replace(/\s+/g, " ").split(" ").map(w => w ? w.split("-").map(p => p.charAt(0).toLocaleUpperCase("hu-HU") + p.slice(1).toLocaleLowerCase("hu-HU")).join("-") : w).join(" ");
}
export function companyName(s: string): string { const v = String(s || "").trim().replace(/\s+/g, " "); return v === v.toLocaleLowerCase("hu-HU") ? titleCase(v) : v; }
export function plateFmt(s: string): string {
  let v = String(s || "").toLocaleUpperCase("hu-HU").trim().replace(/\s+/g, " ").replace(/[^A-Z0-9ÁÉÍÓÖŐÚÜŰ \-]/g, "");
  const c = v.replace(/[\s-]/g, "");
  if (/^[A-Z]{3}[0-9]{3}$/.test(c)) return c.slice(0, 3) + "-" + c.slice(3);
  if (/^[A-Z]{4}[0-9]{3}$/.test(c)) return c.slice(0, 2) + " " + c.slice(2, 4) + "-" + c.slice(4);
  return v;
}
export const fmtFt = (n: number | null | undefined) => (Number(n) || 0).toLocaleString("hu-HU", { maximumFractionDigits: 0 }) + " Ft";
export const fmtNum = (n: number | null | undefined) => (Number(n) || 0).toLocaleString("hu-HU");
export function initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toLocaleUpperCase("hu-HU"); }
export function phoneHref(p?: string | null): string { return "tel:" + String(p || "").replace(/[^+\d]/g, ""); }
export function taxIdFmt(s: string): string { const d = String(s || "").replace(/\D/g, ""); if (d.length === 11) return `${d.slice(0, 8)}-${d[8]}-${d.slice(9)}`; return s.trim(); }
