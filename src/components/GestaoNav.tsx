"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function GestaoNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/gestao/auth/logout", { method: "POST" });
    router.push("/gestao/login");
    router.refresh();
  }

  return (
    <header className="gestao-nav">
      <div className="wrap gestao-nav-row">
        <span className="gestao-nav-title">Gestão</span>
        <nav className="gestao-nav-links" aria-label="Seções da gestão">
          <Link href="/gestao" className={pathname === "/gestao" ? "active" : ""}>
            Dashboard
          </Link>
          <Link href="/gestao/os" className={pathname.startsWith("/gestao/os") ? "active" : ""}>
            Ordens de serviço
          </Link>
          <Link href="/gestao/veiculos" className={pathname.startsWith("/gestao/veiculos") ? "active" : ""}>
            Veículos
          </Link>
          <Link href="/gestao/clientes" className={pathname.startsWith("/gestao/clientes") ? "active" : ""}>
            Clientes
          </Link>
        </nav>
        <button className="btn btn-ghost btn-sm" onClick={sair} type="button">
          Sair
        </button>
      </div>
    </header>
  );
}
