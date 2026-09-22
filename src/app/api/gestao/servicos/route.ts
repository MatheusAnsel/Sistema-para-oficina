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

export async function POST(req: NextRequest) {
  return comTratamentoDeErro(async () => {
    const body = await req.json().catch(() => ({}));
    const veiculo_id = textoObrigatorio(body.veiculo_id, "o veículo");
    const descricao = textoObrigatorio(body.descricao, "a descrição do serviço", 300);
    const data = dataOpcional(body.data);
    const quilometragem = inteiroNaoNegativoOpcional(body.quilometragem, "a quilometragem");
    const valor = valorNaoNegativo(body.valor);
    const observacoes = textoOpcional(body.observacoes, 2000);

    const { rows } = await db().query(
      `INSERT INTO servicos (veiculo_id, data, quilometragem, descricao, valor, observacoes)
       VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6) RETURNING *`,
      [veiculo_id, data, quilometragem, descricao, valor, observacoes],
    );

    // Se a quilometragem informada for maior que a atual do veiculo, atualiza (registro mais recente).
    if (quilometragem !== null) {
      await db().query(
        "UPDATE veiculos SET quilometragem = $1 WHERE id = $2 AND (quilometragem IS NULL OR quilometragem < $1)",
        [quilometragem, veiculo_id],
      );
    }

    return NextResponse.json(rows[0], { status: 201 });
  });
}
