"use client";

type Props = {
  pagina: number;
  porPagina: number;
  total: number;
  onMudar: (pagina: number) => void;
  /** Desabilita os botoes enquanto a lista carrega. */
  ocupado?: boolean;
};

/** "1–25 de 137" com Anterior/Proxima. Com uma pagina so, mostra apenas a contagem. */
export default function Paginacao({ pagina, porPagina, total, onMudar, ocupado = false }: Props) {
  if (total <= 0) return null;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const de = (pagina - 1) * porPagina + 1;
  const ate = Math.min(total, pagina * porPagina);
  const resumo =
    totalPaginas === 1 ? (total === 1 ? "1 resultado" : `${total} resultados`) : `${de}–${ate} de ${total}`;

  return (
    <nav className="gestao-paginacao" aria-label="Paginação">
      <span aria-live="polite">{resumo}</span>
      {totalPaginas > 1 && (
        <div className="gestao-paginacao-botoes">
          <button className="btn btn-ghost btn-sm" type="button" disabled={ocupado || pagina <= 1} onClick={() => onMudar(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            disabled={ocupado || pagina >= totalPaginas}
            onClick={() => onMudar(pagina + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </nav>
  );
}
