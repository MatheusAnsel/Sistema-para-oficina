import { business, type Symptom } from "@/config/business";
import type { Conversation, Incoming, LeadMedia, Outgoing } from "./types";

/**
 * Maquina de estados do atendimento. Funcao pura: recebe a conversa e a
 * mensagem do cliente, devolve a nova conversa e as respostas a enviar.
 * Nao faz I/O, entao da para testar sem WhatsApp.
 */

const RESET_WORDS = ["reiniciar", "recomecar", "menu", "cancelar", "novo orcamento"];
const SKIP_WORDS = ["pular", "nao", "nao tenho", "sem foto", "depois"];
const REOPEN_AFTER_MS = 6 * 60 * 60 * 1000;

export const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

export type CompletedLead = {
  name: string;
  vehicle: string;
  year: number;
  service: string;
  notes: string[];
  media: LeadMedia[];
};

export type FlowResult = {
  conv: Conversation;
  out: Outgoing[];
  /** preenchido quando o cliente terminou as perguntas: criar o lead e avisar a oficina */
  complete?: CompletedLead;
  /** mensagem enviada depois de o pedido ja ter sido finalizado */
  attach?: { leadId: string; note?: string; media?: LeadMedia };
};

const text = (body: string): Outgoing => ({ type: "text", body });

export function serviceList(): Outgoing {
  return {
    type: "list",
    body: "Qual serviço você precisa? Escolha na lista.",
    button: "Ver opções",
    rows: business.symptoms.map((s) => ({ id: s.id, title: s.label, description: s.headline })),
  };
}

function mediaPrompt(): Outgoing {
  return {
    type: "buttons",
    body:
      "Se puder, envie uma foto ou vídeo do problema (a luz do painel, a peça ou o barulho). " +
      "Também vale descrever em poucas palavras. Se não tiver agora, toque em Pular.",
    buttons: [{ id: "skip", title: "Pular" }],
  };
}

function matchSymptom(input: string): Symptom | undefined {
  const t = norm(input);
  if (!t) return undefined;
  return business.symptoms.find(
    (s) =>
      s.id !== "outro" &&
      (t.includes(norm(s.label)) || s.keywords.some((k) => t.includes(norm(k)))),
  );
}

const validText = (s: string, min: number, max: number) => s.length >= min && s.length <= max;

export function advance(conv: Conversation, msg: Incoming, now = new Date()): FlowResult {
  if (conv.seen.includes(msg.id)) return { conv, out: [] };

  let c: Conversation = {
    ...conv,
    seen: [...conv.seen, msg.id].slice(-20),
    updatedAt: now.toISOString(),
  };
  const body = msg.text?.trim() ?? "";
  const t = norm(body);

  const wantsReset = msg.kind === "text" && RESET_WORDS.includes(t);
  const stale =
    c.state === "done" && !!c.doneAt && now.getTime() - Date.parse(c.doneAt) > REOPEN_AFTER_MS;
  if (wantsReset || stale) {
    c = { ...c, state: "idle", draft: {}, leadId: undefined, doneAt: undefined };
  }

  switch (c.state) {
    case "idle": {
      const preset = msg.kind === "text" ? matchSymptom(body) : undefined;
      c = { ...c, state: "name", draft: preset ? { service: preset.label } : {} };
      return {
        conv: c,
        out: [
          text(
            `Olá! Aqui é o atendimento da ${business.name}. ` +
              "Vou pegar alguns dados para a oficina montar o seu orçamento. Leva menos de 2 minutos.\n\n" +
              "Primeiro: qual é o seu nome?",
          ),
        ],
      };
    }

    case "name": {
      if (msg.kind !== "text" || !validText(body, 2, 60)) {
        return { conv: c, out: [text("Não entendi. Me diga só o seu nome, por favor.")] };
      }
      const first = body.split(/\s+/)[0];
      c = { ...c, state: "vehicle", draft: { ...c.draft, name: body } };
      return {
        conv: c,
        out: [text(`Prazer, ${first}! Qual é o veículo? Marca e modelo, por exemplo: Fiat Uno, VW Gol 1.0, Honda Civic.`)],
      };
    }

    case "vehicle": {
      if (msg.kind !== "text" || !validText(body, 2, 60)) {
        return { conv: c, out: [text("Me diga a marca e o modelo do veículo, por exemplo: Chevrolet Onix.")] };
      }
      c = { ...c, state: "year", draft: { ...c.draft, vehicle: body } };
      return { conv: c, out: [text("Qual é o ano do veículo?")] };
    }

    case "year": {
      const found = msg.kind === "text" ? body.match(/\b(19[5-9]\d|20\d{2})\b/) : null;
      const year = found ? Number(found[1]) : NaN;
      if (!found || year > now.getFullYear() + 1) {
        return { conv: c, out: [text("Não consegui ler o ano. Digite com 4 números, por exemplo: 2015.")] };
      }
      const draft = { ...c.draft, year };
      if (draft.service) {
        c = { ...c, state: "media", draft };
        return { conv: c, out: [mediaPrompt()] };
      }
      c = { ...c, state: "service", draft };
      return { conv: c, out: [serviceList()] };
    }

    case "service": {
      let service: string | undefined;
      if (msg.replyId) {
        service = business.symptoms.find((s) => s.id === msg.replyId)?.label;
      } else if (msg.kind === "text" && body) {
        service = matchSymptom(body)?.label ?? body.slice(0, 80);
      }
      if (!service) return { conv: c, out: [serviceList()] };
      c = { ...c, state: "media", draft: { ...c.draft, service } };
      return { conv: c, out: [mediaPrompt()] };
    }

    case "media": {
      const notes: string[] = [];
      const media: LeadMedia[] = [];

      if (msg.replyId === "skip" || (msg.kind === "text" && SKIP_WORDS.includes(t))) {
        // segue sem foto
      } else if (msg.mediaId && msg.kind !== "text" && msg.kind !== "reply" && msg.kind !== "other") {
        media.push({ id: msg.mediaId, kind: msg.kind, caption: msg.caption });
        if (msg.caption) notes.push(msg.caption);
      } else if (msg.kind === "text" && body) {
        notes.push(body);
      } else {
        return { conv: c, out: [mediaPrompt()] };
      }

      const { name, vehicle, year, service } = c.draft;
      if (!name || !vehicle || !year || !service) {
        // rascunho incompleto (nao deveria acontecer): recomeca
        c = { ...c, state: "idle", draft: {} };
        return advance({ ...c, seen: c.seen.filter((id) => id !== msg.id) }, msg, now);
      }

      c = { ...c, state: "done", doneAt: now.toISOString() };
      const summary =
        `Resumo do seu pedido:\n` +
        `Nome: ${name}\n` +
        `Veículo: ${vehicle} (${year})\n` +
        `Serviço: ${service}\n` +
        `Foto ou vídeo: ${media.length ? "recebido" : "não enviado"}\n\n` +
        business.doneMessage;
      return {
        conv: c,
        out: [text(summary)],
        complete: { name, vehicle, year, service, notes, media },
      };
    }

    case "done": {
      if (!c.leadId) return { conv: c, out: [] };
      if (msg.mediaId && msg.kind !== "text" && msg.kind !== "reply" && msg.kind !== "other") {
        return {
          conv: c,
          out: [],
          attach: { leadId: c.leadId, media: { id: msg.mediaId, kind: msg.kind, caption: msg.caption } },
        };
      }
      if (msg.kind === "text" && body) {
        return { conv: c, out: [], attach: { leadId: c.leadId, note: body } };
      }
      return { conv: c, out: [] };
    }
  }
}
