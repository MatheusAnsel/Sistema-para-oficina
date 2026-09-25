-- Permite cadastrar um veiculo sem cliente vinculado ainda (ex.: veiculo chegou
-- para avaliacao e o cadastro do cliente sera completado depois). Placa e
-- modelo continuam obrigatorios; os demais campos do veiculo (incluindo o
-- cliente) passam a ser opcionais.

ALTER TABLE veiculos ALTER COLUMN cliente_id DROP NOT NULL;

-- ON DELETE CASCADE nao se aplica quando cliente_id e NULL, entao nada muda
-- para os veiculos que ja tem cliente. Sem indice extra: idx_veiculos_cliente
-- (criado na 001) ja cobre bem tanto o valor preenchido quanto o NULL.
