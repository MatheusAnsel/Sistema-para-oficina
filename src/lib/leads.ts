import { randomUUID } from "node:crypto";
import { business } from "../config/business";
import { kv, type KV } from "./kv";
import type { Conversation, Lead, LeadMedia, LeadStatus } from "./types";

const leadKey = (id: string) => `lead:${id}`;
const convKey = (phone: string) => `conv:${phone}`;
const INDEX = "leads:index";
const DIA_SEGUNDOS = 86_400;

// O parametro `store` existe para os testes usarem um armazenamento em memoria; no app e sempre o padrao.

export async function getConversation(phone: string, store: KV = kv()): Promise<Conversation> {
  return (
    (await store.get<Conversation>(convKey(phone))) ?? {
      phone,
      state: "idle",
      draft: {},
      seen: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

/** A conversa expira sozinha apos o prazo de retencao (config/business.ts), contado da ultima mensagem. */
export async function saveConversation(conv: Conversation, store: KV = kv()) {
  await store.set(convKey(conv.phone), conv, { ttlSeconds: business.retencao.conversasDias * DIA_SEGUNDOS });
}

export async function createLead(
  input: {
    phone: string;
    name: string;
    vehicle: string;
    year: number;
    service: string;
    notes: string[];
    media: LeadMedia[];
  },
  store: KV = kv(),
): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = { id: randomUUID(), status: "novo", createdAt: now, updatedAt: now, ...input };
  await store.set(leadKey(lead.id), lead);
  await store.lpush(INDEX, lead.id);
  return lead;
}

export async function getLead(id: string, store: KV = kv()) {
  return store.get<Lead>(leadKey(id));
}

export async function listLeads(limit = 100, store: KV = kv()): Promise<Lead[]> {
  const ids = await store.lrange(INDEX, 0, limit - 1);
  const leads = await Promise.all(ids.map((id) => getLead(id, store)));
  return leads.filter((l): l is Lead => l !== null);
}

export async function updateLeadStatus(id: string, status: LeadStatus, store: KV = kv()) {
  const lead = await getLead(id, store);
  if (!lead) return null;
  const next = { ...lead, status, updatedAt: new Date().toISOString() };
  await store.set(leadKey(id), next);
  return next;
}

/** mensagens que o cliente manda depois de finalizar o pedido entram no mesmo lead */
export async function appendToLead(id: string, extra: { note?: string; media?: LeadMedia }, store: KV = kv()) {
  const lead = await getLead(id, store);
  if (!lead) return null;
  const next: Lead = {
    ...lead,
    notes: extra.note ? [...lead.notes, extra.note] : lead.notes,
    media: extra.media ? [...lead.media, extra.media] : lead.media,
    updatedAt: new Date().toISOString(),
  };
  await store.set(leadKey(id), next);
  return next;
}

/**
 * Apaga o pedido (LGPD: pedido do titular ou limpeza). Remove o lead, sai do indice e apaga a
 * conversa guardada para o telefone dele. As fotos e videos nao ficam aqui: a Meta guarda a midia
 * por tempo limitado e o sistema so guarda o identificador, que some junto com o lead.
 * Devolve false se o pedido nao existia (o indice e limpo do mesmo jeito).
 */
export async function deleteLead(id: string, store: KV = kv()): Promise<boolean> {
  const lead = await store.get<Lead>(leadKey(id));
  await store.lrem(INDEX, id);
  if (!lead) return false;
  await store.del(leadKey(id));
  await store.del(convKey(lead.phone));
  return true;
}

/**
 * Limpeza por retencao: apaga os pedidos sem movimentacao ha mais de `dias` (conta a partir da ultima
 * atualizacao, entao um cliente que ainda manda mensagem mantem o pedido vivo) e tira do indice os ids
 * orfaos. Roda em lotes pequenos para nao estourar o tempo da funcao com muitos pedidos.
 */
export async function purgeLeadsAntigos(agora: Date, dias: number, store: KV = kv()) {
  if (!(dias > 0)) return { examinados: 0, apagados: 0 };
  const corte = agora.getTime() - dias * DIA_SEGUNDOS * 1000;
  const ids = await store.lrange(INDEX, 0, -1);
  let apagados = 0;
  for (let i = 0; i < ids.length; i += 20) {
    const resultados = await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        const lead = await store.get<Lead>(leadKey(id));
        if (!lead) {
          await store.lrem(INDEX, id);
          return false;
        }
        if (new Date(lead.updatedAt).getTime() >= corte) return false;
        return deleteLead(id, store);
      }),
    );
    apagados += resultados.filter(Boolean).length;
  }
  return { examinados: ids.length, apagados };
}
