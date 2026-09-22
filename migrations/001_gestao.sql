-- Gestao de veiculos e servicos da oficina (area /gestao).
-- Schema inspirado no modulo "clientes" do Syre, adaptado para uma oficina:
-- cliente -> veiculos (1:N) -> servicos (1:N).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USUARIOS (login da area /gestao, separado do /admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS gestao_usuarios (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          VARCHAR(200) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  senha_hash    VARCHAR(200) NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          VARCHAR(200) NOT NULL,
  telefone      VARCHAR(20),
  email         VARCHAR(150),
  observacoes   TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VEICULOS
-- ============================================================
CREATE TABLE IF NOT EXISTS veiculos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  placa          VARCHAR(8) NOT NULL,
  marca          VARCHAR(60),
  modelo         VARCHAR(100) NOT NULL,
  ano            SMALLINT,
  cor            VARCHAR(40),
  quilometragem  INTEGER,
  observacoes    TEXT,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (placa)
);

-- ============================================================
-- SERVICOS (historico por veiculo)
-- ============================================================
CREATE TABLE IF NOT EXISTS servicos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  veiculo_id     UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  data           DATE NOT NULL DEFAULT CURRENT_DATE,
  quilometragem  INTEGER,
  descricao      VARCHAR(300) NOT NULL,
  valor          NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes    TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- atualizado_em automatico
-- ============================================================
CREATE OR REPLACE FUNCTION gestao_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','veiculos','servicos']
  LOOP
    EXECUTE format(
      'CREATE OR REPLACE TRIGGER trg_%s_upd
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION gestao_set_atualizado_em();', t, t
    );
  END LOOP;
END;
$$;

-- ============================================================
-- INDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_nome        ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_veiculos_cliente      ON veiculos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa        ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_servicos_veiculo      ON servicos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_servicos_data         ON servicos(data DESC);
