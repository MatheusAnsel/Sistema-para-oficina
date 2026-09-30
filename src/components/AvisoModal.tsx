"use client";

import Modal from "@/components/Modal";

/** Aviso informativo (um botao so) no padrao visual do site, no lugar do alert() do navegador. */
export default function AvisoModal({
  title,
  message,
  buttonLabel = "Entendi",
  onClose,
}: {
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-primary btn-sm" type="button" onClick={onClose} autoFocus>
          {buttonLabel}
        </button>
      </div>
    </Modal>
  );
}
