import { dbReal } from "./db";
import { chavesDoLogin, JANELA_LOGIN_MIN, segundosAteLiberar, type ResumoFalhas } from "./login-limite";

/**
 * Falhas de login gravadas no banco real (tabela login_falhas, migration 010). Usa sempre o schema
 * public: o login roda antes de existir sessao, entao nunca e uma consulta da sessao demo.
 */

export async function segundosDeBloqueio(email: string, ip: string): Promise<number> {
  const k = chavesDoLogin(email, ip);
  const { rows } = await dbReal().query<{ chave: string; total: number; primeira_em: Date }>(
    `SELECT chave, COUNT(*)::int AS total, MIN(criado_em) AS primeira_em
       FROM login_falhas
      WHERE chave = ANY($1::text[]) AND criado_em > NOW() - make_interval(mins => $2::int)
      GROUP BY chave`,
    [[k.email, k.ip], JANELA_LOGIN_MIN],
  );
  const resumo: ResumoFalhas[] = rows.map((r) => ({ chave: r.chave, total: r.total, primeiraEm: new Date(r.primeira_em) }));
  return segundosAteLiberar(resumo);
}

export async function registrarFalha(email: string, ip: string): Promise<void> {
  const k = chavesDoLogin(email, ip);
  await dbReal().query("INSERT INTO login_falhas (chave) SELECT unnest($1::text[])", [[k.email, k.ip]]);
  // Faxina barata: nada com mais de um dia interessa para uma janela de minutos.
  await dbReal().query("DELETE FROM login_falhas WHERE criado_em < NOW() - INTERVAL '1 day'");
}

export async function limparFalhas(email: string, ip: string): Promise<void> {
  const k = chavesDoLogin(email, ip);
  await dbReal().query("DELETE FROM login_falhas WHERE chave = ANY($1::text[])", [[k.email, k.ip]]);
}
