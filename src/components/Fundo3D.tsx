"use client";

import { useEffect, useRef } from "react";

/**
 * Camada WebGL do fundo (pecas de mecanica em 3D que reagem ao mouse e a rolagem).
 * A cena (Three.js, ~150 KB) so e baixada depois que a pagina ficou ociosa, para nao competir
 * com o carregamento do conteudo. Sem WebGL (ou erro), nada acontece e fica so o fundo em CSS.
 * Anima sempre, inclusive com "reduzir movimento" ligado no aparelho (decisao do dono do site).
 */
export default function Fundo3D() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelado = false;
    let destruir: (() => void) | undefined;

    const iniciar = async () => {
      try {
        const { montarCena } = await import("@/lib/fundo3d-cena");
        if (cancelado) return;
        destruir = montarCena(canvas, {
          temMouse: window.matchMedia("(pointer: fine)").matches,
        });
        canvas.classList.add("fundo-3d-canvas--pronto");
      } catch {
        // sem WebGL: o fundo em CSS continua sozinho
      }
    };

    const agendar = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback : null;
    const id = agendar ? agendar(() => void iniciar(), { timeout: 1500 }) : window.setTimeout(() => void iniciar(), 400);

    return () => {
      cancelado = true;
      if (agendar) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
      destruir?.();
    };
  }, []);

  return <canvas ref={ref} className="fundo-3d-canvas" aria-hidden="true" />;
}
