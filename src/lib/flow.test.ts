import { test } from "node:test";
import assert from "node:assert/strict";
import { advance, serviceList } from "./flow";
import { business } from "@/config/business";
import type { Conversation, Incoming } from "./types";

const fresh = (): Conversation => ({
  phone: "5521999990000",
  state: "idle",
  draft: {},
  seen: [],
  updatedAt: new Date().toISOString(),
});

let n = 0;
const text = (t: string): Incoming => ({ id: `m${++n}`, from: "5521999990000", kind: "text", text: t });
const reply = (id: string): Incoming => ({ id: `m${++n}`, from: "5521999990000", kind: "reply", replyId: id });
const image = (): Incoming => ({ id: `m${++n}`, from: "5521999990000", kind: "image", mediaId: "555", caption: "olha o disco" });

const now = new Date("2026-09-19T12:00:00Z");

test("fluxo completo ate o lead", () => {
  let c = fresh();
  let r = advance(c, text("Olá! Vim pelo site e quero um orçamento."), now);
  assert.equal(r.conv.state, "name");
  r = advance(r.conv, text("Matheus Silva"), now);
  assert.equal(r.conv.state, "vehicle");
  r = advance(r.conv, text("VW Gol 1.0"), now);
  assert.equal(r.conv.state, "year");
  r = advance(r.conv, text("2014"), now);
  assert.equal(r.conv.state, "service");
  assert.equal(r.out[0].type, "list");
  r = advance(r.conv, reply("freios"), now);
  assert.equal(r.conv.state, "media");
  r = advance(r.conv, image(), now);
  assert.equal(r.conv.state, "done");
  assert.ok(r.complete);
  assert.equal(r.complete.name, "Matheus Silva");
  assert.equal(r.complete.year, 2014);
  assert.equal(r.complete.service, "Freios");
  assert.equal(r.complete.media[0].id, "555");
  assert.deepEqual(r.complete.notes, ["olha o disco"]);
});

test("mensagem inicial com servico pula a lista", () => {
  let r = advance(fresh(), text("Olá! Vim pelo site e quero um orçamento de Freios."), now);
  r = advance(r.conv, text("Ana"), now);
  r = advance(r.conv, text("Onix"), now);
  r = advance(r.conv, text("2020"), now);
  assert.equal(r.conv.state, "media");
  assert.equal(r.conv.draft.service, "Freios");
});

test("ano invalido pede de novo", () => {
  let r = advance(fresh(), text("oi"), now);
  r = advance(r.conv, text("Ana"), now);
  r = advance(r.conv, text("Onix"), now);
  const bad = advance(r.conv, text("faz tempo"), now);
  assert.equal(bad.conv.state, "year");
  const future = advance(bad.conv, text("2035"), now);
  assert.equal(future.conv.state, "year");
});

test("pular a foto finaliza sem midia", () => {
  let r = advance(fresh(), text("oi"), now);
  r = advance(r.conv, text("Ana"), now);
  r = advance(r.conv, text("Onix"), now);
  r = advance(r.conv, text("2020"), now);
  r = advance(r.conv, reply("motor"), now);
  r = advance(r.conv, reply("skip"), now);
  assert.ok(r.complete);
  assert.equal(r.complete.media.length, 0);
});

test("webhook repetido nao gera resposta duplicada", () => {
  const m = text("oi");
  const first = advance(fresh(), m, now);
  const again = advance(first.conv, m, now);
  assert.equal(again.out.length, 0);
});

test("depois de finalizar, midia extra vai para o mesmo lead", () => {
  let r = advance(fresh(), text("oi"), now);
  r = advance(r.conv, text("Ana"), now);
  r = advance(r.conv, text("Onix"), now);
  r = advance(r.conv, text("2020"), now);
  r = advance(r.conv, reply("motor"), now);
  r = advance(r.conv, text("faz barulho"), now);
  const conv = { ...r.conv, leadId: "lead-1" };
  const extra = advance(conv, image(), new Date(now.getTime() + 60_000));
  assert.deepEqual(extra.out, []);
  assert.equal(extra.attach?.leadId, "lead-1");
});

test("apos 6h um novo contato recomeca o fluxo", () => {
  let r = advance(fresh(), text("oi"), now);
  r = advance(r.conv, text("Ana"), now);
  r = advance(r.conv, text("Onix"), now);
  r = advance(r.conv, text("2020"), now);
  r = advance(r.conv, reply("motor"), now);
  r = advance(r.conv, reply("skip"), now);
  const later = new Date(now.getTime() + 7 * 3600_000);
  const again = advance({ ...r.conv, leadId: "x" }, text("oi, outro carro"), later);
  assert.equal(again.conv.state, "name");
});

test("limites da lista do WhatsApp", () => {
  const list = serviceList();
  assert.equal(list.type, "list");
  if (list.type !== "list") return;
  assert.ok(list.rows.length <= 10);
  assert.ok(list.button.length <= 20);
  for (const row of list.rows) {
    assert.ok(row.title.length <= 24, `titulo longo: ${row.title}`);
    assert.ok((row.description ?? "").length <= 72, `descricao longa: ${row.description}`);
  }
  assert.ok(business.symptoms.some((s) => s.id === "outro"));
});
