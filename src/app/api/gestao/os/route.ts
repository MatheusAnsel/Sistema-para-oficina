import { NextRequest, NextResponse } from "next/server";
import { transacao } from "@/lib/db";
import { FROM_OS, filtroOs, lerPaginacao, ORDEM_OS } from "@/lib/gestao-lista";
import { consultarLista, jsonLista } from "@/lib/gestao-lista-db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import {
  dataOpcional,
  ErroValidacao,
  inteiroNaoNegativoOpcional,
  quantidadePositiva,
  textoObrigatorio,
  textoOpcional,
  valorNaoNegativo,
} from "@/lib/gestao-validacao";
import type { OsItemTipo } from "@/lib/gestao-types";
import { calcularTotal, linhaOs, SQL_HOJE, tipoItemValido } from "@/lib/os";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const p = req.nextUrl.searchParams;
    const { rows, total } = await consultarLista({
      select: "o.*, v.placa, v.modelo, c.nome AS cliente_nome",
      from: FROM_OS,
      filtro: filtroOs(p),
      ordem: ORDEM_OS,
      paginacao: lerPaginacao(p),
      limite: 200, // sem paginacao (ex.: historico de um veiculo) o teto continua sendo 200
    });
    return jsonLista(rows.map(linhaOs), total);
  });
}

type ItemEntrada = { tipo: OsItemTipo; descricao: string; quantidade: number; valor_unitario: number };

function validarItens(bruto: unknown): ItemEntrada[] {
  if (bruto === undefined || bruto === null) return [];
  if (!Array.isArray(bruto)) throw new ErroValidacao("Itens inválidos");
  if (bruto.length > 100) throw new ErroValidacao("Itens demais em uma única OS (máx. 100)");
  return bruto.map((i, idx) => {
    if (!tipoItemValido(i?.tipo)) throw new ErroValidacao(`Item ${idx + 1}: tipo inválido`);
    return {
      tipo: i.tipo,
      descricao: textoObrigatorio(i.descricao, `a descrição do item ${idx + 1}`, 300),
      quantidade: quantidadePositiva(i.quantidade),
      valor_unitario: valorNaoNegativo(i.valor_unitario),
    };
  });
}

export async function POST(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const body = await req.json().catch(() => ({}));
    const veiculo_id = textoObrigatorio(body.veiculo_id, "o veículo");
    const data_entrada = dataOpcional(body.data_entrada);
    const data_prevista = dataOpcional(body.data_prevista);
    const quilometragem = inteiroNaoNegativoOpcional(body.quilometragem, "a quilometragem");
    const observacoes = textoOpcional(body.observacoes, 2000);
    const itens = validarItens(body.itens);
    const valor_total = calcularTotal(itens);

    if (data_entrada && data_prevista && data_prevista < data_entrada) {
      throw new ErroValidacao("A data prevista não pode ser anterior à data de entrada");
    }

    // OS + itens + atualizacao de KM do veiculo: tudo ou nada.
    const os = await transacao(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO ordens_servico (veiculo_id, data_entrada, data_prevista, quilometragem, observacoes, valor_total)
         VALUES ($1, COALESCE($2, ${SQL_HOJE}), $3, $4, $5, $6) RETURNING *`,
        [veiculo_id, data_entrada, data_prevista, quilometragem, observacoes, valor_total],
      );
      for (const i of itens) {
        await client.query(
          `INSERT INTO os_itens (os_id, tipo, descricao, quantidade, valor_unitario) VALUES ($1,$2,$3,$4,$5)`,
          [rows[0].id, i.tipo, i.descricao, i.quantidade, i.valor_unitario],
        );
      }
      if (quilometragem !== null) {
        await client.query(
          "UPDATE veiculos SET quilometragem = $1 WHERE id = $2 AND (quilometragem IS NULL OR quilometragem < $1)",
          [quilometragem, veiculo_id],
        );
      }
      return rows[0];
    });

    return NextResponse.json(linhaOs(os), { status: 201 });
  });
}
