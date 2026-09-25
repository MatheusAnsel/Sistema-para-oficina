import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { telefoneOpcional, textoObrigatorio, textoOpcional } from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const search = req.nextUrl.searchParams.get("search");
    let query = "SELECT * FROM clientes WHERE ativo = true";
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (nome ILIKE $${params.length} OR telefone ILIKE $${params.length})`;
    }
    query += " ORDER BY nome";
    const { rows } = await db().query(query, params);
    return NextResponse.json(rows);
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
