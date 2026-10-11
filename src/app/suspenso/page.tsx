import type { Metadata } from "next";
import Link from "next/link";
import Marca from "@/components/Marca";
import { business } from "@/config/business";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Acesso suspenso | ${business.name}`, robots: { index: false, follow: false } };

export default function Suspenso() {
  // Opcional: texto com o contato de quem cuida do sistema (ex.: WhatsApp), definido na Vercel.
  const contato = process.env.SUSPENSAO_CONTATO;
  return (
    <main className="wrap suspenso">
      <Marca className="wordmark--login" />
      <h1>Acesso suspenso</h1>
      <p>
        O acesso à gestão e ao painel de pedidos está temporariamente suspenso. O site continua no ar. Para regularizar,
        fale com o responsável pelo sistema.
      </p>
      {contato && <p className="suspenso-contato">{contato}</p>}
      <Link className="btn btn-ghost" href="/">
        Voltar ao site
      </Link>
    </main>
  );
}
