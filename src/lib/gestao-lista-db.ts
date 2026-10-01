import { NextResponse } from "next/server";
import { db } from "./db";
import type { Filtro, Paginacao } from "./gestao-lista";

type Consulta = {
  select: string;
  from: string;
  filtro: Filtro;
  ordem: string;
  /** null = sem paginacao (lista inteira, ou ate `limite` linhas). */
  paginacao: Paginacao | null;
  limite?: number;
};

/** Roda a lista. Com paginacao devolve tambem o total (contagem com os mesmos filtros). */
export async function consultarLista(c: Consulta): Promise<{ rows: Record<string, unknown>[]; total: number | null }> {
  const { where, params } = c.filtro;
  const base = `SELECT ${c.select} ${c.from} ${where} ORDER BY ${c.ordem}`;

  if (!c.paginacao) {
    const { rows } = await db().query(c.limite ? `${base} LIMIT ${Math.trunc(c.limite)}` : base, params);
    return { rows, total: null };
  }

  const { rows: contagem } = await db().query(`SELECT count(*)::int AS total ${c.from} ${where}`, params);
  const { rows } = await db().query(`${base} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [
    ...params,
    c.paginacao.porPagina,
    c.paginacao.offset,
  ]);
  return { rows, total: contagem[0].total as number };
}

/**
 * O corpo continua sendo um array (os <select> de cliente/veiculo dependem disso); o total
 * vai no cabecalho X-Total-Count so quando a lista foi paginada.
 */
export function jsonLista(rows: unknown[], total: number | null) {
  return NextResponse.json(rows, total === null ? undefined : { headers: { "X-Total-Count": String(total) } });
}
