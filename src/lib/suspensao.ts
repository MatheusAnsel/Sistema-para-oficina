/**
 * Suspensao do sistema (por exemplo, por falta de pagamento da mensalidade): com SISTEMA_SUSPENSO=1
 * a gestao (/gestao), o painel de pedidos (/admin) e o atendimento por WhatsApp (webhook) param de
 * funcionar, mas o site publico continua no ar. Para suspender ou reativar, mude a variavel na Vercel
 * e faca um novo deploy. Sem dependencias de Node: roda tambem no middleware (edge).
 */
export function sistemaSuspenso(env: Record<string, string | undefined> = process.env): boolean {
  return ["1", "true", "sim", "yes"].includes((env.SISTEMA_SUSPENSO ?? "").trim().toLowerCase());
}

export const MSG_SUSPENSO = "Acesso suspenso. Fale com o responsável pelo sistema para regularizar.";
