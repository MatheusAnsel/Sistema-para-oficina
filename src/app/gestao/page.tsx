"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GestaoNav from "@/components/GestaoNav";
import type { Periodo } from "@/lib/os";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Resumo = {
  periodo: Periodo;
  janela: { inicio: string; fim: string };
  patio: number;
  em_andamento: number;
  previstas_hoje: number;
  orcamentos: number;
  faturamento: number;
  os_concluidas: number;
};

const PERIODOS: { valor: Periodo; rotulo: string; legenda: string }[] = [
  { valor: "hoje", rotulo: "Hoje", legenda: "hoje" },
  { valor: "7dias", rotulo: "Últimos 7 dias", legenda: "nos últimos 7 dias" },
  { valor: "mes", rotulo: "Mês", legenda: "neste mês" },
];

export default function GestaoDashboardPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let atual = true; // ignora resposta antiga se o usuario trocou de filtro no meio
    setErro(false);
    fetch(`/api/gestao/dashboard?periodo=${periodo}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Resumo) => atual && setResumo(d))
      .catch(() => atual && setErro(true));
    return () => {
      atual = false;
    };
  }, [periodo]);

  const legenda = PERIODOS.find((p) => p.valor === periodo)!.legenda;

  return (
    <>
      <GestaoNav />
      <main className="wrap gestao-page">
        <div className="gestao-page-head">
          <div>
            <h1>Dashboard</h1>
            <p className="gestao-subtitle">Visão geral da sua oficina hoje</p>
          </div>
        </div>

        <section className="dash-hero" aria-label="Faturamento">
          <div className="dash-hero-label">Faturamento {legenda}</div>
          <div className="dash-hero-valor">{resumo ? moeda.format(resumo.faturamento) : "—"}</div>
          <div className="dash-hero-meta">
            {resumo
              ? `${resumo.os_concluidas} ${resumo.os_concluidas === 1 ? "OS concluída" : "OS concluídas"}`
              : erro
                ? "Não foi possível carregar"
                : "Carregando…"}
          </div>
          <div className="os-filtros" role="group" aria-label="Período do faturamento">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                type="button"
                className={`os-filtro ${periodo === p.valor ? "active" : ""}`}
                onClick={() => setPeriodo(p.valor)}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        </section>

        <div className="dash-grid">
          <Link href="/gestao/os" className="dash-card">
            <div className="dash-card-valor">{resumo ? resumo.patio : "—"}</div>
            <div className="dash-card-label">Veículos no pátio</div>
          </Link>
          <Link href="/gestao/os?status=em_execucao" className="dash-card">
            <div className="dash-card-valor">{resumo ? resumo.em_andamento : "—"}</div>
            <div className="dash-card-label">Serviços em andamento</div>
          </Link>
          <Link href="/gestao/os" className="dash-card" data-alerta={resumo ? resumo.previstas_hoje > 0 : false}>
            <div className="dash-card-valor">{resumo ? resumo.previstas_hoje : "—"}</div>
            <div className="dash-card-label">Previstas para hoje</div>
          </Link>
          <Link href="/gestao/os" className="dash-card">
            <div className="dash-card-valor">{resumo ? resumo.orcamentos : "—"}</div>
            <div className="dash-card-label">Orçamentos pendentes</div>
          </Link>
        </div>

        <div className="dash-atalhos">
          <Link className="btn btn-primary btn-sm" href="/gestao/clientes?novo=1">
            + Novo cliente
          </Link>
          <Link className="btn btn-primary btn-sm" href="/gestao/veiculos?novo=1">
            + Novo veículo
          </Link>
          <Link className="btn btn-primary btn-sm" href="/gestao/os?novo=1">
            + Nova OS
          </Link>
        </div>
      </main>
    </>
  );
}
