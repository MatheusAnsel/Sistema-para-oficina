import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const search = req.nextUrl.searchParams.get("search");
    let query = `
      SELECT v.*, c.nome AS cliente_nome
      FROM veiculos v LEFT JOIN clientes c ON c.id = v.cliente_id
      WHERE v.ativo = true`;
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (v.placa ILIKE $${params.length} OR v.modelo ILIKE $${params.length} OR c.nome ILIKE $${params.length})`;
    }
    query += " ORDER BY v.criado_em DESC";
    const { rows } = await db().query(query, params);
    return NextResponse.json(rows);
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
