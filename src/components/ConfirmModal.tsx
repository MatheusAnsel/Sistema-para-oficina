"use client";

import Modal from "@/components/Modal";

/**
 * Confirmacao no padrao visual do site (mesmo modal dos formularios), no lugar do
 * confirm() do navegador. O foco inicial fica em "Cancelar" para uma acao destrutiva
 * nao ser confirmada sem querer com Enter.
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  ocupado = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Enquanto a acao esta em andamento os botoes ficam desabilitados. */
  ocupado?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={ocupado ? () => {} : onCancel}>
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel} disabled={ocupado} autoFocus>
          {cancelLabel}
        </button>
        <button className="btn btn-primary btn-sm" type="button" onClick={onConfirm} disabled={ocupado}>
          {ocupado ? "Aguarde…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
