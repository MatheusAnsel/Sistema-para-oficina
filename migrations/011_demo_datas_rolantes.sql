-- 011 - Datas da demo sempre atuais.
--
-- Os dados ficticios do schema "demo" tem datas fixas: com o tempo, os filtros "Hoje", "Ultimos 7 dias"
-- e "Mes" do dashboard do recrutador ficavam vazios. A funcao demo.rolar_datas() empurra todas as datas
-- da demo pelos dias que passaram desde a ultima execucao (guardada em demo.relogio), mantendo o
-- historico relativo intacto. Nada no schema public e tocado.
--
-- Onde existe pg_cron (Supabase), ela roda todo dia as 00:05 de Brasilia (03:05 UTC). Sem pg_cron
-- (Postgres local, CI), a migration so cria a funcao; da para rodar na mao: SELECT demo.rolar_datas();
-- Aditiva e idempotente.

CREATE TABLE IF NOT EXISTS demo.relogio (
  id     boolean PRIMARY KEY DEFAULT true CHECK (id),
  ultimo date NOT NULL
);
ALTER TABLE demo.relogio ENABLE ROW LEVEL SECURITY;

INSERT INTO demo.relogio (ultimo) VALUES ((now() AT TIME ZONE 'America/Sao_Paulo')::date)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION demo.rolar_datas() RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  hoje  date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  dias  integer;
BEGIN
  SELECT hoje - ultimo INTO dias FROM demo.relogio WHERE id FOR UPDATE;
  IF dias IS NULL OR dias <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE demo.ordens_servico
     SET data_entrada   = data_entrada + dias,
         data_prevista  = data_prevista + dias,
         data_conclusao = data_conclusao + dias,
         criado_em      = criado_em + make_interval(days => dias),
         atualizado_em  = atualizado_em + make_interval(days => dias);
  UPDATE demo.os_itens      SET criado_em = criado_em + make_interval(days => dias);
  UPDATE demo.servicos      SET data = data + dias, criado_em = criado_em + make_interval(days => dias);
  UPDATE demo.clientes      SET criado_em = criado_em + make_interval(days => dias), atualizado_em = atualizado_em + make_interval(days => dias);
  UPDATE demo.veiculos      SET criado_em = criado_em + make_interval(days => dias), atualizado_em = atualizado_em + make_interval(days => dias);
  UPDATE demo.veiculo_fotos SET criado_em = criado_em + make_interval(days => dias);

  UPDATE demo.relogio SET ultimo = hoje WHERE id;
  RETURN dias;
END;
$$;
ALTER FUNCTION demo.rolar_datas() SET search_path = demo, pg_catalog;
REVOKE ALL ON FUNCTION demo.rolar_datas() FROM PUBLIC;

-- Agendamento diario, so onde o pg_cron esta disponivel.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'demo-rolar-datas';
    PERFORM cron.schedule('demo-rolar-datas', '5 3 * * *', 'SELECT demo.rolar_datas()');
  ELSE
    RAISE NOTICE 'pg_cron indisponivel: demo.rolar_datas() criada, mas sem agendamento.';
  END IF;
END;
$$;
