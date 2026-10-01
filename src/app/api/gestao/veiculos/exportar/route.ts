import { NextRequest } from "next/server";
import { dataBr, paraCsv, respostaCsv } from "@/lib/gestao-csv";
import { FROM_VEICULOS, filtroVeiculos, LIMITE_EXPORTACAO, ORDEM_VEICULOS } from "@/lib/gestao-lista";
import { consultarLista } from "@/lib/gestao-lista-db";
import { comTratamentoDeErro } from "@/lib/gestao-route";

export const dynamic = "force-dynamic";

/** CSV dos veiculos ativos, com os mesmos filtros da tela (busca e periodo de cadastro). */
export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const { rows } = await consultarLista({
      select: "v.*, c.nome AS cliente_nome",
      from: FROM_VEICULOS,
      filtro: filtroVeiculos(req.nextUrl.searchParams),
      ordem: ORDEM_VEICULOS,
      paginacao: null,
      limite: LIMITE_EXPORTACAO,
    });
    const csv = paraCsv(
      ["Placa", "Marca", "Modelo", "Ano", "Cor", "Quilometragem", "Cliente", "Cadastrado em"],
      rows.map((r) => [r.placa, r.marca, r.modelo, r.ano, r.cor, r.quilometragem, r.cliente_nome, dataBr(r.criado_em as Date)]),
    );
    return respostaCsv("veiculos", csv);
  });
}
