"use client";

type Props = {
  /** Qual data o filtro usa, ex.: "Entrada" ou "Cadastro" (vira o rotulo dos campos). */
  rotulo: string;
  de: string;
  ate: string;
  onChange: (de: string, ate: string) => void;
};

/** Filtro por periodo (data inicial e final, as duas opcionais). O navegador ja impede inicio depois do fim. */
export default function FiltroPeriodo({ rotulo, de, ate, onChange }: Props) {
  return (
    <div className="gestao-periodo" role="group" aria-label={`Filtrar por data de ${rotulo.toLowerCase()}`}>
      <label>
        <span>{rotulo} de</span>
        <input type="date" value={de} max={ate || undefined} onChange={(e) => onChange(e.target.value, ate)} />
      </label>
      <label>
        <span>{rotulo} até</span>
        <input type="date" value={ate} min={de || undefined} onChange={(e) => onChange(de, e.target.value)} />
      </label>
      {(de || ate) && (
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => onChange("", "")}>
          Limpar datas
        </button>
      )}
    </div>
  );
}
