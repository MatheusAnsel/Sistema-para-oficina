"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import GestaoNav from "@/components/GestaoNav";
import Modal from "@/components/Modal";
import { apenasNumeroDecimal } from "@/lib/gestao-input";
import { OS_STATUS_LABEL, type OrdemServicoDetalhe, type OsItemTipo, type OsStatus } from "@/lib/gestao-types";
import { itensEditaveis, proximosStatus } from "@/lib/os";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

const vazio = { tipo: "servico" as OsItemTipo, descricao: "", quantidade: "1", valor_unitario: "" };

/** Rotulo do botao que leva a OS para o proximo status. */
const ACAO: Partial<Record<OsStatus, string>> = {
  orcamento_enviado: "Enviar orçamento",
  aprovado: "Marcar como aprovado",
  em_execucao: "Iniciar execução",
  finalizado: "Finalizar",
  entregue: "Registrar entrega",
  aguardando_avaliacao: "Voltar para avaliação",
};

export default function OsDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [os, setOs] = useState<OrdemServicoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const res = await fetch(`/api/gestao/os/${id}`);
    if (res.ok) setOs(await res.json());
    else setOs(null);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function mudarStatus(status: OsStatus) {
    setErroAcao(null);
    const res = await fetch(`/api/gestao/os/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroAcao(data.error || "Não foi possível mudar o status");
      return;
    }
    await carregar();
  }

  async function cancelar() {
    if (!confirm("Cancelar esta ordem de serviço? O registro é mantido, mas ela sai do fluxo.")) return;
    setErroAcao(null);
    const res = await fetch(`/api/gestao/os/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroAcao(data.error || "Não foi possível cancelar");
      return;
    }
    await carregar();
  }

  async function adicionarItem(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/gestao/os/${id}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // aceita virgula decimal ("289,90") como o brasileiro digita
        body: JSON.stringify({
          ...form,
          quantidade: form.quantidade.replace(",", "."),
          valor_unitario: form.valor_unitario.replace(",", "."),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar");
      setModalAberto(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function removerItem(itemId: string) {
    if (!confirm("Remover este item?")) return;
    setErroAcao(null);
    const res = await fetch(`/api/gestao/os/${id}/itens?item=${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErroAcao(data.error || "Não foi possível remover");
      return;
    }
    await carregar();
  }

  const podeEditar = os ? itensEditaveis(os.status) : false;
  const acoes = os ? proximosStatus(os.status).filter((s) => s !== "cancelado") : [];
  const podeCancelar = os ? proximosStatus(os.status).includes("cancelado") : false;

  return (
    <>
      <GestaoNav />
      <main className="wrap gestao-page">
        {carregando ? (
          <p className="section-lead">Carregando…</p>
        ) : !os ? (
          <p className="section-lead">Ordem de serviço não encontrada.</p>
        ) : (
          <>
            <div className="gestao-page-head">
              <div>
                <h1>OS #{os.numero}</h1>
                <p className="gestao-subtitle">
                  <Link href={`/gestao/veiculos/${os.veiculo_id}`}>
                    <span className="gestao-plate">{os.placa}</span>
                  </Link>{" "}
                  · {os.marca ? `${os.marca} ` : ""}
                  {os.modelo} · {os.cliente_nome || "sem cliente vinculado"}
                  {os.cliente_telefone ? ` · ${os.cliente_telefone}` : ""}
                </p>
                <p className="gestao-subtitle">
                  Entrada {dataFmt.format(new Date(os.data_entrada))}
                  {os.data_prevista ? ` · Previsão ${dataFmt.format(new Date(os.data_prevista))}` : ""}
                  {os.data_conclusao ? ` · Concluída ${dataFmt.format(new Date(os.data_conclusao))}` : ""}
                </p>
              </div>
              <span className="os-badge" data-status={os.status}>
                {OS_STATUS_LABEL[os.status]}
              </span>
            </div>

            {os.observacoes && <p className="gestao-history-meta">{os.observacoes}</p>}

            <div className="os-acoes">
              {acoes.map((s) => (
                <button key={s} type="button" className="btn btn-primary btn-sm" onClick={() => mudarStatus(s)}>
                  {ACAO[s] ?? OS_STATUS_LABEL[s]}
                </button>
              ))}
              {podeCancelar && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={cancelar}>
                  Cancelar OS
                </button>
              )}
            </div>
            {erroAcao && (
              <p className="status-error" role="alert">
                {erroAcao}
              </p>
            )}

            <div className="gestao-page-head" style={{ marginTop: "2rem" }}>
              <h2 className="gestao-section-title" style={{ margin: 0 }}>
                Serviços e peças
              </h2>
              {podeEditar && (
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={() => {
                    setForm(vazio);
                    setErro(null);
                    setModalAberto(true);
                  }}
                >
                  + Adicionar item
                </button>
              )}
            </div>

            {os.itens.length === 0 ? (
              <p className="section-lead">Nenhum item ainda. Adicione os serviços e as peças desta OS.</p>
            ) : (
              <ul className="gestao-history">
                {os.itens.map((i) => (
                  <li key={i.id} className="gestao-history-item">
                    <div className="gestao-history-top">
                      <span>{i.tipo === "peca" ? "Peça" : "Serviço"}</span>
                      <span className="gestao-history-value">{moeda.format(i.quantidade * i.valor_unitario)}</span>
                    </div>
                    <p className="gestao-history-desc">{i.descricao}</p>
                    <p className="gestao-history-meta">
                      {i.quantidade.toLocaleString("pt-BR")} × {moeda.format(i.valor_unitario)}
                    </p>
                    {podeEditar && (
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => removerItem(i.id)}>
                        Remover
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="os-itens-totais">
              <span>Total</span>
              <span>{moeda.format(os.valor_total)}</span>
            </div>
          </>
        )}
      </main>

      {modalAberto && (
        <Modal title="Adicionar item" onClose={() => setModalAberto(false)}>
          <form onSubmit={adicionarItem} className="form-grid">
            <label className="form-group form-group-full">
              <span>Tipo *</span>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as OsItemTipo })}>
                <option value="servico">Serviço</option>
                <option value="peca">Peça</option>
              </select>
            </label>
            <label className="form-group form-group-full">
              <span>Descrição *</span>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder={form.tipo === "peca" ? "Ex.: Pastilha de freio dianteira" : "Ex.: Troca de correia dentada"}
                required
              />
            </label>
            <label className="form-group">
              <span>Quantidade</span>
              <input
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: apenasNumeroDecimal(e.target.value) })}
                inputMode="decimal"
              />
            </label>
            <label className="form-group">
              <span>Valor unitário (R$)</span>
              <input
                value={form.valor_unitario}
                onChange={(e) => setForm({ ...form, valor_unitario: apenasNumeroDecimal(e.target.value) })}
                inputMode="decimal"
                placeholder="0,00"
              />
            </label>

            {erro && (
              <p className="status-error" role="alert">
                {erro}
              </p>
            )}

            <div className="modal-actions">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "Adicionar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
