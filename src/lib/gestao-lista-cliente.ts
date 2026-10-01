/** Itens por pagina nas telas de lista da gestao (a API aceita ate 100). */
export const POR_PAGINA = 25;

/** Total de registros do filtro, vindo do cabecalho X-Total-Count (cai para o tamanho da pagina se faltar). */
export function lerTotal(res: Response, itens: unknown[]): number {
  const bruto = res.headers.get("X-Total-Count");
  const n = bruto === null ? NaN : Number(bruto);
  return Number.isFinite(n) ? n : itens.length;
}

/** Monta a query string so com os campos preenchidos. */
export function filtrosParaQuery(campos: Record<string, string>): URLSearchParams {
  const qs = new URLSearchParams();
  for (const [chave, valor] of Object.entries(campos)) if (valor) qs.set(chave, valor);
  return qs;
}
