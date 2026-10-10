import Link from "next/link";
import { business } from "@/config/business";

/** Logo "Parada 799" (a mesma do site) como link para a pagina inicial. Usada no login e na barra da gestao. */
export default function Marca({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`wordmark ${className}`.trim()} aria-label={`${business.name}: voltar para a página inicial`}>
      <span className="blinker" aria-hidden="true" />
      <span>
        Parada <b>799</b>
      </span>
    </Link>
  );
}
