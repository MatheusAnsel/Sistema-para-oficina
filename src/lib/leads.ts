import { randomUUID } from "node:crypto";
import { kv } from "./kv";
import type { Conversation, Lead, LeadMedia, LeadStatus } from "./types";

const leadKey = (id: string) => `lead:${id}`;
const convKey = (phone: string) => `conv:${phone}`;
const INDEX = "leads:index";

export async function getConversation(phone: string): Promise<Conversation> {
  return (
    (await kv().get<Conversation>(convKey(phone))) ?? {
      phone,
      state: "idle",
      draft: {},
      seen: [],
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function saveConversation(conv: Conversation) {
  await kv().set(convKey(conv.phone), conv);
}

export async function createLead(input: {
  phone: string;
  name: string;
  vehicle: string;
  year: number;
  service: string;
  notes: string[];
  media: LeadMedia[];
}): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = { id: randomUUID(), status: "novo", createdAt: now, updatedAt: now, ...input };
  await kv().set(leadKey(lead.id), lead);
  await kv().lpush(INDEX, lead.id);
  return lead;
}

export async function getLead(id: string) {
  return kv().get<Lead>(leadKey(id));
}

export async function listLeads(limit = 100): Promise<Lead[]> {
  const ids = await kv().lrange(INDEX, 0, limit - 1);
  const leads = await Promise.all(ids.map((id) => getLead(id)));
  return leads.filter((l): l is Lead => l !== null);
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const lead = await getLead(id);
  if (!lead) return null;
  const next = { ...lead, status, updatedAt: new Date().toISOString() };
  await kv().set(leadKey(id), next);
  return next;
}

/** mensagens que o cliente manda depois de finalizar o pedido entram no mesmo lead */
export async function appendToLead(id: string, extra: { note?: string; media?: LeadMedia }) {
  const lead = await getLead(id);
  if (!lead) return null;
  const next: Lead = {
    ...lead,
    notes: extra.note ? [...lead.notes, extra.note] : lead.notes,
    media: extra.media ? [...lead.media, extra.media] : lead.media,
    updatedAt: new Date().toISOString(),
  };
  await kv().set(leadKey(id), next);
  return next;
}
