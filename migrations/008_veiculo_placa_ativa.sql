-- 008 - Placa unica so entre veiculos ativos + limpeza de veiculos apagados.
--
-- Antes, "apagar" veiculo so marcava ativo=false e a placa continuava ocupada pela
-- restricao UNIQUE (placa): recadastrar o mesmo carro dava "Ja existe um veiculo com essa placa".
-- Agora a unicidade vale so para veiculos ativos. Veiculos sem nenhuma OS sao apagados de
-- verdade pela aplicacao; os que tem OS no historico continuam guardados (ocultos) porque
-- as OS dependem deles, mas deixam de bloquear a placa.
-- Aditiva e idempotente.

ALTER TABLE public.veiculos DROP CONSTRAINT IF EXISTS veiculos_placa_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_veiculos_placa_ativa
  ON public.veiculos (placa) WHERE ativo = true;

-- Limpeza: veiculos ja "apagados" antes desta correcao e sem nenhuma OS saem de vez do banco.
DELETE FROM public.veiculos v
WHERE v.ativo = false
  AND NOT EXISTS (SELECT 1 FROM public.ordens_servico o WHERE o.veiculo_id = v.id);
