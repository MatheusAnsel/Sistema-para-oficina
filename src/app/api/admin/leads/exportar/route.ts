import { respostaCsv } from "@/lib/gestao-csv";
import { listLeads } from "@/lib/leads";
import { leadsParaCsv } from "@/lib/leads-csv";

export const dynamic = "force-dynamic";

/** Todos os pedidos do WhatsApp em CSV (protegido pela mesma senha do painel, via middleware). */
export async function GET() {
  const leads = await listLeads(5000);
  return respostaCsv("pedidos-whatsapp", leadsParaCsv(leads));
}
