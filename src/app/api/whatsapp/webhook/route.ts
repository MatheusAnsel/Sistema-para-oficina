import { NextRequest, NextResponse } from "next/server";
import { advance } from "@/lib/flow";
import { appendToLead, createLead, getConversation, getLead, saveConversation } from "@/lib/leads";
import { notifyWorkshop, parseWebhook, send, verifySignature } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Verificacao do webhook (a Meta chama uma vez ao cadastrar a URL) */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (expected && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === expected) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** Mensagens do cliente */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Sempre responde 200 depois de processar: erro interno nao deve causar
  // reenvio em cascata pela Meta (o dedupe por message id cobre o resto).
  for (const msg of parseWebhook(payload)) {
    try {
      const conv = await getConversation(msg.from);
      const result = advance(conv, msg);
      let next = result.conv;

      if (result.complete) {
        const lead = await createLead({ phone: msg.from, ...result.complete });
        next = { ...next, leadId: lead.id };
        await notifyWorkshop(lead);
      }
      if (result.attach) {
        const lead = await getLead(result.attach.leadId);
        if (lead) await appendToLead(lead.id, result.attach);
      }

      await saveConversation(next);
      for (const out of result.out) await send(msg.from, out);
    } catch (err) {
      console.error("[webhook] erro ao processar mensagem", msg.id, err);
    }
  }
  return NextResponse.json({ ok: true });
}
