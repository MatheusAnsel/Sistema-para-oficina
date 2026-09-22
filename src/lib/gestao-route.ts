import { NextResponse } from "next/server";
import { ErroValidacao } from "./gestao-validacao";

/** Envolve um handler de rota: erro de validação vira 400, resto vira 500 (logado). */
export function comTratamentoDeErro<T>(fn: () => Promise<T>) {
  return fn().catch((err) => {
    if (err instanceof ErroValidacao) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Placa duplicada (UNIQUE) -> mensagem amigavel em vez do erro cru do Postgres.
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Já existe um veículo com essa placa" }, { status: 409 });
    }
    console.error("[gestao] erro na rota", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  });
}
