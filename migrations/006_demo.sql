-- ============================================================
-- 006 - Modo demonstracao para recrutadores (schema "demo")
--
-- Copia da estrutura de /gestao num schema separado, com dados 100% ficticios. O login demo
-- (src/lib/gestao-demo.ts) faz o app consultar SO este schema (SET LOCAL search_path) e bloqueia
-- qualquer escrita, entao os dados reais da oficina em "public" nunca aparecem para recrutadores.
--
-- Idempotente: rodar de novo recria o schema se preciso e reajusta as datas das OS para a
-- data de hoje (o dashboard sempre mostra "hoje" com movimento). Rode scripts/migrate-gestao.mjs
-- de vez em quando para atualizar.
--
-- Atencao: o schema demo copia a estrutura de "public" no momento da migracao. Ao criar uma
-- migration nova que altere essas tabelas, a copia abaixo (LIKE) so pega colunas novas em bancos
-- onde o schema demo ainda nao existe; em bancos ja migrados, inclua o ALTER equivalente aqui.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS demo;

CREATE TABLE IF NOT EXISTS demo.clientes       (LIKE public.clientes       INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS demo.veiculos       (LIKE public.veiculos       INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS demo.servicos       (LIKE public.servicos       INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS demo.ordens_servico (LIKE public.ordens_servico INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
CREATE TABLE IF NOT EXISTS demo.os_itens       (LIKE public.os_itens       INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);

ALTER TABLE demo.clientes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.veiculos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.servicos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo.os_itens       ENABLE ROW LEVEL SECURITY;

-- Papeis da API publica do Supabase nao enxergam nada deste schema.
DO $$
DECLARE
  r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA demo FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA demo FROM %I', r);
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- DADOS FICTICIOS (nomes, telefones e placas inventados)
-- ============================================================

INSERT INTO demo.clientes (id, nome, telefone, email, observacoes) VALUES
  ('00000000-0000-4000-8001-000000000001', 'Carlos Almeida', '(11) 99999-0101', 'carlos.almeida@exemplo.com', 'Cliente desde 2021. Prefere contato por WhatsApp.'),
  ('00000000-0000-4000-8001-000000000002', 'Fernanda Souza', '(11) 99999-0102', 'fernanda.souza@exemplo.com', NULL),
  ('00000000-0000-4000-8001-000000000003', 'Ricardo Nogueira', '(11) 99999-0103', NULL, 'Frota pequena: dois veículos da empresa.'),
  ('00000000-0000-4000-8001-000000000004', 'Juliana Prado', '(11) 99999-0104', 'juliana.prado@exemplo.com', NULL),
  ('00000000-0000-4000-8001-000000000005', 'Marcos Vieira', '(11) 99999-0105', NULL, 'Pede sempre as peças trocadas de volta.'),
  ('00000000-0000-4000-8001-000000000006', 'Patrícia Lima', '(11) 99999-0106', 'patricia.lima@exemplo.com', NULL),
  ('00000000-0000-4000-8001-000000000007', 'Eduardo Barros', '(11) 99999-0107', 'eduardo.barros@exemplo.com', 'Aprova orçamento por mensagem.'),
  ('00000000-0000-4000-8001-000000000008', 'Luciana Freitas', '(11) 99999-0108', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, telefone = EXCLUDED.telefone, email = EXCLUDED.email, observacoes = EXCLUDED.observacoes, ativo = TRUE;

INSERT INTO demo.veiculos (id, cliente_id, placa, marca, modelo, ano, cor, quilometragem) VALUES
  ('00000000-0000-4000-8002-000000000001', '00000000-0000-4000-8001-000000000001', 'DEM1A01', 'Volkswagen', 'Gol 1.6', 2018, 'Prata', 84200),
  ('00000000-0000-4000-8002-000000000002', '00000000-0000-4000-8001-000000000001', 'DEM1A02', 'Honda', 'Civic EXL', 2020, 'Preto', 52100),
  ('00000000-0000-4000-8002-000000000003', '00000000-0000-4000-8001-000000000002', 'DEM1A03', 'Fiat', 'Argo Drive', 2021, 'Branco', 33800),
  ('00000000-0000-4000-8002-000000000004', '00000000-0000-4000-8001-000000000003', 'DEM1A04', 'Ford', 'Ranger XLS', 2019, 'Cinza', 101500),
  ('00000000-0000-4000-8002-000000000005', '00000000-0000-4000-8001-000000000003', 'DEM1A05', 'Fiat', 'Fiorino Endurance', 2022, 'Branco', 47900),
  ('00000000-0000-4000-8002-000000000006', '00000000-0000-4000-8001-000000000004', 'DEM1A06', 'Chevrolet', 'Onix LT', 2019, 'Vermelho', 68300),
  ('00000000-0000-4000-8002-000000000007', '00000000-0000-4000-8001-000000000005', 'DEM1A07', 'Toyota', 'Corolla XEi', 2017, 'Prata', 122000),
  ('00000000-0000-4000-8002-000000000008', '00000000-0000-4000-8001-000000000006', 'DEM1A08', 'Hyundai', 'HB20 Comfort', 2020, 'Azul', 59400),
  ('00000000-0000-4000-8002-000000000009', '00000000-0000-4000-8001-000000000007', 'DEM1A09', 'Jeep', 'Renegade Longitude', 2021, 'Preto', 41200),
  ('00000000-0000-4000-8002-000000000010', '00000000-0000-4000-8001-000000000008', 'DEM1A10', 'Renault', 'Kwid Zen', 2022, 'Laranja', 27600)
ON CONFLICT (id) DO UPDATE SET cliente_id = EXCLUDED.cliente_id, placa = EXCLUDED.placa, marca = EXCLUDED.marca, modelo = EXCLUDED.modelo, ano = EXCLUDED.ano, cor = EXCLUDED.cor, quilometragem = EXCLUDED.quilometragem, ativo = TRUE;

INSERT INTO demo.ordens_servico (id, numero, veiculo_id, status, data_entrada, data_prevista, data_conclusao, quilometragem, observacoes) VALUES
  ('00000000-0000-4000-8003-000000001001', 1001, '00000000-0000-4000-8002-000000000001', 'entregue', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-28), NULL, ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-26), 83100, 'Revisão de 80 mil km.'),
  ('00000000-0000-4000-8003-000000001002', 1002, '00000000-0000-4000-8002-000000000004', 'entregue', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-21), NULL, ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-19), 100200, 'Troca de pastilhas e discos dianteiros.'),
  ('00000000-0000-4000-8003-000000001003', 1003, '00000000-0000-4000-8002-000000000007', 'entregue', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-14), NULL, ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-12), 121400, NULL),
  ('00000000-0000-4000-8003-000000001004', 1004, '00000000-0000-4000-8002-000000000003', 'entregue', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-9), NULL, ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-8), 33100, 'Troca de óleo e filtros.'),
  ('00000000-0000-4000-8003-000000001005', 1005, '00000000-0000-4000-8002-000000000002', 'entregue', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-6), NULL, ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-4), 51800, NULL),
  ('00000000-0000-4000-8003-000000001006', 1006, '00000000-0000-4000-8002-000000000008', 'finalizado', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-3), NULL, ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-1), 59000, 'Aguardando retirada pelo cliente.'),
  ('00000000-0000-4000-8003-000000001007', 1007, '00000000-0000-4000-8002-000000000005', 'finalizado', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-2), NULL, ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (0), 47600, NULL),
  ('00000000-0000-4000-8003-000000001008', 1008, '00000000-0000-4000-8002-000000000009', 'em_execucao', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-1), ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (1), NULL, 41000, 'Diagnóstico de ruído na suspensão dianteira.'),
  ('00000000-0000-4000-8003-000000001009', 1009, '00000000-0000-4000-8002-000000000006', 'em_execucao', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (0), ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (0), NULL, 68100, 'Troca da correia dentada e tensor.'),
  ('00000000-0000-4000-8003-000000001010', 1010, '00000000-0000-4000-8002-000000000001', 'aprovado', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (0), ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (2), NULL, 84200, 'Alinhamento e balanceamento aprovados.'),
  ('00000000-0000-4000-8003-000000001011', 1011, '00000000-0000-4000-8002-000000000010', 'orcamento_enviado', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (0), ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (3), NULL, 27500, 'Orçamento de embreagem enviado por WhatsApp.'),
  ('00000000-0000-4000-8003-000000001012', 1012, '00000000-0000-4000-8002-000000000004', 'aguardando_avaliacao', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (0), NULL, NULL, 101500, 'Cliente relata luz de injeção acesa.'),
  ('00000000-0000-4000-8003-000000001013', 1013, '00000000-0000-4000-8002-000000000007', 'aguardando_avaliacao', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (0), NULL, NULL, 122000, NULL),
  ('00000000-0000-4000-8003-000000001014', 1014, '00000000-0000-4000-8002-000000000003', 'cancelado', ((now() AT TIME ZONE 'America/Sao_Paulo')::date) + (-5), NULL, NULL, 33000, 'Cliente desistiu do serviço.')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, data_entrada = EXCLUDED.data_entrada, data_prevista = EXCLUDED.data_prevista, data_conclusao = EXCLUDED.data_conclusao, quilometragem = EXCLUDED.quilometragem, observacoes = EXCLUDED.observacoes;

-- Itens: recriados a cada execucao (so existem no schema demo).
DELETE FROM demo.os_itens;
INSERT INTO demo.os_itens (os_id, tipo, descricao, quantidade, valor_unitario) VALUES
  ('00000000-0000-4000-8003-000000001001', 'servico', 'Revisão completa 80 mil km', 1, 450),
  ('00000000-0000-4000-8003-000000001001', 'peca', 'Óleo 5W30 sintético (litro)', 4, 48.9),
  ('00000000-0000-4000-8003-000000001001', 'peca', 'Filtro de óleo', 1, 39),
  ('00000000-0000-4000-8003-000000001001', 'peca', 'Filtro de ar', 1, 52),
  ('00000000-0000-4000-8003-000000001002', 'servico', 'Troca de pastilhas e discos dianteiros', 1, 320),
  ('00000000-0000-4000-8003-000000001002', 'peca', 'Jogo de pastilhas dianteiras', 1, 189),
  ('00000000-0000-4000-8003-000000001002', 'peca', 'Disco de freio dianteiro (par)', 1, 420),
  ('00000000-0000-4000-8003-000000001003', 'servico', 'Troca de velas e cabos', 1, 180),
  ('00000000-0000-4000-8003-000000001003', 'peca', 'Jogo de velas', 1, 160),
  ('00000000-0000-4000-8003-000000001004', 'servico', 'Troca de óleo e filtros', 1, 120),
  ('00000000-0000-4000-8003-000000001004', 'peca', 'Óleo 0W20 (litro)', 4, 59),
  ('00000000-0000-4000-8003-000000001004', 'peca', 'Filtro de óleo', 1, 42),
  ('00000000-0000-4000-8003-000000001005', 'servico', 'Substituição de bateria', 1, 80),
  ('00000000-0000-4000-8003-000000001005', 'peca', 'Bateria 60Ah', 1, 519),
  ('00000000-0000-4000-8003-000000001006', 'servico', 'Alinhamento e balanceamento', 1, 160),
  ('00000000-0000-4000-8003-000000001006', 'peca', 'Pneu 185/65 R15', 2, 389),
  ('00000000-0000-4000-8003-000000001007', 'servico', 'Troca de óleo e filtros', 1, 120),
  ('00000000-0000-4000-8003-000000001007', 'peca', 'Óleo 5W40 (litro)', 4, 46),
  ('00000000-0000-4000-8003-000000001007', 'peca', 'Filtro de combustível', 1, 68),
  ('00000000-0000-4000-8003-000000001008', 'servico', 'Diagnóstico de suspensão', 1, 150),
  ('00000000-0000-4000-8003-000000001009', 'servico', 'Troca de correia dentada', 1, 520),
  ('00000000-0000-4000-8003-000000001009', 'peca', 'Kit correia dentada com tensor', 1, 640),
  ('00000000-0000-4000-8003-000000001010', 'servico', 'Alinhamento e balanceamento', 1, 160),
  ('00000000-0000-4000-8003-000000001011', 'servico', 'Troca de kit de embreagem', 1, 780),
  ('00000000-0000-4000-8003-000000001011', 'peca', 'Kit de embreagem', 1, 1290),
  ('00000000-0000-4000-8003-000000001012', 'servico', 'Diagnóstico eletrônico (scanner)', 1, 140),
  ('00000000-0000-4000-8003-000000001014', 'servico', 'Troca de amortecedores traseiros', 1, 300);

-- valor_total = soma dos itens (mesma regra da aplicacao).
UPDATE demo.ordens_servico o
SET valor_total = COALESCE((SELECT sum(i.quantidade * i.valor_unitario) FROM demo.os_itens i WHERE i.os_id = o.id), 0);
