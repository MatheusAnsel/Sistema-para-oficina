import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FROM_VEICULOS, filtroVeiculos, lerPaginacao, ORDEM_VEICULOS } from "@/lib/gestao-lista";
import { consultarLista, jsonLista } from "@/lib/gestao-lista-db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import {
  anoOpcional,
  inteiroNaoNegativoOpcional,
  placaObrigatoria,
  referenciaOpcional,
  textoObrigatorio,
  textoOpcional,
} from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const p = req.nextUrl.searchParams;
    const { rows, total } = await consultarLista({
      select: "v.*, c.nome AS cliente_nome",
      from: FROM_VEICULOS,
      filtro: filtroVeiculos(p),
      ordem: ORDEM_VEICULOS,
      paginacao: lerPaginacao(p),
    });
    return jsonLista(rows, total);
  });
}

export async function POST(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const body = await req.json().catch(() => ({}));
    const cliente_id = referenciaOpcional(body.cliente_id);
    const placa = placaObrigatoria(body.placa);
    const modelo = textoObrigatorio(body.modelo, "o modelo", 100);
    const marca = textoOpcional(body.marca, 60);
    const ano = anoOpcional(body.ano);
    const cor = textoOpcional(body.cor, 40);
    const quilometragem = inteiroNaoNegativoOpcional(body.quilometragem, "a quilometragem");
    const observacoes = textoOpcional(body.observacoes, 2000);

    const { rows } = await db().query(
      `INSERT INTO veiculos (cliente_id, placa, marca, modelo, ano, cor, quilometragem, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [cliente_id, placa, marca, modelo, ano, cor, quilometragem, observacoes],
    );
    return NextResponse.json(rows[0], { status: 201 });
  });
}
