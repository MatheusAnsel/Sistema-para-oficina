// Roda migrations/*.sql (em ordem) contra o Postgres em DATABASE_URL.
// Uso: node --env-file=.env.local scripts/migrate-gestao.mjs

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL (no .env.local ou na variável de ambiente) antes de migrar.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  const dir = path.join(process.cwd(), "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    console.log(`Aplicando ${file}...`);
    const sql = await readFile(path.join(dir, file), "utf8");
    await pool.query(sql);
  }

  console.log(`Pronto: ${files.length} migração(ões) aplicada(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
