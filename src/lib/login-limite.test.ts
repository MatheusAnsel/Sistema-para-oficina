import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import {
  chavesDoLogin,
  criarLimiteEmMemoria,
  HASH_SEM_USUARIO,
  ipCliente,
  JANELA_LOGIN_MIN,
  MAX_FALHAS_EMAIL,
  MAX_FALHAS_IP,
  segundosAteLiberar,
} from "./login-limite";

const cabecalhos = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

test("o hash usado sem usuario e um bcrypt valido de custo 10 (senao o tempo de resposta denuncia o e-mail)", async () => {
  assert.equal(HASH_SEM_USUARIO.length, 60);
  assert.equal(bcrypt.getRounds(HASH_SEM_USUARIO), 10);

  const real = bcrypt.hashSync("outra-senha", 10);
  const medir = async (hash: string) => {
    const inicio = performance.now();
    await bcrypt.compare("tentativa", hash);
    return performance.now() - inicio;
  };
  const tempoFalso = await medir(HASH_SEM_USUARIO);
  const tempoReal = await medir(real);
  // Mesma ordem de grandeza: um hash invalido responderia em menos de 1 ms.
  assert.ok(tempoFalso > tempoReal / 3, `hash sem usuario respondeu rapido demais (${tempoFalso} ms x ${tempoReal} ms)`);
});

test("ipCliente usa o ultimo item do X-Forwarded-For (os anteriores podem ser forjados)", () => {
  assert.equal(ipCliente(cabecalhos({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })), "2.2.2.2");
  assert.equal(ipCliente(cabecalhos({ "x-forwarded-for": " 9.9.9.9 " })), "9.9.9.9");
  assert.equal(ipCliente(cabecalhos({ "x-real-ip": "3.3.3.3" })), "3.3.3.3");
  assert.equal(ipCliente(cabecalhos({})), "desconhecido");
});

test("chaves separam e-mail e IP", () => {
  assert.deepEqual(chavesDoLogin("a@b.com", "1.2.3.4"), { email: "email:a@b.com", ip: "ip:1.2.3.4" });
});

test("segundosAteLiberar bloqueia so quando a chave atinge o limite, ate a falha mais antiga sair da janela", () => {
  const agora = new Date("2026-11-27T12:00:00Z");
  const haCincoMin = new Date(agora.getTime() - 5 * 60_000);

  assert.equal(segundosAteLiberar([], agora), 0);
  assert.equal(segundosAteLiberar([{ chave: "email:x", total: MAX_FALHAS_EMAIL - 1, primeiraEm: haCincoMin }], agora), 0);
  assert.equal(
    segundosAteLiberar([{ chave: "email:x", total: MAX_FALHAS_EMAIL, primeiraEm: haCincoMin }], agora),
    (JANELA_LOGIN_MIN - 5) * 60,
  );
  // O IP tem limite proprio, maior que o do e-mail.
  assert.equal(segundosAteLiberar([{ chave: "ip:1.2.3.4", total: MAX_FALHAS_EMAIL, primeiraEm: haCincoMin }], agora), 0);
  assert.ok(segundosAteLiberar([{ chave: "ip:1.2.3.4", total: MAX_FALHAS_IP, primeiraEm: haCincoMin }], agora) > 0);
});

test("limite em memoria do /admin bloqueia apos o maximo e libera quando a janela passa", () => {
  let agora = 0;
  const limite = criarLimiteEmMemoria({ max: 3, janelaMs: 60_000 }, () => agora);

  for (let i = 0; i < 3; i++) limite.registrarFalha("1.1.1.1");
  assert.equal(limite.segundosAteLiberar("1.1.1.1"), 60);
  assert.equal(limite.segundosAteLiberar("2.2.2.2"), 0);

  agora = 61_000;
  assert.equal(limite.segundosAteLiberar("1.1.1.1"), 0);

  limite.registrarFalha("1.1.1.1");
  limite.limpar("1.1.1.1");
  assert.equal(limite.segundosAteLiberar("1.1.1.1"), 0);
});

test("limite em memoria nao cresce alem do teto de chaves", () => {
  const limite = criarLimiteEmMemoria({ max: 1, janelaMs: 60_000, maxChaves: 2 }, () => 0);
  limite.registrarFalha("a");
  limite.registrarFalha("b");
  limite.registrarFalha("c");
  assert.equal(limite.segundosAteLiberar("a"), 0); // a mais antiga foi descartada
  assert.ok(limite.segundosAteLiberar("c") > 0);
});
