import { NextRequest, NextResponse } from "next/server";
import { db, transacao } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { dataOpcional, ErroValidacao, inteiroNaoNegativoOpcional, textoOpcional } from "@/lib/gestao-validacao";
import type { OsStatus } from "@/lib/gestao-types";
import { linhaOs, paraDataISO, paraNumero, SQL_HOJE, statusValido, transicaoPermitida } from "@/lib/os";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// id invalido (nao-UUID) faria o Postgres lancar 22P02 e virar 500; responde 404 direto.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const naoEncontrada = () => NextResponse.json({ error: "Ordem de serviço não encontrada" }, { status: 404 });

export async function GET(_req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return naoEncontrada();

    const { rows } = await db().query(
      `SELECT o.*, v.placa, v.modelo, v.marca, v.cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone
       FROM ordens_servico o
       JOIN veiculos v ON v.id = o.veiculo_id
       JOIN clientes c ON c.id = v.cliente_id
       WHERE o.id = $1`,
      [id],
    );
    if (!rows[0]) return naoEncontrada();

    const { rows: itens } = await db().query("SELECT * FROM os_itens WHERE os_id = $1 ORDER BY criado_em, id", [id]);
    return NextResponse.json({
      ...linhaOs(rows[0]),
      itens: itens.map((i) => ({
        ...i,
        quantidade: paraNumero(i.quantidade),
        valor_unitario: paraNumero(i.valor_unitario),
      })),
    });
  });
}

/**
 * Atualiza dados da OS (datas, km, observacoes) e/ou o status.
 * O valor_total NUNCA vem do cliente: e recalculado a partir dos itens (rota de itens).
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return naoEncontrada();
    const body = await req.json().catch(() => ({}));

    const resultado = await transacao(async (client) => {
      // FOR UPDATE: duas trocas de status simultaneas na mesma OS nao se atropelam.
      const { rows } = await client.query("SELECT * FROM ordens_servico WHERE id = $1 FOR UPDATE", [id]);
      const atual = rows[0];
      if (!atual) return null;

      const statusAtual = atual.status as OsStatus;
      let novoStatus = statusAtual;
      if (body.status !== undefined) {
        if (!statusValido(body.status)) throw new ErroValidacao("Status inválido");
        if (!transicaoPermitida(statusAtual, body.status)) {
          throw new ErroValidacao(`Não é possível mudar de "${statusAtual}" para "${body.status}"`);
        }
        novoStatus = body.status;
      }

      // Campos de dados: so troca o que veio no corpo; o resto fica como esta.
      const data_prevista = "data_prevista" in body ? dataOpcional(body.data_prevista) : paraDataISO(atual.data_prevista);
      const quilometragem =
        "quilometragem" in body ? inteiroNaoNegativoOpcional(body.quilometragem, "a quilometragem") : atual.quilometragem;
      const observacoes = "observacoes" in body ? textoOpcional(body.observacoes, 2000) : atual.observacoes;

      // Ao finalizar/entregar, registra a data de conclusao uma unica vez.
      const concluindo = (novoStatus === "finalizado" || novoStatus === "entregue") && !atual.data_conclusao;

      const { rows: upd } = await client.query(
        `UPDATE ordens_servico
         SET status = $1, data_prevista = $2, quilometragem = $3, observacoes = $4,
             data_conclusao = CASE WHEN $5 THEN ${SQL_HOJE} ELSE data_conclusao END
         WHERE id = $6 RETURNING *`,
        [novoStatus, data_prevista, quilometragem, observacoes, concluindo, id],
      );
      return upd[0];
    });

    if (!resultado) return naoEncontrada();
    return NextResponse.json(linhaOs(resultado));
  });
}

/**
 * OS nao e apagada: com estoque e financeiro ligados, exclusao fisica quebraria a
 * contabilidade. DELETE cancela (status final), preservando o registro.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return naoEncontrada();

    const { rows } = await db().query("SELECT status FROM ordens_servico WHERE id = $1", [id]);
    if (!rows[0]) return naoEncontrada();
    if (!transicaoPermitida(rows[0].status as OsStatus, "cancelado")) {
      throw new ErroValidacao("Esta OS já foi entregue e não pode ser cancelada");
    }
    await db().query("UPDATE ordens_servico SET status = 'cancelado' WHERE id = $1", [id]);
    return new NextResponse(null, { status: 204 });
  });
}
