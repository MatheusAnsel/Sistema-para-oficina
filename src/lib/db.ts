import { Pool, type PoolClient } from "pg";

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

/**
 * Executa varias queries na mesma conexao dentro de uma transacao:
 * ou tudo e gravado, ou nada. Necessario para OS + itens (e, depois, baixa de estoque).
 * Usa cliente proprio do pool porque pool.query() pode cair em conexoes diferentes.
 */
export async function transacao<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
