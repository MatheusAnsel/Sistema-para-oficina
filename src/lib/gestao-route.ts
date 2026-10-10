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
    // Coluna NOT NULL no banco nao bate com a validacao da API (ex.: migracao pendente).
    // 42703 = coluna nao existe e 42P01 = tabela nao existe (mesma causa raiz: alguma migração ainda não rodou nesse banco).
    if (err?.code === "23502" || err?.code === "42703" || err?.code === "42P01") {
      console.error("[gestao] esquema do banco desatualizado — confira se as migrações mais recentes já rodaram:", err);
      return NextResponse.json(
        { error: "Erro ao salvar: o banco de dados está com uma migração pendente. Rode scripts/migrate-gestao.mjs." },
        { status: 500 },
      );
    }
    // Variavel de ambiente de configuracao ausente (S3, banco, JWT etc.) -> mensagem
    // já é descritiva por si (dizemos exatamente qual variável falta em cada helper).
    if (err instanceof Error && / não configurad[ao]/.test(err.message)) {
      console.error("[gestao] configuração ausente:", err.message);
      return NextResponse.json({ error: `Erro de configuração: ${err.message}` }, { status: 500 });
    }
    // Erro do SDK da AWS (S3-compatível): credencial errada, bucket inexistente, endpoint
    // inalcançável etc. Toda exceção de serviço do SDK v3 tem $metadata; é o jeito
    // confiável de reconhecer "isso veio do S3", sem depender de string de mensagem.
    if (err && typeof err === "object" && "$metadata" in err) {
      const nome = "name" in err ? String(err.name) : "erro";
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[gestao] erro do storage (S3):", nome, msg);
      return NextResponse.json({ error: `Erro no armazenamento de arquivos (${nome}: ${msg})` }, { status: 500 });
    }
    console.error("[gestao] ERRO DETALHADO:", err instanceof Error ? err.message : String(err), err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  });
}

