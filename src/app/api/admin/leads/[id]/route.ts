import { NextRequest, NextResponse } from "next/server";
import { deleteLead, updateLeadStatus } from "@/lib/leads";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  if (!body?.status || !(body.status in LEAD_STATUS_LABEL)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }
  const lead = await updateLeadStatus(id, body.status as LeadStatus);
  if (!lead) return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });
  return NextResponse.json(lead);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Exclui o pedido e os dados pessoais ligados a ele (pedido do titular, LGPD). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  const apagou = await deleteLead(id);
  if (!apagou) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
