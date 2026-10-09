-- 007 - Tipo de item "mao de obra" na OS.
--
-- Alem de servico e peca, a OS passa a aceitar linhas de mao de obra, com o valor definido
-- pelo mecanico (quantidade x valor unitario, ex.: horas x valor da hora). O total da OS
-- continua sendo a soma dos itens, entao nada muda no calculo.
-- Aditiva e idempotente. Tambem ajusta o schema demo (006).

ALTER TABLE public.os_itens DROP CONSTRAINT IF EXISTS os_itens_tipo_check;
ALTER TABLE public.os_itens ADD CONSTRAINT os_itens_tipo_check CHECK (tipo IN ('servico', 'peca', 'mao_de_obra'));

ALTER TABLE demo.os_itens DROP CONSTRAINT IF EXISTS os_itens_tipo_check;
ALTER TABLE demo.os_itens ADD CONSTRAINT os_itens_tipo_check CHECK (tipo IN ('servico', 'peca', 'mao_de_obra'));

-- Limpeza: versao anterior desta migration criava uma coluna por peca, que nao e mais usada.
ALTER TABLE public.os_itens DROP COLUMN IF EXISTS mao_de_obra;
ALTER TABLE demo.os_itens DROP COLUMN IF EXISTS mao_de_obra;
