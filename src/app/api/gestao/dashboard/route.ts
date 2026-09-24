import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { ErroValidacao } from "@/lib/gestao-validacao";
import { FUSO_OFICINA, janelaPeriodo, paraNumero, periodoValido, SQL_HOJE } from "@/lib/os";

export const dynamic = "force-dynamic";

/**
 * Indicadores do dashboard, todos calculados a partir das OS.
 *
 * Regras (cada uma decidida de proposito, ver comentarios):
 *  - patio        : OS aprovada, em execucao ou finalizada (ainda nao entregue)
 *  - em_andamento : OS em execucao
 *  - previstas_hoje: OS abertas com data_prevista = hoje (substitui "agendamentos")
 *  - orcamentos   : OS aguardando avaliacao ou com orcamento enviado
 *  - faturamento  : soma de valor_total das OS finalizadas ou entregues cuja
 *                   data_conclusao cai na janela. Orcamento nao e receita.
 */
export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const periodo = req.nextUrl.searchParams.get("periodo") ?? "mes";
    if (!periodoValido(periodo)) throw new ErroValidacao("Período inválido");
    const { inicio, fim } = janelaPeriodo(periodo);

    // Uma consulta so, com FILTER: o Postgres varre ordens_servico uma vez.
    const { rows } = await db().query(
      `SELECT
         count(*) FILTER (WHERE status IN ('aprovado','em_execucao','finalizado'))              AS patio,
         count(*) FILTER (WHERE status = 'em_execucao')                                          AS em_andamento,
         count(*) FILTER (WHERE status NOT IN ('entregue','cancelado')
                            AND data_prevista = ${SQL_HOJE})                                     AS previstas_hoje,
         count(*) FILTER (WHERE status IN ('aguardando_avaliacao','orcamento_enviado'))          AS orcamentos,
         COALESCE(sum(valor_total) FILTER (WHERE status IN ('finalizado','entregue')
                            AND data_conclusao BETWEEN $1::date AND $2::date), 0)                AS faturamento,
         count(*) FILTER (WHERE status IN ('finalizado','entregue')
                            AND data_conclusao BETWEEN $1::date AND $2::date)                    AS os_concluidas
       FROM ordens_servico`,
      [inicio, fim],
    );
    const r = rows[0];

    return NextResponse.json({
      periodo,
      janela: { inicio, fim },
      fuso: FUSO_OFICINA,
      patio: paraNumero(r.patio),
      em_andamento: paraNumero(r.em_andamento),
      previstas_hoje: paraNumero(r.previstas_hoje),
      orcamentos: paraNumero(r.orcamentos),
      faturamento: paraNumero(r.faturamento),
      os_concluidas: paraNumero(r.os_concluidas),
    });
  });
}
