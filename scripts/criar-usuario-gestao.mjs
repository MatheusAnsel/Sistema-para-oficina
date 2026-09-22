// Cria (ou atualiza a senha de) um usuário de login para a área /gestao.
// Uso: node --env-file=.env.local scripts/criar-usuario-gestao.mjs "Seu Nome" email@exemplo.com "senha-forte"

import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const [, , nome, email, senha] = process.argv;
  if (!nome || !email || !senha) {
    console.error('Uso: node --env-file=.env.local scripts/criar-usuario-gestao.mjs "Nome" email@exemplo.com "senha"');
    process.exit(1);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL antes de rodar este script.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  const senhaHash = await bcrypt.hash(senha, 10);
  await pool.query(
    `INSERT INTO gestao_usuarios (nome, email, senha_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET nome = $1, senha_hash = $3, ativo = true`,
    [nome, email.toLowerCase().trim(), senhaHash],
  );

  console.log(`Usuário "${email}" pronto para logar em /gestao/login.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
