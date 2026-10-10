-- 007 - Tipo de item "mao de obra" na OS.
--
-- Alem de servico e peca, a OS passa a aceitar linhas de mao de obra, com o valor definido
-- pelo mecanico (quantidade x valor unitario, ex.: horas x valor da hora). O total da OS
-- continua sendo a soma dos itens, entao nada muda no calculo.
-- Aditiva e idempotente. Tambem ajusta o schema demo (006) quando ele existe.

DO $$
DECLARE
  s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'demo'] LOOP
    IF to_regclass(s || '.os_itens') IS NOT NULL THEN
      -- a coluna era VARCHAR(10) e 'mao_de_obra' tem 11 caracteres
      EXECUTE format('ALTER TABLE %I.os_itens ALTER COLUMN tipo TYPE VARCHAR(30)', s);
      EXECUTE format('ALTER TABLE %I.os_itens DROP CONSTRAINT IF EXISTS os_itens_tipo_check', s);
      EXECUTE format(
        'ALTER TABLE %I.os_itens ADD CONSTRAINT os_itens_tipo_check CHECK (tipo IN (''servico'', ''peca'', ''mao_de_obra''))',
        s
      );
      -- Limpeza: versao anterior desta migration criava uma coluna por peca, que nao e mais usada.
      EXECUTE format('ALTER TABLE %I.os_itens DROP COLUMN IF EXISTS mao_de_obra', s);
    END IF;
  END LOOP;
END;
$$;
