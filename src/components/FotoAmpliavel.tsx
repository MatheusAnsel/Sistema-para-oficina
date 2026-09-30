"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  src: string;
  alt: string;
  /** Classes da imagem exibida na pagina (o tamanho/enquadramento continua sendo do chamador). */
  className?: string;
  /** Mostra o botao de ampliar sobre a imagem. Desligue nas miniaturas pequenas. */
  icone?: boolean;
};

/**
 * Imagem que abre em tela cheia ao tocar/clicar. Fecha com o botao "Fechar", tocando fora da
 * imagem ou com Esc. Usa uma camada propria (nao a Fullscreen API) porque ela funciona em todos
 * os navegadores de celular, inclusive no iPhone.
 */
export default function FotoAmpliavel({ src, alt, className, icone = true }: Props) {
  const [aberta, setAberta] = useState(false);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberta) return;
    const overflowAnterior = document.body.style.overflow;
    const gatilho = gatilhoRef.current;
    document.body.style.overflow = "hidden"; // a pagina atras nao rola enquanto a foto esta aberta
    fecharRef.current?.focus();

    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      gatilho?.focus();
    };
  }, [aberta]);

  return (
    <>
      <button
        ref={gatilhoRef}
        className="foto-ampliavel"
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Abrir foto em tela cheia"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
        {icone && (
          <span className="foto-ampliavel-icone" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </span>
        )}
      </button>

      {aberta &&
        createPortal(
          <div
            className="foto-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Foto em tela cheia"
            onClick={(e) => e.target === e.currentTarget && setAberta(false)}
          >
            <button ref={fecharRef} className="foto-lightbox-fechar" type="button" onClick={() => setAberta(false)} aria-label="Fechar">
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="foto-lightbox-img" />
          </div>,
          document.body,
        )}
    </>
  );
}
