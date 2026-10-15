"use client";
import { useShell } from "./Shell";
import { CompanyProfile } from "./Customers";
import { AdatbankView } from "./Adatbank";
export function CustomerPage({ id }: { id: string }) {
  const { layout } = useShell();
  return layout === "phone" ? <CompanyProfile id={id} /> : <AdatbankView selectedId={id} forceView="cegek" />;
}
