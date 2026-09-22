import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { textoObrigatorio, textoOpcional } from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const nome = textoObrigatorio(body.nome, "o nome");
    const telefone = textoOpcional(body.telefone, 20);
    const email = textoOpcional(body.email, 150);
    const observacoes = textoOpcional(body.observacoes, 2000);

    const { rows } = await db().query(
      `UPDATE clientes SET nome=$1, telefone=$2, email=$3, observacoes=$4 WHERE id=$5 AND ativo=true RETURNING *`,
      [nome, telefone, email, observacoes, id],
    );
    if (!rows[0]) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return NextResponse.json(rows[0]);
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    await db().query("UPDATE clientes SET ativo=false WHERE id=$1", [id]);
    return new NextResponse(null, { status: 204 });
  });
}
