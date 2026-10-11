import { test } from "node:test";
import assert from "node:assert/strict";
import { business } from "../config/business";
import type { KV } from "./kv";
import { createLead, deleteLead, getConversation, getLead, listLeads, purgeLeadsAntigos, saveConversation } from "./leads";
import type { Lead } from "./types";

/** Armazenamento em memoria, no lugar do Upstash. */
class FakeKV implements KV {
  dados = new Map<string, unknown>();
  listas = new Map<string, string[]>();
  ttls = new Map<string, number | undefined>();
  async get<T>(k: string) {
    return (this.dados.get(k) as T | undefined) ?? null;
  }
  async set(k: string, v: unknown, o?: { ttlSeconds?: number }) {
    this.dados.set(k, v);
    this.ttls.set(k, o?.ttlSeconds);
  }
  async del(k: string) {
    this.dados.delete(k);
  }
  async lpush(k: string, v: string) {
    this.listas.set(k, [v, ...(this.listas.get(k) ?? [])]);
  }
  async lrange(k: string, a: number, b: number) {
    return (this.listas.get(k) ?? []).slice(a, b === -1 ? undefined : b + 1);
  }
  async lrem(k: string, v: string) {
    this.listas.set(k, (this.listas.get(k) ?? []).filter((x) => x !== v));
  }
}

const base = { name: "Joao", vehicle: "Gol", year: 2014, service: "Freios", notes: [], media: [] };
const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

test("deleteLead apaga o pedido, tira do indice e apaga a conversa do telefone", async () => {
  const kv = new FakeKV();
  const lead = await createLead({ ...base, phone: "5521999990001" }, kv);
  await saveConversation({ phone: lead.phone, state: "done", draft: {}, seen: [], updatedAt: new Date().toISOString(), leadId: lead.id }, kv);

  assert.equal(await deleteLead(lead.id, kv), true);
  assert.equal(await getLead(lead.id, kv), null);
  assert.deepEqual(await listLeads(100, kv), []);
  assert.equal((await getConversation(lead.phone, kv)).state, "idle", "a conversa antiga nao pode sobrar");
  assert.equal(await deleteLead(lead.id, kv), false, "apagar de novo nao quebra");
});

test("saveConversation define a expiracao pelo prazo de retencao", async () => {
  const kv = new FakeKV();
  await saveConversation({ phone: "5521999990002", state: "name", draft: {}, seen: [], updatedAt: new Date().toISOString() }, kv);
  assert.equal(kv.ttls.get("conv:5521999990002"), business.retencao.conversasDias * 86_400);
});

test("purgeLeadsAntigos apaga so o que passou do prazo e limpa ids orfaos", async () => {
  const kv = new FakeKV();
  const velho = await createLead({ ...base, phone: "5521999990003" }, kv);
  const recente = await createLead({ ...base, phone: "5521999990004" }, kv);
  const ativo = await createLead({ ...base, phone: "5521999990005" }, kv);
  await kv.set(`lead:${velho.id}`, { ...velho, createdAt: diasAtras(500), updatedAt: diasAtras(400) } satisfies Lead);
  await kv.set(`lead:${recente.id}`, { ...recente, updatedAt: diasAtras(100) } satisfies Lead);
  // criado ha muito tempo, mas com mensagem recente: continua vivo (conta a ultima atualizacao)
  await kv.set(`lead:${ativo.id}`, { ...ativo, createdAt: diasAtras(600), updatedAt: diasAtras(2) } satisfies Lead);
  await kv.lpush("leads:index", "id-que-nao-existe-mais");

  const r = await purgeLeadsAntigos(new Date(), 365, kv);
  assert.deepEqual(r, { examinados: 4, apagados: 1 });
  assert.equal(await getLead(velho.id, kv), null);
  assert.ok(await getLead(recente.id, kv));
  assert.ok(await getLead(ativo.id, kv));
  assert.ok(!(await kv.lrange("leads:index", 0, -1)).includes("id-que-nao-existe-mais"));
});

test("purgeLeadsAntigos com prazo invalido nao apaga nada", async () => {
  const kv = new FakeKV();
  const lead = await createLead({ ...base, phone: "5521999990006" }, kv);
  await kv.set(`lead:${lead.id}`, { ...lead, updatedAt: diasAtras(9999) } satisfies Lead);
  assert.deepEqual(await purgeLeadsAntigos(new Date(), 0, kv), { examinados: 0, apagados: 0 });
  assert.ok(await getLead(lead.id, kv));
});
