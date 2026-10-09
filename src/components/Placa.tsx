/**
 * Placa de veiculo no padrao Mercosul, desenhada em HTML/CSS (sem imagem): faixa azul com
 * "BRASIL" e a bandeira, QR code decorativo, "BR" no canto e o numero da placa em preto sobre
 * branco. Todo o tamanho vem do font-size (em), entao escala em qualquer lugar; o numero e
 * texto de verdade (da para copiar e o leitor de tela le "Placa ABC1D23").
 */
export type TamanhoPlaca = "sm" | "md" | "lg";

// QR decorativo 7x7 (nao codifica nada): so da o ar da placa Mercosul.
const QR = [
  "1111101",
  "1000101",
  "1011101",
  "1011100",
  "1000111",
  "1111010",
  "0010111",
];

export default function Placa({ placa, tamanho = "md" }: { placa: string; tamanho?: TamanhoPlaca }) {
  const texto = placa.toUpperCase();
  return (
    <span className={`placa placa--${tamanho}`} role="img" aria-label={`Placa ${texto}`}>
      <span className="placa-topo" aria-hidden="true">
        <span className="placa-mercosul">
          <svg viewBox="0 0 24 6" focusable="false">
            {[2, 6, 10, 14, 18, 22].map((x) => (
              <circle key={x} cx={x} cy={x % 8 === 2 || x === 22 ? 3.4 : 2.4} r="0.7" fill="#fff" />
            ))}
          </svg>
          <span>MERCOSUL</span>
        </span>
        <span className="placa-pais">BRASIL</span>
        <svg className="placa-bandeira" viewBox="0 0 20 14" focusable="false">
          <rect width="20" height="14" rx="1.2" fill="#1faa4a" />
          <path d="M10 2 18 7 10 12 2 7Z" fill="#ffd400" />
          <circle cx="10" cy="7" r="2.9" fill="#1b3f9c" />
        </svg>
      </span>
      <span className="placa-corpo" aria-hidden="true">
        <svg className="placa-qr" viewBox="0 0 7 7" shapeRendering="crispEdges" focusable="false">
          {QR.flatMap((linha, y) =>
            [...linha].map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null)),
          )}
        </svg>
        <span className="placa-texto">{texto}</span>
        <span className="placa-br">BR</span>
      </span>
    </span>
  );
}
