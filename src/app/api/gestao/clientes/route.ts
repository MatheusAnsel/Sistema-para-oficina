import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FROM_CLIENTES, filtroClientes, lerPaginacao, ORDEM_CLIENTES } from "@/lib/gestao-lista";
import { consultarLista, jsonLista } from "@/lib/gestao-lista-db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { telefoneOpcional, textoObrigatorio, textoOpcional } from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const p = req.nextUrl.searchParams;
    const { rows, total } = await consultarLista({
      select: "*",
      from: FROM_CLIENTES,
      filtro: filtroClientes(p),
      ordem: ORDEM_CLIENTES,
      paginacao: lerPaginacao(p),
    });
    return jsonLista(rows, total);
  });
}

export async function POST(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const body = await req.json().catch(() => ({}));
    const nome = textoObrigatorio(body.nome, "o nome");
    const telefone = telefoneOpcional(body.telefone);
    const email = textoOpcional(body.email, 150);
    const observacoes = textoOpcional(body.observacoes, 2000);

    const { rows } = await db().query(
      `INSERT INTO clientes (nome, telefone, email, observacoes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [nome, telefone, email, observacoes],
    );
    return NextResponse.json(rows[0], { status: 201 });
  });
}
