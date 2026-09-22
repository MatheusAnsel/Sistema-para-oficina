import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import {
  anoOpcional,
  inteiroNaoNegativoOpcional,
  placaObrigatoria,
  textoObrigatorio,
  textoOpcional,
} from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const { rows: veiculos } = await db().query(
      `SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone
       FROM veiculos v JOIN clientes c ON c.id = v.cliente_id
       WHERE v.id = $1`,
      [id],
    );
    if (!veiculos[0]) return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });

    const { rows: servicos } = await db().query(
      "SELECT * FROM servicos WHERE veiculo_id = $1 ORDER BY data DESC, criado_em DESC",
      [id],
    );
    return NextResponse.json({ ...veiculos[0], servicos });
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const placa = placaObrigatoria(body.placa);
    const modelo = textoObrigatorio(body.modelo, "o modelo", 100);
    const marca = textoOpcional(body.marca, 60);
    const ano = anoOpcional(body.ano);
    const cor = textoOpcional(body.cor, 40);
    const quilometragem = inteiroNaoNegativoOpcional(body.quilometragem, "a quilometragem");
    const observacoes = textoOpcional(body.observacoes, 2000);

    const { rows } = await db().query(
      `UPDATE veiculos SET placa=$1, marca=$2, modelo=$3, ano=$4, cor=$5, quilometragem=$6, observacoes=$7
       WHERE id=$8 AND ativo=true RETURNING *`,
      [placa, marca, modelo, ano, cor, quilometragem, observacoes, id],
    );
    if (!rows[0]) return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    return NextResponse.json(rows[0]);
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    await db().query("UPDATE veiculos SET ativo=false WHERE id=$1", [id]);
    return new NextResponse(null, { status: 204 });
  });
}
