/** Mantém só dígitos (telefone, quilometragem, ano, quantidade inteira). */
export function apenasDigitos(v: string): string {
  return v.replace(/[^0-9]/g, "");
}

/** Dígitos com no máximo uma vírgula/ponto decimal (valor em R$, quantidade fracionária). */
export function apenasNumeroDecimal(v: string): string {
  const limpo = v.replace(/[^0-9.,]/g, "");
  const primeiroSeparador = limpo.search(/[.,]/);
  if (primeiroSeparador === -1) return limpo;
  return limpo.slice(0, primeiroSeparador + 1) + limpo.slice(primeiroSeparador + 1).replace(/[.,]/g, "");
}
