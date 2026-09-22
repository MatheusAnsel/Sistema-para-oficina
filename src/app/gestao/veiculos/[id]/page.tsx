"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GestaoNav from "@/components/GestaoNav";
import Modal from "@/components/Modal";
import type { Servico, Veiculo } from "@/lib/gestao-types";

const vazio = { data: "", quilometragem: "", descricao: "", valor: "", observacoes: "" };

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

type VeiculoDetalhe = Veiculo & { cliente_telefone: string | null; servicos: Servico[] };

export default function VeiculoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [veiculo, setVeiculo] = useState<VeiculoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const res = await fetch(`/api/gestao/veiculos/${id}`);
    if (res.ok) setVeiculo(await res.json());
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function abrirNovo() {
    setForm({ ...vazio, quilometragem: veiculo?.quilometragem ? String(veiculo.quilometragem) : "" });
    setErro(null);
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/gestao/servicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, veiculo_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível salvar");
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirServico(servicoId: string) {
    if (!confirm("Excluir este registro do histórico?")) return;
    await fetch(`/api/gestao/servicos/${servicoId}`, { method: "DELETE" });
    await carregar();
  }

  return (
    <>
      <GestaoNav />
      <main className="wrap gestao-page">
        {carregando ? (
          <p className="section-lead">Carregando…</p>
        ) : !veiculo ? (
          <p className="section-lead">Veículo não encontrado.</p>
        ) : (
          <>
            <div className="gestao-page-head">
              <div>
                <h1>
                  {veiculo.marca ? `${veiculo.marca} ` : ""}
                  {veiculo.modelo}
                  {veiculo.ano ? ` (${veiculo.ano})` : ""}
                </h1>
                <p className="gestao-subtitle">
                  {veiculo.placa} · {veiculo.cliente_nome}
                  {veiculo.cliente_telefone ? ` · ${veiculo.cliente_telefone}` : ""}
                  {veiculo.quilometragem != null ? ` · ${veiculo.quilometragem.toLocaleString("pt-BR")} km` : ""}
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={abrirNovo} type="button">
                + Adicionar serviço
              </button>
            </div>

            <h2 className="gestao-section-title">Histórico de serviços</h2>
            {veiculo.servicos.length === 0 ? (
              <p className="section-lead">Nenhum serviço registrado ainda.</p>
            ) : (
              <ul className="gestao-history">
                {veiculo.servicos.map((s) => (
                  <li key={s.id} className="gestao-history-item">
                    <div className="gestao-history-top">
                      <span className="gestao-history-date">{dataFmt.format(new Date(s.data))}</span>
                      <span className="gestao-history-value">{moeda.format(s.valor)}</span>
                    </div>
                    <p className="gestao-history-desc">{s.descricao}</p>
                    {(s.quilometragem != null || s.observacoes) && (
                      <p className="gestao-history-meta">
                        {s.quilometragem != null ? `${s.quilometragem.toLocaleString("pt-BR")} km` : ""}
                        {s.quilometragem != null && s.observacoes ? " · " : ""}
                        {s.observacoes}
                      </p>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => excluirServico(s.id)} type="button">
                      Excluir
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {modalAberto && (
        <Modal title="Adicionar serviço" onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar} className="form-grid">
            <label className="form-group form-group-full">
              <span>Serviço realizado *</span>
              <input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: Troca de óleo e filtro"
                required
              />
            </label>
            <label className="form-group">
              <span>Data</span>
              <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </label>
            <label className="form-group">
              <span>Valor (R$)</span>
              <input
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                inputMode="decimal"
                placeholder="0,00"
              />
            </label>
            <label className="form-group">
              <span>Quilometragem</span>
              <input
                value={form.quilometragem}
                onChange={(e) => setForm({ ...form, quilometragem: e.target.value })}
                inputMode="numeric"
              />
            </label>
            <label className="form-group form-group-full">
              <span>Observações</span>
              <textarea
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={3}
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
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
