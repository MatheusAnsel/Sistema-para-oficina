import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assinarToken, GESTAO_COOKIE } from "@/lib/gestao-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: string; senha?: string } | null;
  const email = body?.email?.toLowerCase().trim();
  const senha = body?.senha;
  if (!email || !senha) {
    return NextResponse.json({ error: "Informe email e senha" }, { status: 400 });
  }

  const { rows } = await db().query("SELECT * FROM gestao_usuarios WHERE email=$1 AND ativo=true", [email]);
  const usuario = rows[0];

  // Resposta identica para usuario inexistente ou senha errada: nao revela quais emails existem.
  if (!usuario) {
    await bcrypt.compare(senha, "$2a$10$invalidinvalidinvalidinvalidinvalidinva");
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }
  const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaOk) {
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const token = await assinarToken({ sub: usuario.id, email: usuario.email });
  const res = NextResponse.json({ usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
  res.cookies.set(GESTAO_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
