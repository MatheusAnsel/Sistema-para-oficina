-- 010 - Limite de tentativas de senha no login da gestao.
--
-- Cada senha errada grava uma linha por chave ("email:<email>" e "ip:<ip>"). Antes de conferir a
-- senha, o login conta as falhas de cada chave nos ultimos 15 minutos e responde 429 quando passa
-- do limite (src/lib/login-limite.ts). Linhas com mais de 1 dia sao apagadas pelo proprio login.
-- Aditiva e idempotente.

CREATE TABLE IF NOT EXISTS login_falhas (
  id         BIGSERIAL PRIMARY KEY,
  chave      TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_falhas_chave ON login_falhas(chave, criado_em);

-- Mesma regra da migration 005: RLS ligado e sem policy, so o dono das tabelas (o app) enxerga.
ALTER TABLE login_falhas ENABLE ROW LEVEL SECURITY;
