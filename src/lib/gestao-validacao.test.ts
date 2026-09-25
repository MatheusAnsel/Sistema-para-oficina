import assert from "node:assert/strict";
import { test } from "node:test";
import {
  anoOpcional,
  ErroValidacao,
  inteiroNaoNegativoOpcional,
  placaObrigatoria,
  quantidadePositiva,
  referenciaOpcional,
  telefoneOpcional,
  textoObrigatorio,
  valorNaoNegativo,
} from "./gestao-validacao";

function rejeita(fn: () => unknown) {
  assert.throws(fn, ErroValidacao);
}

test("ano: aceita número, rejeita letra misturada e fora da faixa", () => {
  assert.equal(anoOpcional("2015"), 2015);
  assert.equal(anoOpcional(""), null);
  assert.equal(anoOpcional(undefined), null);
  rejeita(() => anoOpcional("2015a"));
  rejeita(() => anoOpcional("abcd"));
  rejeita(() => anoOpcional("1900"));
});

test("quilometragem (inteiro não negativo): aceita número, rejeita letra e negativo", () => {
  assert.equal(inteiroNaoNegativoOpcional("128430", "a quilometragem"), 128430);
  assert.equal(inteiroNaoNegativoOpcional("", "a quilometragem"), null);
  rejeita(() => inteiroNaoNegativoOpcional("128km", "a quilometragem"));
  rejeita(() => inteiroNaoNegativoOpcional("-5", "a quilometragem"));
});

test("valor (R$): aceita decimal, rejeita letra e negativo", () => {
  assert.equal(valorNaoNegativo("280.5"), 280.5);
  assert.equal(valorNaoNegativo(""), 0);
  rejeita(() => valorNaoNegativo("R$280"));
  rejeita(() => valorNaoNegativo("-10"));
});

test("quantidade: aceita fracionário, rejeita letra e zero", () => {
  assert.equal(quantidadePositiva("2"), 2);
  assert.equal(quantidadePositiva(""), 1);
  rejeita(() => quantidadePositiva("2x"));
  rejeita(() => quantidadePositiva("0"));
});

test("telefone: guarda só os dígitos, rejeita letra e tamanho inválido", () => {
  assert.equal(telefoneOpcional("(21) 99999-8888"), "21999998888");
  assert.equal(telefoneOpcional(""), null);
  rejeita(() => telefoneOpcional("21 99999-triol"));
  rejeita(() => telefoneOpcional("123"));
});

test("placa: aceita Mercosul e antiga, rejeita formato inválido", () => {
  assert.equal(placaObrigatoria("abc1d23"), "ABC1D23");
  assert.equal(placaObrigatoria("ABC-1234"), "ABC1234");
  rejeita(() => placaObrigatoria("ABC123"));
  rejeita(() => placaObrigatoria(""));
});

test("referência opcional (cliente do veículo): vazio vira null, valor passa direto", () => {
  assert.equal(referenciaOpcional(""), null);
  assert.equal(referenciaOpcional(undefined), null);
  assert.equal(referenciaOpcional("algum-id"), "algum-id");
});

test("texto obrigatório: continua exigindo placa/modelo mesmo com o resto opcional", () => {
  rejeita(() => textoObrigatorio("", "o modelo"));
  rejeita(() => textoObrigatorio("   ", "o modelo"));
  assert.equal(textoObrigatorio(" Civic ", "o modelo"), "Civic");
});
