import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularTotal,
  estaNoPatio,
  itensEditaveis,
  paraDataISO,
  paraNumero,
  proximosStatus,
  statusValido,
  tipoItemValido,
  transicaoPermitida,
} from "./os";
import { OS_STATUS } from "./gestao-types";

test("calcularTotal soma em centavos, sem erro de ponto flutuante", () => {
  // 0.1 + 0.2 em float puro da 0.30000000000000004
  assert.equal(calcularTotal([{ quantidade: 1, valor_unitario: 0.1 }, { quantidade: 1, valor_unitario: 0.2 }]), 0.3);
  assert.equal(calcularTotal([{ quantidade: 3, valor_unitario: 33.33 }]), 99.99);
  assert.equal(calcularTotal([{ quantidade: 2.5, valor_unitario: 10 }]), 25);
});

test("calcularTotal de OS sem itens e zero", () => {
  assert.equal(calcularTotal([]), 0);
});

test("calcularTotal mistura servico e peca", () => {
  const total = calcularTotal([
    { quantidade: 1, valor_unitario: 180 },
    { quantidade: 4, valor_unitario: 45.9 },
  ]);
  assert.equal(total, 363.6);
});

test("fluxo feliz: cada status avanca para o proximo", () => {
  const fluxo = ["aguardando_avaliacao", "orcamento_enviado", "aprovado", "em_execucao", "finalizado", "entregue"] as const;
  for (let i = 0; i < fluxo.length - 1; i++) {
    assert.ok(transicaoPermitida(fluxo[i], fluxo[i + 1]), `${fluxo[i]} -> ${fluxo[i + 1]}`);
  }
});

test("nao permite pular etapas para frente", () => {
  assert.equal(transicaoPermitida("aguardando_avaliacao", "em_execucao"), false);
  assert.equal(transicaoPermitida("aguardando_avaliacao", "entregue"), false);
  assert.equal(transicaoPermitida("orcamento_enviado", "finalizado"), false);
  assert.equal(transicaoPermitida("aprovado", "entregue"), false);
});

test("permite voltar um passo (correcao de engano)", () => {
  assert.ok(transicaoPermitida("aprovado", "orcamento_enviado"));
  assert.ok(transicaoPermitida("em_execucao", "aprovado"));
  assert.ok(transicaoPermitida("finalizado", "em_execucao"));
});

test("entregue e cancelado sao finais", () => {
  for (const s of OS_STATUS) {
    assert.equal(transicaoPermitida("entregue", s), s === "entregue", `entregue -> ${s}`);
    assert.equal(transicaoPermitida("cancelado", s), s === "cancelado", `cancelado -> ${s}`);
  }
  assert.deepEqual(proximosStatus("entregue"), []);
  assert.deepEqual(proximosStatus("cancelado"), []);
});

test("qualquer status nao final pode ser cancelado", () => {
  for (const s of OS_STATUS) {
    if (s === "entregue" || s === "cancelado") continue;
    assert.ok(transicaoPermitida(s, "cancelado"), `${s} -> cancelado`);
  }
});

test("manter o mesmo status nunca e erro", () => {
  for (const s of OS_STATUS) assert.ok(transicaoPermitida(s, s));
});

test("estaNoPatio: so aprovado, em execucao e finalizado", () => {
  assert.equal(estaNoPatio("aguardando_avaliacao"), false);
  assert.equal(estaNoPatio("orcamento_enviado"), false);
  assert.equal(estaNoPatio("aprovado"), true);
  assert.equal(estaNoPatio("em_execucao"), true);
  assert.equal(estaNoPatio("finalizado"), true);
  assert.equal(estaNoPatio("entregue"), false);
  assert.equal(estaNoPatio("cancelado"), false);
});

test("itens ficam travados depois de finalizada", () => {
  assert.equal(itensEditaveis("em_execucao"), true);
  assert.equal(itensEditaveis("finalizado"), false);
  assert.equal(itensEditaveis("entregue"), false);
  assert.equal(itensEditaveis("cancelado"), false);
});

test("statusValido e tipoItemValido rejeitam lixo", () => {
  assert.equal(statusValido("aprovado"), true);
  assert.equal(statusValido("xpto"), false);
  assert.equal(statusValido(undefined), false);
  assert.equal(statusValido(1), false);
  assert.equal(tipoItemValido("peca"), true);
  assert.equal(tipoItemValido("servico"), true);
  assert.equal(tipoItemValido("brinde"), false);
});

test("paraNumero converte as strings do pg e nunca devolve NaN", () => {
  assert.equal(paraNumero("180.00"), 180);
  assert.equal(paraNumero("2800.5000"), 2800.5);
  assert.equal(paraNumero("7"), 7);
  assert.equal(paraNumero(null), 0);
  assert.equal(paraNumero("abc"), 0);
});

test("paraDataISO nao volta um dia por causa de fuso", () => {
  // o pg entrega DATE como meia-noite LOCAL
  assert.equal(paraDataISO(new Date(2026, 8, 10)), "2026-09-10");
  assert.equal(paraDataISO(new Date(2026, 0, 1)), "2026-01-01");
  assert.equal(paraDataISO("2026-09-10T00:00:00.000Z"), "2026-09-10");
  assert.equal(paraDataISO(null), null);
});

import { dataNoFuso, janelaPeriodo, periodoValido } from "./os";

test("dataNoFuso usa o fuso da oficina, nao o do servidor", () => {
  // 01:46 UTC do dia 24 ainda e dia 23 no Rio (UTC-3): o bug real que o dashboard teria
  assert.equal(dataNoFuso(new Date("2026-09-24T01:46:00Z")), "2026-09-23");
  assert.equal(dataNoFuso(new Date("2026-09-24T02:59:59Z")), "2026-09-23");
  assert.equal(dataNoFuso(new Date("2026-09-24T03:00:00Z")), "2026-09-24");
});

test("dataNoFuso na virada de ano e de mes", () => {
  assert.equal(dataNoFuso(new Date("2026-01-01T02:00:00Z")), "2025-12-31");
  assert.equal(dataNoFuso(new Date("2026-10-01T02:00:00Z")), "2026-09-30");
});

test("janela 'hoje' e um unico dia", () => {
  assert.deepEqual(janelaPeriodo("hoje", new Date("2026-09-23T15:00:00Z")), { inicio: "2026-09-23", fim: "2026-09-23" });
});

test("janela '7dias' tem 7 dias contando hoje", () => {
  assert.deepEqual(janelaPeriodo("7dias", new Date("2026-09-23T15:00:00Z")), { inicio: "2026-09-17", fim: "2026-09-23" });
});

test("janela '7dias' atravessa a virada de mes e de ano", () => {
  assert.deepEqual(janelaPeriodo("7dias", new Date("2026-10-03T15:00:00Z")), { inicio: "2026-09-27", fim: "2026-10-03" });
  assert.deepEqual(janelaPeriodo("7dias", new Date("2026-01-03T15:00:00Z")), { inicio: "2025-12-28", fim: "2026-01-03" });
});

test("janela 'mes' vai do dia 1 ate hoje", () => {
  assert.deepEqual(janelaPeriodo("mes", new Date("2026-09-23T15:00:00Z")), { inicio: "2026-09-01", fim: "2026-09-23" });
  assert.deepEqual(janelaPeriodo("mes", new Date("2026-09-01T15:00:00Z")), { inicio: "2026-09-01", fim: "2026-09-01" });
});

test("janela respeita o fuso: 01h UTC do dia 1 ainda e o mes anterior no Rio", () => {
  assert.deepEqual(janelaPeriodo("mes", new Date("2026-10-01T01:00:00Z")), { inicio: "2026-09-01", fim: "2026-09-30" });
});

test("ano bissexto: 7 dias em marco", () => {
  assert.deepEqual(janelaPeriodo("7dias", new Date("2028-03-03T15:00:00Z")), { inicio: "2028-02-26", fim: "2028-03-03" });
});

test("periodoValido rejeita lixo", () => {
  assert.equal(periodoValido("mes"), true);
  assert.equal(periodoValido("ano"), false);
  assert.equal(periodoValido(undefined), false);
});
