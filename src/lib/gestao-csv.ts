import { dataNoFuso } from "./os";

/**
 * CSV para o Excel brasileiro: separador ";" (o Excel em pt-BR nao abre "," como coluna),
 * UTF-8 com BOM (senao os acentos quebram), quebra de linha CRLF, datas dd/mm/aaaa e
 * numeros com virgula decimal (viram numero de verdade na planilha).
 */

const SEPARADOR = ";";

/**
 * Uma celula comecando com = + - @ (ou TAB/CR) e interpretada como FORMULA pelo Excel/Sheets
 * ("=HYPERLINK(...)", "=cmd|...") — o ataque conhecido como CSV injection. Como nome de
 * cliente e observacao vem de digitacao livre, esses casos recebem um apostrofo na frente.
 * Numeros puros (ex.: -5, +5521999999999) sao dados legitimos e ficam como estao.
 */
export function celulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let s = String(valor);
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  if (/[;"\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function paraCsv(colunas: string[], linhas: unknown[][]): string {
  const todas = [colunas, ...linhas];
  return "\uFEFF" + todas.map((l) => l.map(celulaCsv).join(SEPARADOR)).join("\r\n") + "\r\n";
}

/** "2026-09-30" -> "30/09/2026". Aceita tambem um instante (Date), convertido para o fuso da oficina. */
export function dataBr(v: string | Date | null | undefined): string {
  if (!v) return "";
  const iso = v instanceof Date ? dataNoFuso(v) : v.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** 1234.5 -> "1234,50" */
export function numeroBr(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/** Resposta de download. O nome leva a data de hoje no fuso da oficina. */
export function respostaCsv(nomeBase: string, csv: string, agora: Date = new Date()): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeBase}-${dataNoFuso(agora)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
