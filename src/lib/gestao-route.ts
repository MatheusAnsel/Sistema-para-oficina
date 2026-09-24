import { NextResponse } from "next/server";
import { ErroValidacao } from "./gestao-validacao";

/** Envolve um handler de rota: erro de validação vira 400, resto vira 500 (logado). */
export function comTratamentoDeErro<T>(fn: () => Promise<T>) {
  return fn().catch((err) => {
    if (err instanceof ErroValidacao) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Violacao de UNIQUE -> mensagem amigavel em vez do erro cru do Postgres.
    // A mensagem depende da constraint: placa e a unica antiga, mas pecas etc. terao as suas.
    if (err?.code === "23505") {
      const constraint = String(err?.constraint ?? "");
      const msg = constraint.includes("placa")
        ? "Já existe um veículo com essa placa"
        : constraint.includes("codigo")
          ? "Já existe uma peça com esse código"
          : "Já existe um registro com esses dados";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    // Cliente/veiculo referenciado nao existe (FK) -> idem.
    if (err?.code === "23503") {
      return NextResponse.json({ error: "Referência inválida (cliente ou veículo não encontrado)" }, { status: 400 });
    }
    console.error("[gestao] erro na rota", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  });
}
