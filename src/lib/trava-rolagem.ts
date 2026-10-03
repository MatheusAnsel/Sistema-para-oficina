"use client";

import { useEffect } from "react";

/**
 * Trava a rolagem da pagina enquanto houver alguma camada aberta (modal, foto em tela
 * cheia, visor da camera). Usa contador porque camadas podem empilhar. A tecnica de
 * position:fixed e a que funciona de verdade no iOS/Safari, onde overflow:hidden no body
 * nao impede a pagina de tras de rolar.
 */
let travas = 0;
let scrollSalvo = 0;

function travarPagina() {
  if (travas === 0) {
    scrollSalvo = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollSalvo}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflowY = "scroll"; // evita o "pulo" por sumir a barra de rolagem
  }
  travas++;
}

function destravarPagina() {
  travas = Math.max(0, travas - 1);
  if (travas === 0) {
    const body = document.body;
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.overflowY = "";
    // O site usa scroll-behavior: smooth; sem "instant" a pagina rolaria animada de volta.
    window.scrollTo({ top: scrollSalvo, left: 0, behavior: "instant" as ScrollBehavior });
  }
}

/** Mantem a pagina de tras parada enquanto `ativo` for verdadeiro. */
export function useTravaRolagem(ativo: boolean = true) {
  useEffect(() => {
    if (!ativo) return;
    travarPagina();
    return destravarPagina;
  }, [ativo]);
}
