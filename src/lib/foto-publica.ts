import fs from "node:fs";
import path from "node:path";

const EXTENSOES = ["webp", "avif", "png", "jpg", "jpeg"];

/**
 * Procura public/<pasta>/<nome>.(webp|avif|png|jpg|jpeg) e devolve a URL publica, ou null se
 * nao existir. Roda no servidor (no build), entao a pagina nunca pede imagem inexistente (sem 404)
 * e cada foto adicionada aparece sozinha no proximo deploy, sem mexer em codigo.
 */
export function fotoPublica(pasta: string, nome: string): string | null {
  for (const ext of EXTENSOES) {
    if (fs.existsSync(path.join(process.cwd(), "public", pasta, `${nome}.${ext}`))) {
      return `/${pasta}/${nome}.${ext}`;
    }
  }
  return null;
}
