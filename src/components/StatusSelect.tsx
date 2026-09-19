"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/types";

export default function StatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function change(next: LeadStatus) {
    const previous = value;
    setValue(next);
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setValue(previous);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="status">
      <span className="sr-only">Situação do pedido</span>
      <select value={value} disabled={busy} onChange={(e) => change(e.target.value as LeadStatus)} data-status={value}>
        {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => (
          <option key={s} value={s}>
            {LEAD_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {failed && <span className="status-error" role="alert">Não foi possível salvar</span>}
    </label>
  );
}
