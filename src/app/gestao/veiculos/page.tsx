"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AvisoModal from "@/components/AvisoModal";
import FotoAmpliavel from "@/components/FotoAmpliavel";
import FiltroPeriodo from "@/components/FiltroPeriodo";
import FotoPicker from "@/components/FotoPicker";
import GestaoNav from "@/components/GestaoNav";
import Modal from "@/components/Modal";
import Paginacao from "@/components/Paginacao";
import { apenasDigitos } from "@/lib/gestao-input";
import { redimensionarFoto } from "@/lib/gestao-image";
import { filtrosParaQuery, lerTotal, POR_PAGINA } from "@/lib/gestao-lista-cliente";
import type { Cliente, Veiculo } from "@/lib/gestao-types";

const vazio = { cliente_id: "", placa: "", marca: "", modelo: "", ano: "", cor: "", quilometragem: "" };

function VeiculosConteudo() {
  const params = useSearchParams();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const filtros = () => filtrosParaQuery({ search: busca, de, ate });

  async function carregar() {
    setCarregando(true);
    const qs = filtros();
    qs.set("pagina", String(pagina));
    qs.set("por_pagina", String(POR_PAGINA));
    const res = await fetch(`/api/gestao/veiculos?${qs}`);
    if (res.ok) {
      const dados: Veiculo[] = await res.json();
      if (dados.length === 0 && pagina > 1) {
        setPagina(pagina - 1);
        return;
      }
      setVeiculos(dados);
      setTotal(lerTotal(res, dados));
    }
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
  }, [busca, de, ate, pagina]);

  async function abrirNovo() {
    setErro(null);
    setForm(vazio);
    escolherFoto(null);
    const res = await fetch("/api/gestao/clientes");
    if (res.ok) setClientes(await res.json());
    setModalAberto(true);
  }

  function escolherFoto(arquivo: File | null) {
    setFotoPreview((atual) => {
      if (atual) URL.revokeObjectURL(atual);
      return arquivo ? URL.createObjectURL(arquivo) : null;
    });
    setFotoArquivo(arquivo);
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
      const veiculo = await res.json();

      if (fotoArquivo) {
        try {
          const redimensionada = await redimensionarFoto(fotoArquivo);
          const fd = new FormData();
          fd.set("foto", redimensionada, "foto.jpg");
          const resFoto = await fetch(`/api/gestao/veiculos/${veiculo.id}/foto`, { method: "POST", body: fd });
          if (!resFoto.ok) throw new Error();
        } catch {
          // veiculo ja foi salvo; so avisa que a foto especificamente nao subiu
          setAviso("Veículo salvo, mas não foi possível enviar a foto. Adicione depois na tela do veículo.");
        }
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

        <div className="gestao-filtros-linha">
          <input
            className="gestao-search"
            placeholder="Buscar por placa, modelo ou cliente…"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1);
            }}
          />
          <FiltroPeriodo
            rotulo="Cadastro"
            de={de}
            ate={ate}
            onChange={(d, a) => {
              setDe(d);
              setAte(a);
              setPagina(1);
            }}
          />
          <a className="btn btn-ghost btn-sm" href={`/api/gestao/veiculos/exportar?${filtros()}`} download>
            Exportar CSV
          </a>
        </div>

        {carregando ? (
          <p className="section-lead">Carregando…</p>
        ) : veiculos.length === 0 ? (
          <p className="section-lead">
            {busca || de || ate
              ? "Nenhum veículo encontrado com esses filtros."
              : `Nenhum veículo cadastrado ainda. ${clientes.length === 0 ? "Cadastre um cliente antes de adicionar um veículo." : ""}`}
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
                    <td className="gestao-cell-thumb">
                      {v.foto_url ? (
                        <FotoAmpliavel src={v.foto_url} alt={`Foto de ${v.modelo}`} className="gestao-thumb" icone={false} />
                      ) : (
                        <span className="gestao-thumb gestao-thumb-vazia" aria-hidden />
                      )}
                    </td>
                    <td className="gestao-plate gestao-cell-titulo">{v.placa}</td>
                    <td data-label="Veículo">
                      {v.marca ? `${v.marca} ` : ""}
                      {v.modelo}
                      {v.ano ? ` (${v.ano})` : ""}
                    </td>
                    <td data-label="Cliente">{v.cliente_nome || "Sem cliente"}</td>
                    <td data-label="KM">{v.quilometragem != null ? v.quilometragem.toLocaleString("pt-BR") : "—"}</td>
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

        <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={total} onMudar={setPagina} ocupado={carregando} />
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

            <div className="form-group form-group-full">
              <span>Foto</span>
              {fotoPreview ? (
                <div className="gestao-foto-escolha">
                  <FotoAmpliavel src={fotoPreview} alt="Prévia da foto" className="gestao-thumb gestao-thumb-grande" icone={false} />
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => escolherFoto(null)}>
                    Remover
                  </button>
                </div>
              ) : (
                <FotoPicker onEscolher={escolherFoto} />
              )}
            </div>

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

      {aviso && <AvisoModal title="Foto não enviada" message={aviso} onClose={() => setAviso(null)} />}
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
