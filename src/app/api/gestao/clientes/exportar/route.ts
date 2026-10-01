import { NextRequest } from "next/server";
import { dataBr, paraCsv, respostaCsv } from "@/lib/gestao-csv";
import { FROM_CLIENTES, filtroClientes, LIMITE_EXPORTACAO, ORDEM_CLIENTES } from "@/lib/gestao-lista";
import { consultarLista } from "@/lib/gestao-lista-db";
import { comTratamentoDeErro } from "@/lib/gestao-route";

export const dynamic = "force-dynamic";

/** CSV dos clientes ativos, com os mesmos filtros da tela (busca e periodo de cadastro). */
export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const { rows } = await consultarLista({
      select: "*",
      from: FROM_CLIENTES,
      filtro: filtroClientes(req.nextUrl.searchParams),
      ordem: ORDEM_CLIENTES,
      paginacao: null,
      limite: LIMITE_EXPORTACAO,
    });
    const csv = paraCsv(
      ["Nome", "Telefone", "E-mail", "Observações", "Cadastrado em"],
      rows.map((r) => [r.nome, r.telefone, r.email, r.observacoes, dataBr(r.criado_em as Date)]),
    );
    return respostaCsv("clientes", csv);
  });
}
