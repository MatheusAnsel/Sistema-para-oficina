import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import {
  dataOpcional,
  inteiroNaoNegativoOpcional,
  textoObrigatorio,
  textoOpcional,
  valorNaoNegativo,
} from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const descricao = textoObrigatorio(body.descricao, "a descrição do serviço", 300);
    const data = dataOpcional(body.data);
    const quilometragem = inteiroNaoNegativoOpcional(body.quilometragem, "a quilometragem");
    const valor = valorNaoNegativo(body.valor);
    const observacoes = textoOpcional(body.observacoes, 2000);

    const { rows } = await db().query(
      `UPDATE servicos SET descricao=$1, data=COALESCE($2, data), quilometragem=$3, valor=$4, observacoes=$5
       WHERE id=$6 RETURNING *`,
      [descricao, data, quilometragem, valor, observacoes, id],
    );
    if (!rows[0]) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
    return NextResponse.json(rows[0]);
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    await db().query("DELETE FROM servicos WHERE id=$1", [id]);
    return new NextResponse(null, { status: 204 });
  });
}
