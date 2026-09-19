import { createHmac, timingSafeEqual } from "node:crypto";
import type { Incoming, Lead, Outgoing } from "./types";

const graph = () => `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || "v23.0"}`;
const phoneId = () => process.env.WHATSAPP_PHONE_NUMBER_ID;
const token = () => process.env.WHATSAPP_ACCESS_TOKEN;

export const digits = (s: string) => s.replace(/\D/g, "");

/** valida o header X-Hub-Signature-256 enviado pela Meta */
export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = header.slice("sha256=".length);
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function post(payload: Record<string, unknown>) {
  if (!phoneId() || !token()) {
    console.warn("[whatsapp] WHATSAPP_PHONE_NUMBER_ID/WHATSAPP_ACCESS_TOKEN ausentes; mensagem nao enviada");
    return;
  }
  const res = await fetch(`${graph()}/${phoneId()}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!res.ok) {
    console.error("[whatsapp] falha ao enviar", res.status, await res.text());
  }
}

export async function send(to: string, msg: Outgoing) {
  switch (msg.type) {
    case "text":
      return post({ to, type: "text", text: { body: msg.body } });
    case "buttons":
      return post({
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: msg.body },
          action: {
            buttons: msg.buttons.slice(0, 3).map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      });
    case "list":
      return post({
        to,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: msg.body },
          action: {
            button: msg.button.slice(0, 20),
            sections: [
              {
                title: "Opções",
                rows: msg.rows.slice(0, 10).map((r) => ({
                  id: r.id,
                  title: r.title.slice(0, 24),
                  ...(r.description ? { description: r.description.slice(0, 72) } : {}),
                })),
              },
            ],
          },
        },
      });
  }
}

/** parametros de template nao aceitam quebra de linha nem espacos repetidos */
const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 200) || "-";

/**
 * Avisa a oficina de um lead novo.
 * Fora da janela de 24h a Meta so entrega template aprovado (NOTIFY_MODE=template).
 */
export async function notifyWorkshop(lead: Lead) {
  const numbers = (process.env.WORKSHOP_NOTIFY_NUMBERS ?? "")
    .split(",")
    .map(digits)
    .filter(Boolean);
  if (numbers.length === 0) return;

  const chatLink = `https://wa.me/${lead.phone}`;
  const mode = process.env.NOTIFY_MODE === "text" ? "text" : "template";

  await Promise.all(
    numbers.map((to) => {
      if (mode === "text") {
        const body =
          `Novo pedido de orçamento\n` +
          `Cliente: ${lead.name}\n` +
          `Veículo: ${lead.vehicle} (${lead.year})\n` +
          `Serviço: ${lead.service}\n` +
          (lead.notes.length ? `Detalhes: ${lead.notes.join(" | ")}\n` : "") +
          `Fotos/vídeos: ${lead.media.length}\n` +
          `Chamar cliente: ${chatLink}`;
        return post({ to, type: "text", text: { body } });
      }
      return post({
        to,
        type: "template",
        template: {
          name: process.env.NOTIFY_TEMPLATE || "novo_orcamento",
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: [lead.name, lead.vehicle, String(lead.year), lead.service, chatLink].map((text) => ({
                type: "text",
                text: clean(text),
              })),
            },
          ],
        },
      });
    }),
  );
}

/** baixa uma midia recebida (a URL da Meta exige o token e expira) */
export async function fetchMedia(mediaId: string): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  if (!token()) return null;
  const meta = await fetch(`${graph()}/${mediaId}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!meta.ok) return null;
  const { url, mime_type } = (await meta.json()) as { url: string; mime_type?: string };
  const file = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!file.ok) return null;
  return {
    body: await file.arrayBuffer(),
    contentType: mime_type ?? file.headers.get("content-type") ?? "application/octet-stream",
  };
}

/* ---------- parse do webhook ---------- */

type WaMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; caption?: string };
  video?: { id: string; caption?: string };
  audio?: { id: string };
  document?: { id: string; caption?: string };
  interactive?: {
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  button?: { payload?: string; text?: string };
};

type WebhookBody = {
  entry?: {
    changes?: {
      value?: {
        messages?: WaMessage[];
        contacts?: { wa_id: string; profile?: { name?: string } }[];
      };
    }[];
  }[];
};

export function parseWebhook(body: unknown): Incoming[] {
  const out: Incoming[] = [];
  for (const entry of (body as WebhookBody)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;
      for (const m of value.messages) {
        const profileName = value.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        const base = { id: m.id, from: m.from, profileName };
        if (m.type === "text") out.push({ ...base, kind: "text", text: m.text?.body });
        else if (m.type === "image" && m.image) out.push({ ...base, kind: "image", mediaId: m.image.id, caption: m.image.caption });
        else if (m.type === "video" && m.video) out.push({ ...base, kind: "video", mediaId: m.video.id, caption: m.video.caption });
        else if (m.type === "audio" && m.audio) out.push({ ...base, kind: "audio", mediaId: m.audio.id });
        else if (m.type === "document" && m.document) out.push({ ...base, kind: "document", mediaId: m.document.id, caption: m.document.caption });
        else if (m.type === "interactive") {
          const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
          out.push({ ...base, kind: "reply", replyId: r?.id, text: r?.title });
        } else if (m.type === "button") out.push({ ...base, kind: "reply", replyId: m.button?.payload, text: m.button?.text });
        else out.push({ ...base, kind: "other" });
      }
    }
  }
  return out;
}
