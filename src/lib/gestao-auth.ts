import { jwtVerify, SignJWT } from "jose";

/**
 * Auth da area /gestao: JWT em cookie httpOnly (padrao parecido com o do Syre,
 * mas com "jose" em vez de "jsonwebtoken" porque o middleware roda no runtime
 * Edge, que nao tem o modulo "crypto" do Node que o jsonwebtoken exige.
 */
export const GESTAO_COOKIE = "gestao_token";

type GestaoTokenPayload = { sub: string; email: string };

function secret(): Uint8Array {
  const s = process.env.GESTAO_JWT_SECRET;
  if (!s) throw new Error("GESTAO_JWT_SECRET não configurado (veja .env.example)");
  return new TextEncoder().encode(s);
}

export async function assinarToken(payload: GestaoTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

/** Retorna o payload se o token for valido, ou null (nunca lanca). */
export async function verificarToken(token: string | undefined): Promise<GestaoTokenPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
