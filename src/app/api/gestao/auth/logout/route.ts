import { NextResponse } from "next/server";
import { GESTAO_COOKIE } from "@/lib/gestao-auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GESTAO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
