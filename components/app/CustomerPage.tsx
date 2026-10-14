"use client";
import { useShell } from "./Shell";
import { CompanyProfile, CustomersView } from "./Customers";
export function CustomerPage({ id }: { id: string }) {
  const { layout } = useShell();
  return layout === "phone" ? <CompanyProfile id={id} /> : <CustomersView selectedId={id} />;
}
