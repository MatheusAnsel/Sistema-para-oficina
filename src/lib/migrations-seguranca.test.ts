import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Guarda de regressao: o Supabase expoe o schema public pela API publica, entao toda tabela
// criada em migrations precisa ter RLS ligado e toda funcao precisa ter search_path fixo.
const dir = path.join(process.cwd(), "migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(dir, f), "utf8"))
  .join("\n")
  .replace(/--.*$/gm, ""); // ignora comentarios

const tabelas = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?(\w+)"?/gi)].map((m) => m[1]);
const funcoes = [...sql.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?(\w+)"?\s*\(/gi)].map((m) => m[1]);

test("as migrations criam as tabelas esperadas (o teste abaixo nao pode passar vazio)", () => {
  for (const esperada of ["gestao_usuarios", "clientes", "veiculos", "servicos", "ordens_servico", "os_itens"]) {
    assert.ok(tabelas.includes(esperada), `tabela ${esperada} nao encontrada nas migrations`);
  }
});

test("toda tabela criada nas migrations liga Row Level Security", () => {
  for (const t of tabelas) {
    const re = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?"?${t}"?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
    assert.match(sql, re, `a tabela ${t} nao tem ENABLE ROW LEVEL SECURITY em nenhuma migration`);
  }
});

test("toda funcao criada nas migrations fixa o search_path", () => {
  assert.ok(funcoes.length > 0);
  for (const f of funcoes) {
    const re = new RegExp(`ALTER\\s+FUNCTION\\s+(?:public\\.)?"?${f}"?\\s*\\([^)]*\\)\\s+SET\\s+search_path`, "i");
    assert.match(sql, re, `a funcao ${f} nao tem SET search_path em nenhuma migration`);
  }
});
