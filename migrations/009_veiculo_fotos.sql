-- 009 - Varias fotos por veiculo.
--
-- A foto que ja existia (veiculos.foto_url, migration 004) continua sendo a foto PRINCIPAL
-- (a miniatura da lista). Esta tabela guarda as fotos adicionais. Os arquivos ficam no
-- armazenamento S3; aqui so a URL. Apagar o veiculo apaga as linhas (ON DELETE CASCADE).
-- Aditiva e idempotente.

CREATE TABLE IF NOT EXISTS veiculo_fotos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  veiculo_id  UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_veiculo_fotos_veiculo ON veiculo_fotos(veiculo_id, criado_em);

-- RLS ligado e sem policy: a API publica do Supabase (anon/authenticated) nao enxerga nada
-- (mesma regra da migration 005).
ALTER TABLE veiculo_fotos ENABLE ROW LEVEL SECURITY;

-- Schema demo (migration 006): o login de recrutador consulta so o schema demo, entao a
-- tabela precisa existir la tambem (vazia). Pula se o schema demo nao existe neste banco.
DO $$
DECLARE
  r TEXT;
BEGIN
  IF to_regnamespace('demo') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS demo.veiculo_fotos (LIKE public.veiculo_fotos INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
    ALTER TABLE demo.veiculo_fotos ENABLE ROW LEVEL SECURITY;
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON demo.veiculo_fotos FROM %I', r);
      END IF;
    END LOOP;
  END IF;
END;
$$;
