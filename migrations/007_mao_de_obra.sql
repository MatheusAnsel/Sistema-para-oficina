-- 007 - Mao de obra nas pecas da OS.
--
-- Cada item do tipo 'peca' pode carregar um valor de mao de obra (instalacao/troca),
-- somado ao total da OS: quantidade * valor_unitario + mao_de_obra.
-- O valor e do item inteiro, nao multiplicado pela quantidade.
-- Aditiva e idempotente. O schema demo (006) tambem recebe a coluna, porque a copia
-- por LIKE so pega colunas novas em bancos onde o schema demo ainda nao existia.

ALTER TABLE public.os_itens
  ADD COLUMN IF NOT EXISTS mao_de_obra NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (mao_de_obra >= 0);

ALTER TABLE demo.os_itens
  ADD COLUMN IF NOT EXISTS mao_de_obra NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (mao_de_obra >= 0);
