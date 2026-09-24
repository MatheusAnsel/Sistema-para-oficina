"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import GestaoNav from "@/components/GestaoNav";
import Modal from "@/components/Modal";
import type { Cliente } from "@/lib/gestao-types";

const vazio = { nome: "", telefone: "", email: "", observacoes: "" };

function ClientesConteudo() {
  const params = useSearchParams();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const qs = busca ? `?search=${encodeURIComponent(busca)}` : "";
    const res = await fetch(`/api/gestao/clientes${qs}`);
    if (res.ok) setClientes(await res.json());
    setCarregando(false);
  }

  // atalho do dashboard: /gestao/clientes?novo=1 abre o formulario direto
  useEffect(() => {
    if (params.get("novo") === "1") abrirNovo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  function abrirNovo() {
    setForm(vazio);
    setEditandoId(null);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(c: Cliente) {
    setForm({ nome: c.nome, telefone: c.telefone ?? "", email: c.email ?? "", observacoes: c.observacoes ?? "" });
    setEditandoId(c.id);
    setErro(null);
    setModalAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(editandoId ? `/api/gestao/clientes/${editandoId}` : "/api/gestao/clientes", {
        method: editandoId ? "PUT" : "POST",
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

  async function desativar(id: string) {
    if (!confirm("Desativar este cliente?")) return;
    await fetch(`/api/gestao/clientes/${id}`, { method: "DELETE" });
    await carregar();
  }

  return (
    <>
      <GestaoNav />
      <main className="wrap gestao-page">
        <div className="gestao-page-head">
          <h1>Clientes</h1>
          <button className="btn btn-primary btn-sm" onClick={abrirNovo} type="button">
            + Novo cliente
          </button>
        </div>

        <input
          className="gestao-search"
          placeholder="Buscar por nome ou telefone…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando ? (
          <p className="section-lead">Carregando…</p>
        ) : clientes.length === 0 ? (
          <p className="section-lead">Nenhum cliente cadastrado ainda.</p>
        ) : (
          <div className="gestao-table-wrap">
            <table className="gestao-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>{c.telefone || "—"}</td>
                    <td>{c.email || "—"}</td>
                    <td className="gestao-table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => abrirEdicao(c)} type="button">
                        Editar
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => desativar(c.id)} type="button">
                        Desativar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modalAberto && (
        <Modal title={editandoId ? "Editar cliente" : "Novo cliente"} onClose={() => setModalAberto(false)}>
          <form onSubmit={salvar} className="form-grid">
            <label className="form-group">
              <span>Nome *</span>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </label>
            <label className="form-group">
              <span>Telefone</span>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </label>
            <label className="form-group">
              <span>E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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

export default function ClientesPage() {
  return (
    <Suspense fallback={null}>
      <ClientesConteudo />
    </Suspense>
  );
}
