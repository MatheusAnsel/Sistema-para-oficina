import fs from "node:fs";
import path from "node:path";
import FundoDinamicoCliente, { type Camada } from "@/components/FundoDinamicoCliente";

/**
 * Fundo 3D da pagina inicial. As imagens ficam em public/fundo/ (veja docs/fundo-3d.md):
 *   garagem.*      cenario da oficina (opcional)
 *   carro.*        Golf / Jetta
 *   ferramentas.*  chaves, macaco, engrenagens...
 * Este componente roda no servidor (no build) so para descobrir quais arquivos existem e
 * assim nao pedir imagem inexistente (sem 404). Sem nenhuma imagem, o fundo mostra so os
 * efeitos em CSS (engrenagens e luz), entao o site continua bonito antes das fotos chegarem.
 */
const EXTENSOES = ["webp", "avif", "png", "jpg", "jpeg"];

function acharImagem(nome: string): string | null {
  for (const ext of EXTENSOES) {
    if (fs.existsSync(path.join(process.cwd(), "public", "fundo", `${nome}.${ext}`))) {
      return `/fundo/${nome}.${ext}`;
    }
  }
  return null;
}

export default function FundoDinamico() {
  const camadas: Camada[] = [];
  for (const id of ["garagem", "carro", "ferramentas"] as const) {
    const src = acharImagem(id);
    if (src) camadas.push({ id, src });
  }
  return <FundoDinamicoCliente camadas={camadas} />;
}
