import { OS_STATUS, type OsItem, type OsItemTipo, type OsStatus } from "./gestao-types";

/**
 * Regras da Ordem de Servico, sem acesso a banco (testaveis em os.test.ts).
 */

/** Soma dos itens em centavos, para evitar erro de ponto flutuante (0.1 + 0.2). */
export function calcularTotal(itens: Pick<OsItem, "quantidade" | "valor_unitario">[]): number {
  const centavos = itens.reduce((soma, i) => soma + Math.round(i.quantidade * i.valor_unitario * 100), 0);
  return centavos / 100;
}

/**
 * Fluxo permitido entre status. "cancelado" e "entregue" sao finais.
 * Permite voltar um passo (ex.: cliente recusou o orcamento aprovado por engano),
 * mas nao pular etapas para frente.
 */
const TRANSICOES: Record<OsStatus, OsStatus[]> = {
  aguardando_avaliacao: ["orcamento_enviado", "cancelado"],
  orcamento_enviado: ["aprovado", "aguardando_avaliacao", "cancelado"],
  aprovado: ["em_execucao", "orcamento_enviado", "cancelado"],
  em_execucao: ["finalizado", "aprovado", "cancelado"],
  finalizado: ["entregue", "em_execucao", "cancelado"],
  entregue: [],
  cancelado: [],
};

export function transicaoPermitida(de: OsStatus, para: OsStatus): boolean {
  return de === para || TRANSICOES[de].includes(para);
}

export function proximosStatus(de: OsStatus): OsStatus[] {
  return TRANSICOES[de];
}

/** OS em andamento no patio: ja aprovada e ainda nao entregue/cancelada. */
export function estaNoPatio(status: OsStatus): boolean {
  return status === "aprovado" || status === "em_execucao" || status === "finalizado";
}

/** Itens so podem ser editados enquanto a OS nao foi finalizada. */
export function itensEditaveis(status: OsStatus): boolean {
  return status === "aguardando_avaliacao" || status === "orcamento_enviado" || status === "aprovado" || status === "em_execucao";
}

export function statusValido(v: unknown): v is OsStatus {
  return typeof v === "string" && (OS_STATUS as readonly string[]).includes(v);
}

export function tipoItemValido(v: unknown): v is OsItemTipo {
  return v === "servico" || v === "peca";
}

/**
 * O driver pg devolve NUMERIC e BIGINT como string e DATE como Date.
 * Converte na borda da API para o front receber numero e "YYYY-MM-DD" de verdade.
 */
export function paraNumero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function paraDataISO(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    // colunas DATE chegam como meia-noite local; usa componentes locais para nao voltar 1 dia
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}

/** Converte uma linha crua de ordens_servico (tipos do pg) para o formato entregue pela API. */
export function linhaOs(r: Record<string, unknown>) {
  return {
    ...r,
    numero: paraNumero(r.numero),
    valor_total: paraNumero(r.valor_total),
    data_entrada: paraDataISO(r.data_entrada),
    data_prevista: paraDataISO(r.data_prevista),
    data_conclusao: paraDataISO(r.data_conclusao),
  };
}

/**
 * Fuso da oficina. O banco (Supabase) e o servidor rodam em UTC, entao
 * CURRENT_DATE viraria "amanha" a partir das 21h no Brasil. Toda data de
 * negocio (entrada, conclusao, "hoje" do dashboard) usa este fuso.
 */
export const FUSO_OFICINA = "America/Sao_Paulo";

/** Expressao SQL da data de hoje no fuso da oficina. */
export const SQL_HOJE = `(now() AT TIME ZONE '${FUSO_OFICINA}')::date`;

export type Periodo = "hoje" | "7dias" | "mes";

export function periodoValido(v: unknown): v is Periodo {
  return v === "hoje" || v === "7dias" || v === "mes";
}

/** "YYYY-MM-DD" de um instante, no fuso da oficina (nao no do servidor). */
export function dataNoFuso(instante: Date, fuso: string = FUSO_OFICINA): string {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso }).format(instante);
}

function somarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  // UTC de proposito: so aritmetica de calendario, sem horario de verao no meio
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  return t.toISOString().slice(0, 10);
}

/**
 * Janela [inicio, fim] (inclusive, em "YYYY-MM-DD") de cada filtro do dashboard.
 *  - hoje : so o dia de hoje
 *  - 7dias: hoje e os 6 dias anteriores (7 dias corridos, contando hoje)
 *  - mes  : do dia 1 do mes corrente ate hoje
 */
export function janelaPeriodo(periodo: Periodo, agora: Date = new Date()): { inicio: string; fim: string } {
  const hoje = dataNoFuso(agora);
  if (periodo === "hoje") return { inicio: hoje, fim: hoje };
  if (periodo === "7dias") return { inicio: somarDias(hoje, -6), fim: hoje };
  return { inicio: `${hoje.slice(0, 8)}01`, fim: hoje };
}
