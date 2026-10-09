import { NextRequest, NextResponse } from "next/server";
import { db, transacao } from "@/lib/db";
import { apagarArquivo } from "@/lib/storage";
import { ErroValidacao } from "@/lib/gestao-validacao";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import {
  anoOpcional,
  inteiroNaoNegativoOpcional,
  placaObrigatoria,
  textoObrigatorio,
  textoOpcional,
} from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const { rows: veiculos } = await db().query(
      `SELECT v.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone
       FROM veiculos v LEFT JOIN clientes c ON c.id = v.cliente_id
       WHERE v.id = $1`,
      [id],
    );
    if (!veiculos[0]) return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });

    return NextResponse.json(veiculos[0]);
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

/**
 * Apagar veiculo:
 *  - sem nenhuma OS: DELETE de verdade (some do banco, junto com a foto);
 *  - com OS no historico: as OS dependem dele (FK) e o historico financeiro nao pode sumir,
 *    entao ele e so desativado (ativo=false). A placa fica livre (indice unico so entre ativos).
 * Bloqueia se ainda houver OS em andamento, para nao "esconder" um carro que esta no patio.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });

    const resultado = await transacao(async (client) => {
      // FOR UPDATE: uma OS nova para este veiculo nao entra no meio da verificacao.
      const { rows } = await client.query("SELECT foto_url FROM veiculos WHERE id = $1 AND ativo = true FOR UPDATE", [id]);
      if (!rows[0]) return null;

      const { rows: oss } = await client.query(
        "SELECT numero, status FROM ordens_servico WHERE veiculo_id = $1 ORDER BY numero",
        [id],
      );
      const abertas = oss.filter((o) => o.status !== "entregue" && o.status !== "cancelado");
      if (abertas.length > 0) {
        const lista = abertas.map((o) => `#${o.numero}`).join(", ");
        throw new ErroValidacao(`Este veículo tem OS em andamento (${lista}). Entregue ou cancele antes de apagar.`);
      }

      if (oss.length === 0) await client.query("DELETE FROM veiculos WHERE id = $1", [id]);
      else await client.query("UPDATE veiculos SET ativo = false, foto_url = NULL WHERE id = $1", [id]);
      return { foto_url: rows[0].foto_url as string | null };
    });

    if (!resultado) return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });

    // A foto so e apagada depois do banco confirmar; falha aqui nao desfaz a exclusao.
    if (resultado.foto_url) await apagarArquivo(resultado.foto_url).catch((e) => console.error("[gestao] foto nao apagada:", e));
    return new NextResponse(null, { status: 204 });
  });
}
