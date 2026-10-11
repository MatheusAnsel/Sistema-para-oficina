import { test } from "node:test";
import assert from "node:assert/strict";
import { leadsParaCsv } from "./leads-csv";
import type { Lead } from "./types";

const lead: Lead = {
  id: "1",
  phone: "5521999990001",
  name: "=HYPERLINK(\"http://x\")",
  vehicle: "Gol 1.0",
  year: 2014,
  service: "Freios",
  notes: ["barulho ao frear", "pedal mole"],
  media: [{ id: "10", kind: "image" }],
  status: "novo",
  createdAt: "2026-10-09T15:00:00.000Z",
  updatedAt: "2026-10-10T15:00:00.000Z",
};

test("leadsParaCsv gera BOM, cabecalho, datas em dd/mm/aaaa e junta as observacoes", () => {
  const csv = leadsParaCsv([lead]);
  assert.ok(csv.startsWith("\uFEFFData do pedido;"));
  const [cab, linha] = csv.trim().split("\r\n");
  assert.equal(cab.split(";").length, 10);
  assert.match(linha, /^09\/10\/2026;10\/10\/2026;/);
  assert.match(linha, /barulho ao frear \| pedal mole/);
  assert.match(linha, /;1$/, "ultima coluna = quantidade de midias");
});

test("leadsParaCsv neutraliza formula digitada pelo cliente (CSV injection)", () => {
  const linha = leadsParaCsv([lead]).trim().split("\r\n")[1];
  assert.ok(linha.includes(`'=HYPERLINK`), "nome que comeca com = ganha apostrofo");
});
