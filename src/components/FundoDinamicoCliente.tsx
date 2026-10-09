"use client";

import { useEffect, useRef } from "react";

export type Camada = { id: "garagem" | "carro" | "ferramentas"; src: string };

/** Engrenagem desenhada so com stroke: o tracejado grosso do circulo forma os dentes. */
function Engrenagem({ className }: { className: string }) {
  return (
    <svg className={`fundo-engrenagem ${className}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="9" strokeDasharray="8.2 8.2" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M50 14v22M50 64v22M14 50h22M64 50h22" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/**
 * Fundo dinamico em camadas com profundidade (parallax 3D). As camadas reagem ao mouse
 * (so em telas com ponteiro preciso) e a rolagem da pagina. Tudo e feito por variaveis CSS
 * (--px, --py, --sy) atualizadas num requestAnimationFrame, animando so transform/opacity.
 * Com "reduzir movimento" ligado no aparelho nada se mexe.
 */
export default function FundoDinamicoCliente({ camadas }: { camadas: Camada[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const temMouse = window.matchMedia("(pointer: fine)").matches;
    let alvoX = 0;
    let alvoY = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    let rodando = false;
    let rolagemPendente = false;

    const passo = () => {
      x += (alvoX - x) * 0.08;
      y += (alvoY - y) * 0.08;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      if (Math.abs(alvoX - x) > 0.0005 || Math.abs(alvoY - y) > 0.0005) {
        raf = requestAnimationFrame(passo);
      } else {
        rodando = false;
      }
    };
    const iniciar = () => {
      if (rodando) return;
      rodando = true;
      raf = requestAnimationFrame(passo);
    };

    const aoMover = (e: PointerEvent) => {
      alvoX = (e.clientX / window.innerWidth) * 2 - 1;
      alvoY = (e.clientY / window.innerHeight) * 2 - 1;
      iniciar();
    };
    const aoRolar = () => {
      if (rolagemPendente) return;
      rolagemPendente = true;
      requestAnimationFrame(() => {
        rolagemPendente = false;
        el.style.setProperty("--sy", String(Math.min(window.scrollY, 1600)));
      });
    };

    if (temMouse) window.addEventListener("pointermove", aoMover, { passive: true });
    window.addEventListener("scroll", aoRolar, { passive: true });
    aoRolar();

    return () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("scroll", aoRolar);
      cancelAnimationFrame(raf);
    };
  }, []);

  const por = (id: Camada["id"]) => camadas.find((c) => c.id === id);
  const garagem = por("garagem");
  const carro = por("carro");
  const ferramentas = por("ferramentas");

  return (
    <div className="fundo-3d" ref={ref} aria-hidden="true">
      {/* Efeitos em CSS: aparecem sempre, com ou sem fotos */}
      <div className="fundo-luz" />
      <div className="fundo-piso" />
      <Engrenagem className="fundo-engrenagem--a" />
      <Engrenagem className="fundo-engrenagem--b" />

      {garagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="fundo-camada fundo-camada--garagem" src={garagem.src} alt="" decoding="async" />
      )}
      {ferramentas && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="fundo-camada fundo-camada--ferramentas" src={ferramentas.src} alt="" decoding="async" />
      )}
      {carro && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="fundo-camada fundo-camada--carro" src={carro.src} alt="" decoding="async" fetchPriority="high" />
      )}

      {/* Escurece por cima para o texto continuar legivel */}
      <div className="fundo-veu" />
    </div>
  );
}
