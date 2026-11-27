import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { dbReal } from "@/lib/db";
import { assinarToken, GESTAO_COOKIE } from "@/lib/gestao-auth";
import { credenciaisDemo, DEMO_EMAIL, DEMO_NOME } from "@/lib/gestao-demo";
import { HASH_SEM_USUARIO, ipCliente } from "@/lib/login-limite";
import { limparFalhas, registrarFalha, segundosDeBloqueio } from "@/lib/login-limite-db";

export const dynamic = "force-dynamic";

const EMAIL_MAX = 254;
const SENHA_MAX = 200;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; senha?: unknown } | null;
  // So texto: um objeto ou numero no lugar do e-mail/senha derrubava a rota com erro 500.
  if (typeof body?.email !== "string" || typeof body?.senha !== "string") {
    return NextResponse.json({ error: "Informe email e senha" }, { status: 400 });
  }
  const email = body.email.toLowerCase().trim();
  const senha = body.senha;
  if (!email || !senha) {
    return NextResponse.json({ error: "Informe email e senha" }, { status: 400 });
  }
  // Senha gigante faria o bcrypt trabalhar a toa; e-mail gigante nao existe.
  if (email.length > EMAIL_MAX || senha.length > SENHA_MAX) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  // Login demo (recrutadores): nao consulta o banco; o token leva a marca "demo".
  if (credenciaisDemo(email, senha)) {
    const token = await assinarToken({ sub: "demo", email: DEMO_EMAIL, demo: true });
    return respostaComCookie({ id: "demo", nome: DEMO_NOME, email: DEMO_EMAIL }, token);
  }

  // Limite de tentativas (por e-mail e por IP): confere antes de gastar tempo com o bcrypt.
  const ip = ipCliente(req.headers);
  const espera = await segundosDeBloqueio(email, ip);
  if (espera > 0) {
    const minutos = Math.ceil(espera / 60);
    return NextResponse.json(
      { error: `Muitas tentativas. Tente de novo em ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.` },
      { status: 429, headers: { "Retry-After": String(espera) } },
    );
  }

  const { rows } = await dbReal().query("SELECT * FROM gestao_usuarios WHERE email=$1 AND ativo=true", [email]);
  const usuario = rows[0];

  // Resposta e tempo identicos para usuario inexistente ou senha errada: nao revela quais e-mails existem.
  const senhaOk = await bcrypt.compare(senha, usuario?.senha_hash ?? HASH_SEM_USUARIO);
  if (!usuario || !senhaOk) {
    await registrarFalha(email, ip);
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  await limparFalhas(email, ip);
  const token = await assinarToken({ sub: usuario.id, email: usuario.email });
  return respostaComCookie({ id: usuario.id, nome: usuario.nome, email: usuario.email }, token);
}

function respostaComCookie(usuario: { id: string; nome: string; email: string }, token: string) {
  const res = NextResponse.json({ usuario });
  res.cookies.set(GESTAO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
