export class ErroValidacao extends Error {
  status = 400;
}

export function textoObrigatorio(v: unknown, campo: string, max = 200): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new ErroValidacao(`Informe ${campo}`);
  if (s.length > max) throw new ErroValidacao(`${campo} é muito longo (máx. ${max} caracteres)`);
  return s;
}

export function textoOpcional(v: unknown, max = 500): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  if (s.length > max) throw new ErroValidacao(`Texto muito longo (máx. ${max} caracteres)`);
  return s;
}

/** Placa Mercosul (ABC1D23) ou antiga (ABC1234), sem hífen. */
export function placaObrigatoria(v: unknown): string {
  const s = (typeof v === "string" ? v : "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(s)) {
    throw new ErroValidacao("Placa inválida. Use o formato ABC1234 ou ABC1D23");
  }
  return s;
}

export function anoOpcional(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  const atual = new Date().getFullYear();
  if (!Number.isInteger(n) || n < 1950 || n > atual + 1) {
    throw new ErroValidacao("Ano do veículo inválido");
  }
  return n;
}

export function inteiroNaoNegativoOpcional(v: unknown, campo: string): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ErroValidacao(`${campo} inválido`);
  return Math.round(n);
}

export function valorNaoNegativo(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ErroValidacao("Valor inválido");
  return Math.round(n * 100) / 100;
}

export function dataOpcional(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ErroValidacao("Data inválida");
  return s;
}
