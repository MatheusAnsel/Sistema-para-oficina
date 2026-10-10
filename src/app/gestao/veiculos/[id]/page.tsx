"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import FotoAmpliavel from "@/components/FotoAmpliavel";
import FotoPicker from "@/components/FotoPicker";
import GestaoNav from "@/components/GestaoNav";
import Placa from "@/components/Placa";
import { redimensionarFoto } from "@/lib/gestao-image";
import { OS_STATUS_LABEL, type OrdemServico, type Veiculo, type VeiculoFoto } from "@/lib/gestao-types";

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
  const router = useRouter();
  const [veiculo, setVeiculo] = useState<VeiculoDetalhe | null>(null);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [fotos, setFotos] = useState<VeiculoFoto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [enviandoFotos, setEnviandoFotos] = useState<string | null>(null); // "Enviando 2 de 5…"
  const [erroFotos, setErroFotos] = useState<string | null>(null);
  const [removendoFoto, setRemovendoFoto] = useState<string | null>(null); // id da foto a confirmar
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erroApagar, setErroApagar] = useState<string | null>(null);

  useEffect(() => {
    let atual = true;
    setCarregando(true);
    Promise.all([
      fetch(`/api/gestao/veiculos/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/gestao/os?veiculo_id=${id}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/gestao/veiculos/${id}/fotos`).then((r) => (r.ok ? r.json() : [])),
    ]).then(([v, os, fs]) => {
      if (!atual) return;
      setVeiculo(v);
      setOrdens(os);
      setFotos(fs);
      setCarregando(false);
    });
    return () => {
      atual = false;
    };
  }, [id]);

  async function enviarFoto(arquivo: File) {
    setEnviandoFoto(true);
    setErroFoto(null);
    try {
      const redimensionada = await redimensionarFoto(arquivo);
      const form = new FormData();
      form.set("foto", redimensionada, "foto.jpg");
      const res = await fetch(`/api/gestao/veiculos/${id}/foto`, { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível enviar a foto");
      }
      const { foto_url } = await res.json();
      setVeiculo((v) => (v ? { ...v, foto_url } : v));
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : "Não foi possível enviar a foto");
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFoto() {
    setEnviandoFoto(true);
    setErroFoto(null);
    try {
      const res = await fetch(`/api/gestao/veiculos/${id}/foto`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível remover a foto");
      }
      setVeiculo((v) => (v ? { ...v, foto_url: null } : v));
    } catch (err) {
      setErroFoto(err instanceof Error ? err.message : "Não foi possível remover a foto");
    } finally {
      setEnviandoFoto(false);
      setConfirmandoRemocao(false);
    }
  }

  async function recarregarFotos() {
    const res = await fetch(`/api/gestao/veiculos/${id}/fotos`);
    if (res.ok) setFotos(await res.json());
  }

  async function enviarFotos(arquivos: File[]) {
    setErroFotos(null);
    let falhas = 0;
    let ultimoErro = "";
    for (let i = 0; i < arquivos.length; i++) {
      setEnviandoFotos(arquivos.length > 1 ? `Enviando ${i + 1} de ${arquivos.length}…` : "Enviando…");
      try {
        const redimensionada = await redimensionarFoto(arquivos[i]);
        const form = new FormData();
        form.set("foto", redimensionada, "foto.jpg");
        const res = await fetch(`/api/gestao/veiculos/${id}/fotos`, { method: "POST", body: form });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Não foi possível enviar a foto");
        }
      } catch (err) {
        falhas++;
        ultimoErro = err instanceof Error ? err.message : "Não foi possível enviar a foto";
        if (ultimoErro.startsWith("Limite")) break; // as proximas tambem seriam recusadas
      }
    }
    await recarregarFotos();
    setEnviandoFotos(null);
    if (falhas > 0) {
      setErroFotos(
        arquivos.length === 1 ? ultimoErro : `${falhas} de ${arquivos.length} fotos não foram enviadas. ${ultimoErro}`,
      );
    }
  }

  async function tornarPrincipal(fotoId: string) {
    setErroFotos(null);
    setEnviandoFotos("Atualizando…");
    try {
      const res = await fetch(`/api/gestao/veiculos/${id}/fotos?foto=${fotoId}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível trocar a foto principal");
      setVeiculo((v) => (v ? { ...v, foto_url: data.foto_url } : v));
      setFotos(data.fotos);
    } catch (err) {
      setErroFotos(err instanceof Error ? err.message : "Não foi possível trocar a foto principal");
    } finally {
      setEnviandoFotos(null);
    }
  }

  async function removerFotoExtra() {
    const fotoId = removendoFoto;
    if (!fotoId) return;
    setEnviandoFotos("Removendo…");
    setErroFotos(null);
    try {
      const res = await fetch(`/api/gestao/veiculos/${id}/fotos?foto=${fotoId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível remover a foto");
      }
      setFotos((fs) => fs.filter((f) => f.id !== fotoId));
    } catch (err) {
      setErroFotos(err instanceof Error ? err.message : "Não foi possível remover a foto");
    } finally {
      setEnviandoFotos(null);
      setRemovendoFoto(null);
    }
  }

  async function apagarVeiculo() {
    setApagando(true);
    setErroApagar(null);
    try {
      const res = await fetch(`/api/gestao/veiculos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErroApagar(data.error || "Não foi possível apagar o veículo");
        setConfirmandoApagar(false);
        return;
      }
      router.push("/gestao/veiculos");
    } finally {
      setApagando(false);
    }
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
                  <Placa placa={veiculo.placa} tamanho="lg" />
                  <br />
                  {veiculo.cliente_nome || "Sem cliente vinculado"}
                  {veiculo.cliente_telefone ? ` · ${veiculo.cliente_telefone}` : ""}
                  {veiculo.quilometragem != null ? ` · ${veiculo.quilometragem.toLocaleString("pt-BR")} km` : ""}
                </p>
              </div>
              <div className="gestao-table-actions">
                <Link className="btn btn-primary btn-sm" href={`/gestao/os?novo=1&veiculo=${id}`}>
                  + Nova OS
                </Link>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirmandoApagar(true)}>
                  Apagar veículo
                </button>
              </div>
            </div>
            {erroApagar && (
              <p className="status-error" role="alert">
                {erroApagar}
              </p>
            )}

            <section className="gestao-foto">
              {veiculo.foto_url ? (
                <FotoAmpliavel src={veiculo.foto_url} alt={`Foto de ${veiculo.modelo}`} className="gestao-foto-img" />
              ) : (
                <div className="gestao-foto-vazia">Sem foto</div>
              )}
              <div className="gestao-foto-acoes">
                <FotoPicker onEscolher={enviarFoto} disabled={enviandoFoto} ocupado={enviandoFoto} />
                {veiculo.foto_url && (
                  <button className="btn btn-ghost btn-sm" type="button" disabled={enviandoFoto} onClick={() => setConfirmandoRemocao(true)}>
                    Remover
                  </button>
                )}
              </div>
              {erroFoto && (
                <p className="status-error" role="alert">
                  {erroFoto}
                </p>
              )}
            </section>

            <section className="gestao-fotos">
              <h2 className="gestao-section-title">Mais fotos</h2>
              {fotos.length === 0 ? (
                <p className="section-lead">Nenhuma foto adicional ainda. A foto acima é a principal.</p>
              ) : (
                <ul className="gestao-fotos-grid">
                  {fotos.map((f, i) => (
                    <li key={f.id} className="gestao-fotos-item">
                      <FotoAmpliavel src={f.url} alt={`Foto ${i + 1} de ${veiculo.modelo}`} className="gestao-fotos-img" icone={false} />
                      <div className="gestao-fotos-acoes">
                        <button className="btn btn-ghost btn-sm" type="button" disabled={!!enviandoFotos} onClick={() => tornarPrincipal(f.id)}>
                          Tornar principal
                        </button>
                        <button className="btn btn-ghost btn-sm" type="button" disabled={!!enviandoFotos} onClick={() => setRemovendoFoto(f.id)}>
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="gestao-foto-acoes">
                <FotoPicker
                  onEscolher={(a) => enviarFotos([a])}
                  onEscolherVarias={enviarFotos}
                  disabled={!!enviandoFotos}
                  ocupado={!!enviandoFotos}
                />
              </div>
              {enviandoFotos && <p className="section-lead">{enviandoFotos}</p>}
              {erroFotos && (
                <p className="status-error" role="alert">
                  {erroFotos}
                </p>
              )}
            </section>

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

      {removendoFoto && (
        <ConfirmModal
          title="Remover foto"
          message="Remover esta foto do veículo? Essa ação não pode ser desfeita."
          confirmLabel="Remover"
          ocupado={!!enviandoFotos}
          onConfirm={removerFotoExtra}
          onCancel={() => setRemovendoFoto(null)}
        />
      )}

      {confirmandoApagar && (
        <ConfirmModal
          title="Apagar veículo"
          message="Apagar este veículo? Essa ação não pode ser desfeita. Se ele tiver ordens de serviço antigas, elas continuam no histórico."
          confirmLabel="Apagar"
          ocupado={apagando}
          onConfirm={apagarVeiculo}
          onCancel={() => setConfirmandoApagar(false)}
        />
      )}

      {confirmandoRemocao && (
        <ConfirmModal
          title="Remover foto"
          message="Remover a foto deste veículo? Essa ação não pode ser desfeita."
          confirmLabel="Remover"
          ocupado={enviandoFoto}
          onConfirm={removerFoto}
          onCancel={() => setConfirmandoRemocao(false)}
        />
      )}
    </>
  );
}
