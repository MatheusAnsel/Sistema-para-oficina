-- ============================================================
-- 005 - Seguranca do banco (alertas do Supabase Security Advisor)
--
-- 1) "RLS Disabled in Public": liga Row Level Security nas tabelas de /gestao.
--    O app conecta por DATABASE_URL com o usuario dono das tabelas (postgres), que ignora
--    RLS, entao o site continua igual. Ja a API publica do Supabase (PostgREST, com as
--    chaves anon/authenticated) deixa de enxergar qualquer linha: RLS sem politica nega tudo.
-- 2) "Function Search Path Mutable": fixa o search_path da funcao do trigger de atualizado_em.
-- 3) Defesa em profundidade, so onde os papeis anon/authenticated existem (Supabase):
--    tira os privilegios dessas tabelas e cria uma politica explicita de negar tudo.
--
-- Toda tabela nova criada em migrations precisa do seu ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY (um teste, src/lib/migrations-seguranca.test.ts, confere isso).
-- Idempotente: pode rodar varias vezes (o script de migracao roda todos os arquivos sempre).
-- ============================================================

-- 1) RLS
ALTER TABLE gestao_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico  ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_itens        ENABLE ROW LEVEL SECURITY;

-- 2) search_path fixo. now() vem de pg_catalog, que o Postgres sempre consulta.
--    (A 001 recria a funcao a cada execucao do script; como a 005 roda depois, o valor final fica certo.)
ALTER FUNCTION gestao_set_atualizado_em() SET search_path = '';

-- 3) Papeis da API publica do Supabase
DO $$
DECLARE
  tabelas TEXT[] := ARRAY['gestao_usuarios', 'clientes', 'veiculos', 'servicos', 'ordens_servico', 'os_itens'];
  t TEXT;
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      FOREACH t IN ARRAY tabelas LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM %I', t, r);
      END LOOP;
      EXECUTE format('REVOKE ALL ON FUNCTION public.gestao_set_atualizado_em() FROM %I', r);
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    FOREACH t IN ARRAY tabelas LOOP
      EXECUTE format('DROP POLICY IF EXISTS negar_api_publica ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY negar_api_publica ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        t
      );
    END LOOP;
  END IF;
END;
$$;
