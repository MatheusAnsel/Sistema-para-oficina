import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { business } from "@/config/business";
import { purgeLeadsAntigos } from "@/lib/leads";

export const dynamic = "force-dynamic";

function igual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Limpeza diaria dos pedidos antigos (agendada em vercel.json). A Vercel chama esta rota com
 * "Authorization: Bearer <CRON_SECRET>"; sem CRON_SECRET definido ela fica desligada.
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return NextResponse.json({ error: "CRON_SECRET não definido" }, { status: 503 });
  if (!igual(req.headers.get("authorization") ?? "", `Bearer ${segredo}`)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  const resultado = await purgeLeadsAntigos(new Date(), business.retencao.pedidosDias);
  return NextResponse.json(resultado);
}
