"use client";

import { useEffect } from "react";

/**
 * Trava a rolagem da pagina enquanto houver algum modal aberto. Usa contador porque
 * modais podem empilhar (ex.: aviso por cima do formulario). A tecnica de
 * position:fixed e a que funciona de verdade no iOS/Safari, onde overflow:hidden
 * no body nao impede a pagina de tras de rolar.
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
    window.scrollTo(0, scrollSalvo);
  }
}

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    travarPagina();
    return destravarPagina;
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose} type="button" aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
