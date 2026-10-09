/**
 * Modo demonstracao para recrutadores (login em /gestao/login).
 *
 * Como funciona:
 *  - As credenciais abaixo sao PUBLICAS de proposito (o botao da tela de login preenche o formulario).
 *    Por isso elas nao dao acesso a nada sensivel: o login demo nao consulta a tabela de usuarios
 *    e o token emitido carrega a marca "demo".
 *  - Toda consulta feita com um token demo roda no schema "demo" do Postgres (dados ficticios,
 *    migrations/006_demo.sql), nunca no schema public onde ficam os dados reais da oficina.
 *  - Todo metodo que altera dados (POST/PUT/PATCH/DELETE) e bloqueado para a sessao demo.
 */
export const DEMO_EMAIL = "recrutador@demo.oficina";
export const DEMO_SENHA = "demo-recrutador";
export const DEMO_NOME = "Recrutador (demo)";

/** Cabecalho interno, escrito so pelo middleware (qualquer valor vindo do cliente e descartado). */
export const DEMO_HEADER = "x-gestao-demo";

export const METODOS_DE_ESCRITA = ["POST", "PUT", "PATCH", "DELETE"];

export const MSG_DEMO_SOMENTE_LEITURA = "Modo demonstração: somente leitura. Nenhum dado é alterado.";

function igual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function credenciaisDemo(email: string, senha: string): boolean {
  return igual(email, DEMO_EMAIL) && igual(senha, DEMO_SENHA);
}
