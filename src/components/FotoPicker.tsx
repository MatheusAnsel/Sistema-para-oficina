"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTravaRolagem } from "@/lib/trava-rolagem";

type Lado = "environment" | "user";

type Props = {
  /** Recebe a foto tirada na camera ou escolhida na galeria (sempre um File de imagem). */
  onEscolher: (arquivo: File) => void;
  /** Desabilita os botoes (ex.: enquanto a foto anterior esta sendo enviada). */
  disabled?: boolean;
  /** Mostra "Enviando…" no botao da camera. */
  ocupado?: boolean;
};

function mensagemDeErro(err: unknown) {
  const nome = err instanceof DOMException ? err.name : "";
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "O acesso à câmera foi negado. Libere a câmera para este site nas configurações do navegador ou use a câmera do aparelho.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Nenhuma câmera foi encontrada neste aparelho.";
  }
  if (nome === "NotReadableError") {
    return "A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo.";
  }
  return "Não foi possível abrir a câmera.";
}

/**
 * Botoes "Tirar foto" e "Galeria".
 *
 * "Tirar foto" pede permissao de camera ao navegador (getUserMedia), mostra a imagem ao vivo
 * e tira a foto ao tocar no obturador. Se o navegador nao permitir (sem HTTPS, sem suporte
 * ou permissao negada), oferece a camera do proprio aparelho via <input capture>.
 */
export default function FotoPicker({ onEscolher, disabled, ocupado }: Props) {
  const [aberta, setAberta] = useState(false);
  const [pronta, setPronta] = useState(false);
  const [lado, setLado] = useState<Lado>("environment");
  const [variasCameras, setVariasCameras] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  useTravaRolagem(aberta); // a pagina atras nao rola enquanto o visor da camera esta aberto

  // Liga a camera enquanto o visor esta aberto e sempre a desliga ao fechar/trocar de lado.
  useEffect(() => {
    if (!aberta) return;
    let cancelado = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: lado }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setPronta(true);
        navigator.mediaDevices
          .enumerateDevices()
          .then((d) => !cancelado && setVariasCameras(d.filter((x) => x.kind === "videoinput").length > 1))
          .catch(() => {});
      } catch (err) {
        if (cancelado) return;
        setAberta(false);
        setErro(mensagemDeErro(err));
      }
    })();

    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [aberta, lado]);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberta]);

  function tirarFoto() {
    setErro(null);
    // Sem getUserMedia (pagina sem HTTPS, navegador antigo): usa direto a camera do aparelho.
    if (!navigator.mediaDevices?.getUserMedia) {
      inputCameraRef.current?.click();
      return;
    }
    setPronta(false);
    setAberta(true);
  }

  function virarCamera() {
    setPronta(false);
    setLado((l) => (l === "environment" ? "user" : "environment"));
  }

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        setAberta(false);
        if (!blob) {
          setErro("Não foi possível capturar a foto.");
          return;
        }
        onEscolher(new File([blob], "foto.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    setErro(null);
    if (arquivo) onEscolher(arquivo);
  }

  return (
    <>
      <div className="foto-picker">
        <button className="btn btn-ghost btn-sm" type="button" disabled={disabled} onClick={tirarFoto}>
          {ocupado ? "Enviando…" : "Tirar foto"}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          disabled={disabled}
          onClick={() => inputGaleriaRef.current?.click()}
        >
          Galeria
        </button>
        <input ref={inputCameraRef} type="file" accept="image/*" capture="environment" hidden onChange={aoEscolherArquivo} />
        <input ref={inputGaleriaRef} type="file" accept="image/*" hidden onChange={aoEscolherArquivo} />
      </div>

      {erro && (
        <div className="foto-picker-erro status-error" role="alert">
          <p>{erro}</p>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => inputCameraRef.current?.click()}>
            Usar câmera do aparelho
          </button>
        </div>
      )}

      {aberta &&
        createPortal(
          <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="Câmera">
            <video
              ref={videoRef}
              className={lado === "user" ? "camera-video camera-video--espelhada" : "camera-video"}
              autoPlay
              playsInline
              muted
            />
            {!pronta && <p className="camera-aguarde">Abrindo a câmera…</p>}
            <div className="camera-acoes">
              <div>
                <button className="btn btn-ghost" type="button" onClick={() => setAberta(false)}>
                  Cancelar
                </button>
              </div>
              <button className="camera-obturador" type="button" onClick={capturar} disabled={!pronta} aria-label="Tirar foto" />
              <div>
                {variasCameras && (
                  <button className="btn btn-ghost" type="button" onClick={virarCamera}>
                    Virar
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
