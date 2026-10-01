import { test } from "node:test";
import assert from "node:assert/strict";
import { ErroValidacao } from "./gestao-validacao";
import {
  filtroClientes,
  filtroOs,
  filtroVeiculos,
  lerIntervalo,
  lerPaginacao,
  POR_PAGINA_MAX,
  POR_PAGINA_PADRAO,
} from "./gestao-lista";
import { celulaCsv, dataBr, numeroBr, paraCsv, respostaCsv } from "./gestao-csv";

const q = (s: string) => new URLSearchParams(s);

// ---------- paginacao ----------
test("paginacao: sem ?pagina= nao pagina (os <select> continuam recebendo a lista inteira)", () => {
  assert.equal(lerPaginacao(q("")), null);
  assert.equal(lerPaginacao(q("search=ana&por_pagina=10")), null);
});

test("paginacao: padrao de 25 por pagina e deslocamento correto", () => {
  assert.deepEqual(lerPaginacao(q("pagina=1")), { pagina: 1, porPagina: POR_PAGINA_PADRAO, offset: 0 });
  assert.deepEqual(lerPaginacao(q("pagina=3")), { pagina: 3, porPagina: 25, offset: 50 });
  assert.deepEqual(lerPaginacao(q("pagina=2&por_pagina=10")), { pagina: 2, porPagina: 10, offset: 10 });
});

test("paginacao: por_pagina nunca passa do maximo", () => {
  assert.equal(lerPaginacao(q("pagina=1&por_pagina=100000"))?.porPagina, POR_PAGINA_MAX);
});

test("paginacao: valores invalidos viram erro 400, nao consulta estranha", () => {
  for (const s of ["pagina=0", "pagina=-1", "pagina=1.5", "pagina=abc", "pagina=", "pagina=1&por_pagina=0", "pagina=1&por_pagina=x", "pagina=99999999"]) {
    assert.throws(() => lerPaginacao(q(s)), ErroValidacao, s);
  }
});

// ---------- intervalo de datas ----------
test("intervalo: vazio, so inicio, so fim e os dois", () => {
  assert.deepEqual(lerIntervalo(q("")), { de: null, ate: null });
  assert.deepEqual(lerIntervalo(q("de=2026-09-01")), { de: "2026-09-01", ate: null });
  assert.deepEqual(lerIntervalo(q("ate=2026-09-30")), { de: null, ate: "2026-09-30" });
  assert.deepEqual(lerIntervalo(q("de=2026-09-01&ate=2026-09-01")), { de: "2026-09-01", ate: "2026-09-01" });
});

test("intervalo: rejeita data fora do formato, inexistente e inicio depois do fim", () => {
  for (const s of ["de=01/09/2026", "de=2026-9-1", "de=2026-02-31", "de=2026-13-01", "ate=abc", "de=2026-09-30&ate=2026-09-01"]) {
    assert.throws(() => lerIntervalo(q(s)), ErroValidacao, s);
  }
  assert.doesNotThrow(() => lerIntervalo(q("de=2028-02-29"))); // ano bissexto existe
  assert.throws(() => lerIntervalo(q("de=2027-02-29")), ErroValidacao);
});

// ---------- filtros SQL ----------
test("filtroClientes: ativo + busca + periodo pelo DIA no fuso da oficina, tudo parametrizado", () => {
  const f = filtroClientes(q("search=ana&de=2026-09-01&ate=2026-09-30"));
  assert.match(f.where, /^WHERE ativo = true AND \(nome ILIKE \$1 OR telefone ILIKE \$1\)/);
  assert.match(f.where, /\(criado_em AT TIME ZONE 'America\/Sao_Paulo'\)::date >= \$2/);
  assert.match(f.where, /\(criado_em AT TIME ZONE 'America\/Sao_Paulo'\)::date <= \$3/);
  assert.deepEqual(f.params, ["%ana%", "2026-09-01", "2026-09-30"]);
});

test("filtroClientes: sem filtros so exige ativo", () => {
  assert.deepEqual(filtroClientes(q("")), { where: "WHERE ativo = true", params: [] });
});

test("filtros nunca colocam o texto do usuario dentro do SQL", () => {
  const malicioso = "x'; DROP TABLE clientes; --";
  for (const f of [filtroClientes(q(`search=${encodeURIComponent(malicioso)}`)), filtroVeiculos(q(`search=${encodeURIComponent(malicioso)}`)), filtroOs(q(`search=${encodeURIComponent(malicioso)}`))]) {
    assert.ok(!f.where.includes("DROP"), f.where);
    assert.ok(f.params.includes(`%${malicioso}%`));
  }
});

test("filtroVeiculos: busca em placa, modelo e cliente + periodo no cadastro", () => {
  const f = filtroVeiculos(q("search=gol&de=2026-01-01"));
  assert.match(f.where, /v\.placa ILIKE \$1 OR v\.modelo ILIKE \$1 OR c\.nome ILIKE \$1/);
  assert.match(f.where, /\(v\.criado_em AT TIME ZONE 'America\/Sao_Paulo'\)::date >= \$2/);
  assert.deepEqual(f.params, ["%gol%", "2026-01-01"]);
});

test("filtroOs: status + veiculo + busca + periodo pela DATA DE ENTRADA (coluna DATE, sem conversao de fuso)", () => {
  const f = filtroOs(q("status=aprovado&veiculo_id=abc&search=42&de=2026-09-01&ate=2026-09-30"));
  assert.match(f.where, /o\.status = \$1 AND o\.veiculo_id = \$2 AND \(.*o\.numero::text ILIKE \$3\)/);
  assert.match(f.where, /AND o\.data_entrada >= \$4 AND o\.data_entrada <= \$5$/);
  assert.ok(!f.where.includes("AT TIME ZONE"));
  assert.deepEqual(f.params, ["aprovado", "abc", "%42%", "2026-09-01", "2026-09-30"]);
});

test("filtroOs: status invalido e periodo invalido viram erro de validacao", () => {
  assert.throws(() => filtroOs(q("status=hackeado")), ErroValidacao);
  assert.throws(() => filtroOs(q("de=2026-09-30&ate=2026-09-01")), ErroValidacao);
});

// ---------- CSV ----------
test("csv: celulas simples ficam como estao; null/undefined viram vazio", () => {
  assert.equal(celulaCsv("Maria Silva"), "Maria Silva");
  assert.equal(celulaCsv(42), "42");
  assert.equal(celulaCsv(null), "");
  assert.equal(celulaCsv(undefined), "");
});

test("csv: separador, aspas e quebra de linha viram campo entre aspas, com aspas dobradas", () => {
  assert.equal(celulaCsv("a;b"), '"a;b"');
  assert.equal(celulaCsv('ele disse "oi"'), '"ele disse ""oi"""');
  assert.equal(celulaCsv("linha 1\nlinha 2"), '"linha 1\nlinha 2"');
  assert.equal(celulaCsv("a,b"), "a,b"); // virgula nao e separador aqui (e decimal no Brasil)
});

test("csv: protege contra CSV injection (formulas) sem estragar numeros e telefones", () => {
  assert.equal(celulaCsv("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
  assert.equal(celulaCsv("=1+1"), "'=1+1");
  assert.equal(celulaCsv("+cmd|' /C calc'!A0"), "'+cmd|' /C calc'!A0");
  assert.equal(celulaCsv("-2+3"), "'-2+3");
  assert.equal(celulaCsv("@SUM(1)"), "'@SUM(1)");
  assert.equal(celulaCsv("\t=1"), "'\t=1");
  // dados legitimos que comecam com sinal nao mudam
  assert.equal(celulaCsv("-5"), "-5");
  assert.equal(celulaCsv("+5521999999999"), "+5521999999999");
  assert.equal(celulaCsv("-12,50"), "-12,50");
  assert.equal(celulaCsv("Maria - Filial"), "Maria - Filial");
});

test("csv: BOM, separador ; e CRLF", () => {
  const csv = paraCsv(["Nome", "Telefone"], [["Maria", "21999990000"], ["Jo;ao", null]]);
  assert.equal(csv, '\uFEFFNome;Telefone\r\nMaria;21999990000\r\n"Jo;ao";\r\n');
});

test("csv: formatos brasileiros de data e numero", () => {
  assert.equal(dataBr("2026-09-30"), "30/09/2026");
  assert.equal(dataBr(null), "");
  assert.equal(dataBr("lixo"), "");
  assert.equal(numeroBr(1234.5), "1234,50");
  assert.equal(numeroBr(0), "0,00");
  // 23h de 30/09 no Brasil (02h de 01/10 em UTC) continua sendo dia 30
  assert.equal(dataBr(new Date("2026-10-01T02:00:00Z")), "30/09/2026");
});

test("csv: resposta de download com tipo, nome com a data de hoje e sem cache", () => {
  const r = respostaCsv("clientes", "x", new Date("2026-09-30T15:00:00Z"));
  assert.equal(r.headers.get("Content-Type"), "text/csv; charset=utf-8");
  assert.equal(r.headers.get("Content-Disposition"), 'attachment; filename="clientes-2026-09-30.csv"');
  assert.equal(r.headers.get("Cache-Control"), "no-store");
});
