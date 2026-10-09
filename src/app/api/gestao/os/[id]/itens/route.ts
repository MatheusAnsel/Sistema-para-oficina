import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { transacao } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import type { OsStatus } from "@/lib/gestao-types";
import { ErroValidacao, quantidadePositiva, textoObrigatorio, valorNaoNegativo } from "@/lib/gestao-validacao";
import { calcularTotal, itensEditaveis, paraNumero, tipoItemValido } from "@/lib/os";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const naoEncontrada = () => NextResponse.json({ error: "Ordem de serviço não encontrada" }, { status: 404 });

/** Trava a OS, confere que ainda aceita alteracao e devolve o status; null se nao existe. */
async function travarOsEditavel(client: PoolClient, id: string): Promise<OsStatus | null> {
  const { rows } = await client.query("SELECT status FROM ordens_servico WHERE id = $1 FOR UPDATE", [id]);
  if (!rows[0]) return null;
  const status = rows[0].status as OsStatus;
  if (!itensEditaveis(status)) {
    throw new ErroValidacao("Esta OS está finalizada e não aceita mais alteração nos itens");
  }
  return status;
}

/** Recalcula valor_total a partir dos itens gravados. Fonte unica da verdade do total. */
async function recalcularTotal(client: PoolClient, osId: string): Promise<number> {
  const { rows } = await client.query("SELECT quantidade, valor_unitario FROM os_itens WHERE os_id = $1", [osId]);
  const total = calcularTotal(
    rows.map((r) => ({ quantidade: paraNumero(r.quantidade), valor_unitario: paraNumero(r.valor_unitario) })),
  );
  await client.query("UPDATE ordens_servico SET valor_total = $1 WHERE id = $2", [total, osId]);
  return total;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return naoEncontrada();
    const body = await req.json().catch(() => ({}));

    if (!tipoItemValido(body.tipo)) throw new ErroValidacao("Tipo do item inválido");
    const tipo = body.tipo;
    const descricao = textoObrigatorio(body.descricao, "a descrição do item", 300);
    const quantidade = quantidadePositiva(body.quantidade);
    const valor_unitario = valorNaoNegativo(body.valor_unitario);

    const out = await transacao(async (client) => {
      if ((await travarOsEditavel(client, id)) === null) return null;
      const { rows } = await client.query(
        `INSERT INTO os_itens (os_id, tipo, descricao, quantidade, valor_unitario)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id, tipo, descricao, quantidade, valor_unitario],
      );
      const valor_total = await recalcularTotal(client, id);
      return { item: rows[0], valor_total };
    });

    if (!out) return naoEncontrada();
    return NextResponse.json(
      {
        item: { ...out.item, quantidade: paraNumero(out.item.quantidade), valor_unitario: paraNumero(out.item.valor_unitario) },
        valor_total: out.valor_total,
      },
      { status: 201 },
    );
  });
}

/** Remove um item: DELETE /api/gestao/os/:id/itens?item=<uuid> */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const itemId = req.nextUrl.searchParams.get("item") ?? "";
    if (!UUID.test(id)) return naoEncontrada();
    if (!UUID.test(itemId)) throw new ErroValidacao("Item inválido");

    const out = await transacao(async (client) => {
      if ((await travarOsEditavel(client, id)) === null) return null;
      await client.query("DELETE FROM os_itens WHERE id = $1 AND os_id = $2", [itemId, id]);
      return { valor_total: await recalcularTotal(client, id) };
    });

    if (!out) return naoEncontrada();
    return NextResponse.json(out);
  });
}
