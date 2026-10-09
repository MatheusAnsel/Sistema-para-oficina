import { headers } from "next/headers";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { DEMO_HEADER } from "./gestao-demo";

/**
 * Banco relacional dedicado a /gestao (clientes, veiculos, ordens de servico).
 * Separado do Upstash usado pelo bot do WhatsApp: aqui precisamos de
 * relacionamento (1 cliente -> N veiculos -> N ordens de servico) e busca por placa.
 * Aceita a URL padrao do Vercel Postgres ou de um projeto Supabase.
 */
let pool: Pool | undefined;

/**
 * Sessao demo (recrutadores)? O middleware escreve o cabecalho interno so depois de validar o
 * token assinado; fora de uma requisicao (scripts, testes) headers() lanca e o resultado e false.
 */
async function sessaoDemo(): Promise<boolean> {
  try {
    return (await headers()).get(DEMO_HEADER) === "1";
  } catch {
    return false;
  }
}

/**
 * Aponta a transacao atual para o schema "demo" (dados ficticios). Sem "public" no caminho:
 * se faltar alguma tabela la, a consulta falha em vez de cair nos dados reais.
 * SET LOCAL vale so ate o fim da transacao, entao funciona tambem atras de pgbouncer.
 */
async function usarSchemaDemo(client: PoolClient) {
  await client.query("SET LOCAL search_path TO demo, pg_catalog");
}

type Banco = {
  query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
  connect(): Promise<PoolClient>;
};

export function db(): Banco {
  return {
    async query<R extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
      if (!(await sessaoDemo())) return realPool().query<R>(text, params);
      const client = await realPool().connect();
      try {
        await client.query("BEGIN");
        await usarSchemaDemo(client);
        const out = await client.query<R>(text, params);
        await client.query("COMMIT");
        return out;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    },
    connect: () => realPool().connect(),
  };
}

/**
 * Banco real (schema public), ignorando qualquer sessao demo. Use so onde a consulta nunca pode ir
 * para o schema demo: hoje, o login (tabela gestao_usuarios), que roda antes de existir sessao valida
 * e precisa funcionar mesmo que o navegador ainda tenha um cookie demo antigo.
 */
export function dbReal(): Pool {
  return realPool();
}

function realPool(): Pool {
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
    if (await sessaoDemo()) await usarSchemaDemo(client);
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
