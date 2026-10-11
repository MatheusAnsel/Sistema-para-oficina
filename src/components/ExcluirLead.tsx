"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";

export default function ExcluirLead({ id, nome }: { id: string; nome: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(false);

  async function excluir() {
    setOcupado(true);
    setErro(false);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(String(res.status));
      setAberto(false);
      router.refresh();
    } catch {
      setAberto(false);
      setErro(true);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(true)}>
        Excluir
      </button>
      {erro && (
        <span className="status-error" role="alert">
          Não foi possível excluir. Tente de novo.
        </span>
      )}
      {aberto && (
        <ConfirmModal
          title="Excluir pedido"
          message={`Excluir o pedido de ${nome}? Os dados do cliente são apagados e não dá para desfazer.`}
          confirmLabel="Excluir"
          ocupado={ocupado}
          onConfirm={excluir}
          onCancel={() => setAberto(false)}
        />
      )}
    </>
  );
}
