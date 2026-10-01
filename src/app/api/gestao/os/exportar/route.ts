import { NextRequest } from "next/server";
import { dataBr, numeroBr, paraCsv, respostaCsv } from "@/lib/gestao-csv";
import { FROM_OS, filtroOs, LIMITE_EXPORTACAO, ORDEM_OS } from "@/lib/gestao-lista";
import { consultarLista } from "@/lib/gestao-lista-db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { OS_STATUS_LABEL, type OsStatus } from "@/lib/gestao-types";
import { linhaOs } from "@/lib/os";

export const dynamic = "force-dynamic";

// linhaOs normaliza numero/valor/datas; o resto das colunas continua vindo do SELECT.
type LinhaOs = ReturnType<typeof linhaOs> & Record<string, unknown>;

/** CSV das ordens de servico, com os mesmos filtros da tela (status, busca e periodo de entrada). */
export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const { rows } = await consultarLista({
      select: "o.*, v.placa, v.modelo, c.nome AS cliente_nome",
      from: FROM_OS,
      filtro: filtroOs(req.nextUrl.searchParams),
      ordem: ORDEM_OS,
      paginacao: null,
      limite: LIMITE_EXPORTACAO,
    });
    const csv = paraCsv(
      ["Nº OS", "Entrada", "Previsão", "Conclusão", "Status", "Placa", "Veículo", "Cliente", "Valor total (R$)", "Observações"],
      rows.map((r) => linhaOs(r) as LinhaOs).map((o) => [
        o.numero,
        dataBr(o.data_entrada),
        dataBr(o.data_prevista),
        dataBr(o.data_conclusao),
        OS_STATUS_LABEL[o.status as OsStatus] ?? o.status,
        o.placa,
        o.modelo,
        o.cliente_nome,
        numeroBr(o.valor_total),
        o.observacoes,
      ]),
    );
    return respostaCsv("ordens-de-servico", csv);
  });
}
