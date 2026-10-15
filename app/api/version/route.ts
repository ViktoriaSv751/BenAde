import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ v: process.env.NEXT_PUBLIC_BUILD || "" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
