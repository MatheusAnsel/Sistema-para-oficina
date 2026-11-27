/**
 * Protecao do login da gestao contra forca bruta e enumeracao de e-mails.
 *
 * So funcoes puras (sem banco e sem APIs do Node), para rodar tambem no middleware (runtime Edge)
 * e ser testadas sem Postgres. A parte que grava as falhas fica em login-limite-db.ts.
 */

/** Janela em que as falhas sao contadas. */
export const JANELA_LOGIN_MIN = 15;
/** Falhas para o mesmo e-mail dentro da janela. Vale mesmo se o atacante trocar de IP. */
export const MAX_FALHAS_EMAIL = 8;
/** Falhas vindas do mesmo IP dentro da janela (quem testa varios e-mails de um lugar so). */
export const MAX_FALHAS_IP = 10;

/**
 * Hash bcrypt valido (60 caracteres, custo 10) de um valor aleatorio descartado.
 * Usado quando o e-mail nao existe: o bcrypt.compare gasta o mesmo tempo de uma conta real.
 * Um hash de formato invalido faz o bcryptjs responder na hora, e essa diferenca de tempo
 * revelaria quais e-mails tem conta.
 */
export const HASH_SEM_USUARIO = "$2a$10$VqrFn8RcoT0uNLq9hfafgeTPnonSl/WfePqfouXzSXz9rm7kX1616";

type Cabecalhos = { get(nome: string): string | null };

/**
 * IP de quem fez a requisicao. Atras do proxy da hospedagem, o ultimo item do X-Forwarded-For e o
 * endereco que o proxy viu; os itens anteriores podem ter sido escritos pelo proprio cliente.
 */
export function ipCliente(h: Cabecalhos): string {
  const partes = (h.get("x-forwarded-for") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const ip = partes.at(-1) ?? h.get("x-real-ip")?.trim();
  return ip ? ip.slice(0, 64) : "desconhecido";
}

export function chavesDoLogin(email: string, ip: string) {
  return { email: `email:${email.slice(0, 254)}`, ip: `ip:${ip.slice(0, 64)}` };
}

export function limiteDaChave(chave: string): number {
  return chave.startsWith("email:") ? MAX_FALHAS_EMAIL : MAX_FALHAS_IP;
}

export type ResumoFalhas = { chave: string; total: number; primeiraEm: Date };

/**
 * Segundos ate o login ser liberado, a partir das falhas de cada chave dentro da janela.
 * 0 = pode tentar. O bloqueio acaba quando a falha mais antiga sai da janela.
 */
export function segundosAteLiberar(resumo: ResumoFalhas[], agora: Date = new Date()): number {
  const janelaMs = JANELA_LOGIN_MIN * 60_000;
  let espera = 0;
  for (const r of resumo) {
    if (r.total < limiteDaChave(r.chave)) continue;
    const restante = Math.ceil((r.primeiraEm.getTime() + janelaMs - agora.getTime()) / 1000);
    espera = Math.max(espera, Math.max(1, restante));
  }
  return espera;
}

/**
 * Contador em memoria para o Basic Auth do /admin. O middleware roda no Edge e nao alcanca o
 * Postgres, entao as falhas ficam no processo: zeram ao reiniciar e, com varias instancias, cada uma
 * conta as suas. Com uma instancia e senha longa, isso basta para tornar a forca bruta inviavel.
 */
export function criarLimiteEmMemoria(opcoes: { max: number; janelaMs: number; maxChaves?: number }, agora = Date.now) {
  const falhas = new Map<string, number[]>();
  const maxChaves = opcoes.maxChaves ?? 5000;

  function recentes(chave: string): number[] {
    const corte = agora() - opcoes.janelaMs;
    const lista = (falhas.get(chave) ?? []).filter((t) => t > corte);
    if (lista.length) falhas.set(chave, lista);
    else falhas.delete(chave);
    return lista;
  }

  return {
    segundosAteLiberar(chave: string): number {
      const lista = recentes(chave);
      if (lista.length < opcoes.max) return 0;
      return Math.max(1, Math.ceil((lista[0] + opcoes.janelaMs - agora()) / 1000));
    },
    registrarFalha(chave: string): void {
      const lista = recentes(chave);
      lista.push(agora());
      falhas.set(chave, lista);
      // Teto de chaves: descarta a mais antiga para o mapa nao crescer sem limite.
      if (falhas.size > maxChaves) {
        const primeira = falhas.keys().next().value;
        if (primeira !== undefined) falhas.delete(primeira);
      }
    },
    limpar(chave: string): void {
      falhas.delete(chave);
    },
  };
}
