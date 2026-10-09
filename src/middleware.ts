import { NextRequest, NextResponse } from "next/server";
import { GESTAO_COOKIE, verificarToken } from "@/lib/gestao-auth";
import { DEMO_HEADER, METODOS_DE_ESCRITA, MSG_DEMO_SOMENTE_LEITURA } from "@/lib/gestao-demo";

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
  if (payload) {
    // Sessao demo e somente leitura: bloqueia qualquer metodo que altera dados, exceto o logout.
    if (payload.demo && METODOS_DE_ESCRITA.includes(req.method) && pathname !== "/api/gestao/auth/logout") {
      return NextResponse.json({ error: MSG_DEMO_SOMENTE_LEITURA }, { status: 403 });
    }
    return null;
  }

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
    if (denied) return denied;

    // Cabecalho interno: sempre descartado do cliente e reescrito aqui, so para token demo valido.
    const headers = new Headers(req.headers);
    headers.delete(DEMO_HEADER);
    const payload = await verificarToken(req.cookies.get(GESTAO_COOKIE)?.value);
    // O login nunca roda como demo: quem tem cookie demo antigo ainda precisa conseguir entrar como dono.
    if (payload?.demo && pathname !== "/api/gestao/auth/login") headers.set(DEMO_HEADER, "1");
    return NextResponse.next({ request: { headers } });
  }
  const denied = checkAdminBasicAuth(req);
  return denied ?? NextResponse.next();
}
