import { NextRequest, NextResponse } from "next/server";

/** Protege /admin e /api/admin com usuario e senha (Basic Auth). */
export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("Painel desativado: defina ADMIN_PASSWORD.", { status: 503 });
  }
  const user = process.env.ADMIN_USER || "admin";

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(":");
      if (safeEqual(u, user) && safeEqual(rest.join(":"), password)) return NextResponse.next();
    } catch {
      /* cai no 401 */
    }
  }
  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Painel da oficina", charset="UTF-8"' },
  });
}
