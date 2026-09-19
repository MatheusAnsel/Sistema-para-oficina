import type { Metadata } from "next";
import StatusSelect from "@/components/StatusSelect";
import { business } from "@/config/business";
import { listLeads } from "@/lib/leads";
import { formatPhone } from "@/lib/site";
import { LEAD_STATUS_LABEL, type Lead, type LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Pedidos | ${business.name}`, robots: { index: false, follow: false } };

const when = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function Media({ item }: { item: Lead["media"][number] }) {
  const src = `/api/admin/media/${item.id}`;
  if (item.kind === "image") {
    return (
      <a href={src} target="_blank" rel="noopener" className="thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={item.caption ?? "Foto enviada pelo cliente"} loading="lazy" />
      </a>
    );
  }
  if (item.kind === "audio") return <audio controls preload="none" src={src} />;
  return (
    <a href={src} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
      {item.kind === "video" ? "Abrir vídeo" : "Abrir arquivo"}
    </a>
  );
}

export default async function AdminPage() {
  const leads = await listLeads();
  const counts = leads.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {});

  return (
    <main className="wrap admin">
      <header className="admin-head">
        <h1>Pedidos de orçamento</h1>
        <p>
          {leads.length === 0
            ? "Nenhum pedido ainda."
            : (Object.keys(LEAD_STATUS_LABEL) as LeadStatus[])
                .filter((s) => counts[s])
                .map((s) => `${counts[s]} ${LEAD_STATUS_LABEL[s].toLowerCase()}`)
                .join(", ")}
        </p>
      </header>

      {leads.length === 0 && (
        <p className="section-lead">
          Quando um cliente terminar as perguntas no WhatsApp, o pedido aparece aqui. Atualize a página para ver os novos.
        </p>
      )}

      <ul className="lead-list">
        {leads.map((l) => (
          <li key={l.id} className="lead-card" data-status={l.status}>
            <div className="lead-top">
              <div>
                <h2>{l.name}</h2>
                <p className="lead-vehicle">
                  {l.vehicle} ({l.year})
                </p>
              </div>
              <StatusSelect id={l.id} status={l.status} />
            </div>

            <dl className="lead-meta">
              <div>
                <dt>Serviço</dt>
                <dd>{l.service}</dd>
              </div>
              <div>
                <dt>Recebido em</dt>
                <dd>{when.format(new Date(l.createdAt))}</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd>{formatPhone(l.phone)}</dd>
              </div>
            </dl>

            {l.notes.length > 0 && (
              <ul className="lead-notes">
                {l.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}

            {l.media.length > 0 && (
              <div className="lead-media">
                {l.media.map((m) => (
                  <Media key={m.id} item={m} />
                ))}
              </div>
            )}

            <a className="btn btn-primary btn-sm" href={`https://wa.me/${l.phone}`} target="_blank" rel="noopener">
              Chamar no WhatsApp
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
