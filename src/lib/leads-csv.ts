import { dataBr, paraCsv } from "./gestao-csv";
import { LEAD_STATUS_LABEL, type Lead } from "./types";

/** Planilha dos pedidos do WhatsApp (mesmo padrao dos CSV da gestao: separador ";", UTF-8 com BOM). */
export function leadsParaCsv(leads: Lead[]): string {
  const colunas = [
    "Data do pedido",
    "Última atualização",
    "Status",
    "Nome",
    "Telefone",
    "Veículo",
    "Ano",
    "Serviço",
    "Observações",
    "Fotos e vídeos",
  ];
  const linhas = leads.map((l) => [
    dataBr(new Date(l.createdAt)),
    dataBr(new Date(l.updatedAt)),
    LEAD_STATUS_LABEL[l.status],
    l.name,
    l.phone,
    l.vehicle,
    l.year,
    l.service,
    l.notes.join(" | "),
    l.media.length,
  ]);
  return paraCsv(colunas, linhas);
}
