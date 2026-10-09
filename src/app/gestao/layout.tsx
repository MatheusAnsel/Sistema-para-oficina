import type { Metadata } from "next";
import { cookies } from "next/headers";
import { business } from "@/config/business";
import { GESTAO_COOKIE, verificarToken } from "@/lib/gestao-auth";

export const metadata: Metadata = {
  title: `Gestão | ${business.name}`,
  robots: { index: false, follow: false },
};

export default async function GestaoLayout({ children }: { children: React.ReactNode }) {
  const payload = await verificarToken((await cookies()).get(GESTAO_COOKIE)?.value);
  return (
    <div className="gestao-shell">
      {payload?.demo && (
        <div className="gestao-demo-banner" role="status">
          Modo demonstração: dados fictícios e somente leitura.
        </div>
      )}
      {children}
    </div>
  );
}
