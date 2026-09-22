import { Pool } from "pg";

/**
 * Banco relacional dedicado a /gestao (clientes, veiculos, servicos).
 * Separado do Upstash usado pelo bot do WhatsApp: aqui precisamos de
 * relacionamento (1 cliente -> N veiculos -> N servicos) e busca por placa.
 * Aceita a URL padrao do Vercel Postgres ou de um projeto Supabase.
 */
let pool: Pool | undefined;

export function db(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL não configurada (veja .env.example)");
    }
    pool = new Pool({
      connectionString,
      // Supabase/Vercel Postgres exigem TLS; em dev local sem SSL isso não atrapalha.
      ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}
