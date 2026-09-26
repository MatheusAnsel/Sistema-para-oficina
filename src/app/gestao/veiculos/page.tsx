"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import GestaoNav from "@/components/GestaoNav";
import Modal from "@/components/Modal";
import { apenasDigitos } from "@/lib/gestao-input";
import type { Cliente, Veiculo } from "@/lib/gestao-types";

const vazio = { cliente_id: "", placa: "", marca: "", modelo: "", ano: "", cor: "", quilometragem: "" };

function VeiculosConteudo() {
  const params = useSearchParams();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const qs = busca ? `?search=${encodeURIComponent(busca)}` : "";
    const res = await fetch(`/api/gestao/veiculos${qs}`);
    if (res.ok) setVeiculos(await res.json());
    setCarregando(false);
  }

  // atalho do dashboard: /gestao/veiculos?novo=1 abre o formulario direto
  useEffect(() => {
    if (params.get("novo") === "1") abrirNovo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  async function abrirNovo() {
    setErro(null);
    setForm(vazio);
    const res = await fetch("/api/gestao/clientes");
    if (res.ok) setClientes(await res.json());
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/gestao/veiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  return (
    <>
      <GestaoNav />
      <main className="wrap gestao-page">
        <div className="gestao-page-head">
          <h1>Veículos</h1>
          <button className="btn btn-primary btn-sm" onClick={abrirNovo} type="button">
            + Novo veículo
          </button>
        </div>

        <input
          className="gestao-search"
          placeholder="Buscar por placa, modelo ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando ? (
          <p className="section-lead">Carregando…</p>
        ) : veiculos.length === 0 ? (
          <p className="section-lead">
            Nenhum veículo cadastrado ainda. {clientes.length === 0 && "Cadastre um cliente antes de adicionar um veículo."}
          </p>
        ) : (
          <div className="gestao-table-wrap">
            <table className="gestao-table">
              <thead>
                <tr>
                  <th aria-hidden />
                  <th>Placa</th>
                  <th>Modelo</th>
                  <th>Cliente</th>
                  <th>KM</th>
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody>
                {veiculos.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {v.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.foto_url} alt="" className="gestao-thumb" />
                      ) : (
                        <span className="gestao-thumb gestao-thumb-vazia" aria-hidden />
                      )}
                    </td>
                    <td className="gestao-plate">{v.placa}</td>
                    <td>
                      {v.marca ? `${v.marca} ` : ""}
                      {v.modelo}
                      {v.ano ? ` (${v.ano})` : ""}
                    </td>
                    <td>{v.cliente_nome || "Sem cliente"}</td>
                    <td>{v.quilometragem != null ? v.quilometragem.toLocaleString("pt-BR") : "—"}</td>
                    <td className="gestao-table-actions">
                      <Link className="btn btn-ghost btn-sm" href={`/gestao/veiculos/${v.id}`}>
                        Ver histórico
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalAberto && (
        <Modal title="Novo veículo" onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar} className="form-grid">
            <label className="form-group form-group-full">
              <span>Cliente</span>
              <select value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">Sem cliente vinculado (adicionar depois)</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-group">
              <span>Placa *</span>
              <input
                value={form.placa}
                onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })}
                placeholder="ABC1D23"
                required
              />
            </label>
            <label className="form-group">
              <span>Ano</span>
              <input
                value={form.ano}
                onChange={(e) => setForm({ ...form, ano: apenasDigitos(e.target.value) })}
                inputMode="numeric"
                maxLength={4}
              />
            </label>
            <label className="form-group">
              <span>Marca</span>
              <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </label>
            <label className="form-group">
              <span>Modelo *</span>
              <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} required />
            </label>
            <label className="form-group">
              <span>Cor</span>
              <input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
            </label>
            <label className="form-group">
              <span>Quilometragem</span>
              <input
                value={form.quilometragem}
                onChange={(e) => setForm({ ...form, quilometragem: apenasDigitos(e.target.value) })}
                inputMode="numeric"
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

export default function VeiculosPage() {
  return (
    <Suspense fallback={null}>
      <VeiculosConteudo />
    </Suspense>
  );
}
