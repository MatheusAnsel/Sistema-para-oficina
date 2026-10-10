/**
 * Icones de linha dos servicos (desenhados em SVG, sem imagem). A chave e o `id` do servico em
 * src/config/business.ts; id desconhecido cai no icone de "outro".
 */
const tracos = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Freios() {
  return (
    <>
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="7" />
      {[
        [46.5, 32],
        [36.5, 45.8],
        [20.3, 40.5],
        [20.3, 23.5],
        [36.5, 18.2],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />
      ))}
      <path d="M50 18h8v28h-8" />
    </>
  );
}

function Direcao() {
  return (
    <>
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="6" />
      <path d="M10 32h16M38 32h16M32 38v16" />
    </>
  );
}

/** Amplia um desenho em torno do centro do icone (os de motor e oleo eram pequenos perto dos demais). */
function Ampliado({ escala, children }: { escala: number; children: React.ReactNode }) {
  return <g transform={`translate(32 32) scale(${escala}) translate(-32 -32)`}>{children}</g>;
}

function Motor() {
  return (
    <Ampliado escala={1.3}>
      <rect x="18" y="28" width="30" height="18" rx="2" />
      <rect x="24" y="21" width="14" height="7" rx="1" />
      <circle cx="54" cy="37" r="5" />
      <path d="M10 32h8M10 42h8M22 46v6h22v-6" />
    </Ampliado>
  );
}

function LuzPainel() {
  return (
    <>
      <path d="M32 10 58 54H6Z" />
      <path d="M32 26v14" />
      <circle cx="32" cy="47" r="1.3" fill="currentColor" />
    </>
  );
}

function Revisao() {
  return (
    <Ampliado escala={1.3}>
      <rect x="14" y="28" width="26" height="18" rx="3" />
      <path d="M20 28v-5h14v5M40 33l14-12h4M14 34H8v8h6" />
      <path d="M51 38q4 6 0 9q-4-3 0-9Z" />
    </Ampliado>
  );
}

function Outro() {
  return (
    <>
      <circle cx="32" cy="32" r="22" />
      <path d="M25 26a7 7 0 1 1 11 5.5c-3 2.2-4 3.5-4 7" />
      <circle cx="32" cy="46" r="1.4" fill="currentColor" />
    </>
  );
}

const ICONES: Record<string, () => React.JSX.Element> = {
  freios: Freios,
  suspensao: Direcao,
  motor: Motor,
  injecao: LuzPainel,
  revisao: Revisao,
  outro: Outro,
};

export default function IconeServico({ id, className }: { id: string; className?: string }) {
  const Desenho = ICONES[id] ?? Outro;
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...tracos}>
      <Desenho />
    </svg>
  );
}
