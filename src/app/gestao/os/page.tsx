"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import GestaoNav from "@/components/GestaoNav";
import Modal from "@/components/Modal";
import { OS_STATUS, OS_STATUS_LABEL, type OrdemServico, type OsStatus, type Veiculo } from "@/lib/gestao-types";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// data_entrada chega como "YYYY-MM-DD"; timeZone UTC evita voltar um dia ao formatar
const dataFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

const vazio = { veiculo_id: "", data_prevista: "", observacoes: "" };

function OsListaConteudo() {
  const params = useSearchParams();
  const [lista, setLista] = useState<OrdemServico[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const statusUrl = params.get("status");
  const [status, setStatus] = useState<OsStatus | "">(
    (OS_STATUS as readonly string[]).includes(statusUrl ?? "") ? (statusUrl as OsStatus) : "",
  );
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (busca) qs.set("search", busca);
    const res = await fetch(`/api/gestao/os${qs.size ? `?${qs}` : ""}`);
    if (res.ok) setLista(await res.json());
    setCarregando(false);
  }

  // atalho do dashboard: /gestao/os?novo=1 abre o formulario direto
  useEffect(() => {
    if (params.get("novo") === "1") abrirNova();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, busca]);

  async function abrirNova() {
    setErro(null);
    setForm(vazio);
    const res = await fetch("/api/gestao/veiculos");
    const lista: Veiculo[] = res.ok ? await res.json() : [];
    setVeiculos(lista);
    // ?veiculo=<id> (vindo da tela do veiculo) pre-seleciona, mas so se o id existir de verdade:
    // com um id inexistente o <select> cairia silenciosamente no primeiro veiculo da lista.
    const pedido = params.get("veiculo");
    if (pedido && lista.some((v) => v.id === pedido)) setForm({ ...vazio, veiculo_id: pedido });
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/gestao/os", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível salvar");
      // vai direto para o detalhe: e ali que se adicionam servicos e pecas
      window.location.href = `/gestao/os/${data.id}`;
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível salvar");
      setSalvando(false);
    }
  }

  return (
    <>
      <GestaoNav />
      <main className="wrap gestao-page">
        <div className="gestao-page-head">
          <h1>Ordens de serviço</h1>
          <button className="btn btn-primary btn-sm" onClick={abrirNova} type="button">
            + Nova OS
          </button>
        </div>

        <div className="os-filtros" role="group" aria-label="Filtrar por status">
          <button type="button" className={`os-filtro ${status === "" ? "active" : ""}`} onClick={() => setStatus("")}>
            Todas
          </button>
          {OS_STATUS.map((s) => (
            <button
              key={s}
              type="button"
              className={`os-filtro ${status === s ? "active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {OS_STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <input
          className="gestao-search"
          placeholder="Buscar por nº, placa, modelo ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando ? (
          <p className="section-lead">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="section-lead">Nenhuma ordem de serviço encontrada.</p>
        ) : (
          <ul className="gestao-history">
            {lista.map((o) => (
              <li key={o.id}>
                <Link href={`/gestao/os/${o.id}`} className="os-card-link">
                  <div className="gestao-history-item">
                    <div className="gestao-history-top">
                      <span>
                        OS #{o.numero} · {dataFmt.format(new Date(o.data_entrada))}
                      </span>
                      <span className="os-badge" data-status={o.status}>
                        {OS_STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <p className="gestao-history-desc">
                      <span className="gestao-plate">{o.placa}</span> · {o.modelo}
                    </p>
                    <p className="gestao-history-meta">{o.cliente_nome || "Sem cliente vinculado"}</p>
                    <div className="gestao-history-top" style={{ marginTop: "0.5rem" }}>
                      <span>
                        {o.data_prevista ? `Previsão: ${dataFmt.format(new Date(o.data_prevista))}` : "Sem previsão"}
                      </span>
                      <span className="gestao-history-value">{moeda.format(o.valor_total)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      {modalAberto && (
        <Modal title="Nova ordem de serviço" onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar} className="form-grid">
            <label className="form-group form-group-full">
              <span>Veículo *</span>
              <select value={form.veiculo_id} onChange={(e) => setForm({ ...form, veiculo_id: e.target.value })} required>
                <option value="" disabled>
                  Selecione…
                </option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} · {v.modelo} · {v.cliente_nome || "sem cliente"}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-group form-group-full">
              <span>Previsão de entrega</span>
              <input
                type="date"
                value={form.data_prevista}
                onChange={(e) => setForm({ ...form, data_prevista: e.target.value })}
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
                {salvando ? "Salvando…" : "Abrir OS"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function OsListaPage() {
  return (
    <Suspense fallback={null}>
      <OsListaConteudo />
    </Suspense>
  );
}
