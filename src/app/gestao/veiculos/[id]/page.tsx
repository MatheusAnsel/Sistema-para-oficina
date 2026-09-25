"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import GestaoNav from "@/components/GestaoNav";
import { OS_STATUS_LABEL, type OrdemServico, type Veiculo } from "@/lib/gestao-types";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dataFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

type VeiculoDetalhe = Veiculo & { cliente_telefone: string | null };

/**
 * O historico do veiculo sao as suas ordens de servico. Os registros que ja
 * existiam na tabela "servicos" foram copiados para OS pela migration 002,
 * entao nada do historico antigo some desta tela.
 */
export default function VeiculoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [veiculo, setVeiculo] = useState<VeiculoDetalhe | null>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    Promise.all([
      fetch(`/api/gestao/veiculos/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/gestao/os?veiculo_id=${id}`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([v, os]) => {
      if (!atual) return;
      setVeiculo(v);
      setOrdens(os);
      setCarregando(false);
    });
    return () => {
      atual = false;
    };
  }, [id]);

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
                  {veiculo.placa} · {veiculo.cliente_nome || "Sem cliente vinculado"}
                  {veiculo.cliente_telefone ? ` · ${veiculo.cliente_telefone}` : ""}
                  {veiculo.quilometragem != null ? ` · ${veiculo.quilometragem.toLocaleString("pt-BR")} km` : ""}
                </p>
              </div>
              <Link className="btn btn-primary btn-sm" href={`/gestao/os?novo=1&veiculo=${id}`}>
                + Nova OS
              </Link>
            </div>

            <h2 className="gestao-section-title">Histórico de ordens de serviço</h2>
            {ordens.length === 0 ? (
              <p className="section-lead">Nenhuma ordem de serviço para este veículo ainda.</p>
            ) : (
              <ul className="gestao-history">
                {ordens.map((o) => (
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
                        <div className="gestao-history-top" style={{ marginTop: "0.5rem" }}>
                          <span className="gestao-history-meta">
                            {o.quilometragem != null ? `${o.quilometragem.toLocaleString("pt-BR")} km` : "Sem quilometragem"}
                          </span>
                          <span className="gestao-history-value">{moeda.format(o.valor_total)}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </>
  );
}
