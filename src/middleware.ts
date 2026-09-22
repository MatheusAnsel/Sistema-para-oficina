import { NextRequest, NextResponse } from "next/server";
import { GESTAO_COOKIE, verificarToken } from "@/lib/gestao-auth";

/**
 * Protege /admin e /api/admin com usuario e senha (Basic Auth), e /gestao e
 * /api/gestao com login proprio (JWT em cookie). Login e assets ficam de fora
 * do matcher para nao entrar em loop de redirecionamento.
 */
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/gestao/:path*", "/api/gestao/:path*"],
};

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkAdminBasicAuth(req: NextRequest): NextResponse | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Painel desativado: defina ADMIN_PASSWORD.", { status: 503 });
  }
  const user = process.env.ADMIN_USER || "admin";

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(":");
      if (safeEqual(u, user) && safeEqual(rest.join(":"), password)) return null;
    } catch {
      /* cai no 401 */
    }
  }
  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Painel da oficina", charset="UTF-8"' },
  });
}

async function checkGestaoAuth(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  // Login (pagina e API) e publico; o resto de /gestao exige token valido.
  if (pathname === "/gestao/login" || pathname === "/api/gestao/auth/login") return null;

  const token = req.cookies.get(GESTAO_COOKIE)?.value;
  const payload = await verificarToken(token);
  if (payload) return null;

  if (pathname.startsWith("/api/gestao")) {
    return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/gestao/login";
  url.searchParams.set("proximo", pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/gestao") || pathname.startsWith("/api/gestao")) {
    const denied = await checkGestaoAuth(req);
    return denied ?? NextResponse.next();
  }
  const denied = checkAdminBasicAuth(req);
  return denied ?? NextResponse.next();
}
