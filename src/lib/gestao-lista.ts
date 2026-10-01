import { ErroValidacao } from "./gestao-validacao";
import { FUSO_OFICINA, statusValido } from "./os";

/**
 * Parametros de lista das rotas /api/gestao (paginacao, periodo e busca). Modulo puro: sem I/O,
 * entao da para testar sem banco. As consultas em si ficam em gestao-lista-db.ts.
 */

export const POR_PAGINA_PADRAO = 25;
export const POR_PAGINA_MAX = 100;
/** Teto de linhas de uma exportacao CSV (protege o servidor; uma oficina nao chega perto disso). */
export const LIMITE_EXPORTACAO = 50000;

export type Paginacao = { pagina: number; porPagina: number; offset: number };
export type Intervalo = { de: string | null; ate: string | null };
export type Filtro = { where: string; params: unknown[] };

/**
 * A paginacao e opcional e so liga com ?pagina=N. Sem esse parametro as rotas continuam
 * devolvendo a lista inteira, que e o que os <select> de cliente/veiculo usam.
 */
export function lerPaginacao(p: URLSearchParams): Paginacao | null {
  const bruto = p.get("pagina");
  if (bruto === null) return null;

  const pagina = Number(bruto);
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 100000) throw new ErroValidacao("Página inválida");

  let porPagina = POR_PAGINA_PADRAO;
  const pp = p.get("por_pagina");
  if (pp !== null) {
    const n = Number(pp);
    if (!Number.isInteger(n) || n < 1) throw new ErroValidacao("Quantidade por página inválida");
    porPagina = Math.min(n, POR_PAGINA_MAX);
  }
  return { pagina, porPagina, offset: (pagina - 1) * porPagina };
}

/** "YYYY-MM-DD" que existe de verdade no calendario (rejeita 2026-02-31 e 2026-13-01). */
function dataReal(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function lerData(p: URLSearchParams, nome: string): string | null {
  const v = p.get(nome);
  if (v === null || v === "") return null;
  if (!dataReal(v)) throw new ErroValidacao("Data inválida");
  return v;
}

/** ?de=YYYY-MM-DD&ate=YYYY-MM-DD, os dois opcionais e inclusivos. */
export function lerIntervalo(p: URLSearchParams): Intervalo {
  const de = lerData(p, "de");
  const ate = lerData(p, "ate");
  if (de && ate && de > ate) throw new ErroValidacao("A data inicial não pode ser depois da final");
  return { de, ate };
}

/**
 * Trecho SQL do filtro de periodo. `coluna` e sempre uma constante deste modulo (nunca entrada do
 * usuario). Colunas TIMESTAMPTZ sao comparadas pelo dia no fuso da oficina, nao em UTC, senao um
 * cadastro das 22h de dia 5 contaria como dia 6.
 */
function sqlIntervalo(coluna: string, tipo: "data" | "instante", i: Intervalo, params: unknown[]): string {
  const expr = tipo === "instante" ? `(${coluna} AT TIME ZONE '${FUSO_OFICINA}')::date` : coluna;
  let sql = "";
  if (i.de) {
    params.push(i.de);
    sql += ` AND ${expr} >= $${params.length}`;
  }
  if (i.ate) {
    params.push(i.ate);
    sql += ` AND ${expr} <= $${params.length}`;
  }
  return sql;
}

export const FROM_CLIENTES = "FROM clientes";
export const FROM_VEICULOS = "FROM veiculos v LEFT JOIN clientes c ON c.id = v.cliente_id";
export const FROM_OS =
  "FROM ordens_servico o JOIN veiculos v ON v.id = o.veiculo_id LEFT JOIN clientes c ON c.id = v.cliente_id";

// id como desempate: sem ele, linhas com o mesmo criado_em/nome poderiam repetir ou sumir entre paginas.
export const ORDEM_CLIENTES = "nome, id";
export const ORDEM_VEICULOS = "v.criado_em DESC, v.id";
export const ORDEM_OS = "o.criado_em DESC, o.id";

export function filtroClientes(p: URLSearchParams): Filtro {
  const params: unknown[] = [];
  let where = "WHERE ativo = true";
  const search = p.get("search");
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (nome ILIKE $${params.length} OR telefone ILIKE $${params.length})`;
  }
  where += sqlIntervalo("criado_em", "instante", lerIntervalo(p), params);
  return { where, params };
}

export function filtroVeiculos(p: URLSearchParams): Filtro {
  const params: unknown[] = [];
  let where = "WHERE v.ativo = true";
  const search = p.get("search");
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (v.placa ILIKE $${params.length} OR v.modelo ILIKE $${params.length} OR c.nome ILIKE $${params.length})`;
  }
  where += sqlIntervalo("v.criado_em", "instante", lerIntervalo(p), params);
  return { where, params };
}

export function filtroOs(p: URLSearchParams): Filtro {
  const params: unknown[] = [];
  let where = "WHERE 1=1";

  const status = p.get("status");
  if (status) {
    if (!statusValido(status)) throw new ErroValidacao("Status inválido");
    params.push(status);
    where += ` AND o.status = $${params.length}`;
  }
  const veiculo = p.get("veiculo_id");
  if (veiculo) {
    params.push(veiculo);
    where += ` AND o.veiculo_id = $${params.length}`;
  }
  const search = p.get("search");
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    where += ` AND (v.placa ILIKE $${n} OR v.modelo ILIKE $${n} OR c.nome ILIKE $${n} OR o.numero::text ILIKE $${n})`;
  }
  // O filtro de data da OS e pela data de ENTRADA (coluna DATE, indexada).
  where += sqlIntervalo("o.data_entrada", "data", lerIntervalo(p), params);
  return { where, params };
}
