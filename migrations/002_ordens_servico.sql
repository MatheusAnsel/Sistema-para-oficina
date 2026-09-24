-- Ordem de Servico (OS) da area /gestao.
-- Aditiva: nao altera 001_gestao.sql nem a tabela "servicos", que continua
-- intacta como historico/backup. Os registros antigos de "servicos" sao
-- copiados para OS ja com status 'entregue' (idempotente: pode rodar de novo).
--
-- Modelo: cliente -> veiculos -> ordens_servico -> os_itens (servico ou peca).
-- Pecas (tabela "pecas") entram na migration 003; por isso os_itens.peca_id
-- ainda nao tem FK aqui e a FK e adicionada la.

-- ============================================================
-- ORDENS DE SERVICO
-- ============================================================
CREATE TABLE IF NOT EXISTS ordens_servico (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          BIGSERIAL UNIQUE,
  veiculo_id      UUID NOT NULL REFERENCES veiculos(id),
  status          VARCHAR(30) NOT NULL DEFAULT 'aguardando_avaliacao'
                  CHECK (status IN (
                    'aguardando_avaliacao',
                    'orcamento_enviado',
                    'aprovado',
                    'em_execucao',
                    'finalizado',
                    'entregue',
                    'cancelado'
                  )),
  -- fuso da oficina, nao UTC: CURRENT_DATE viraria "amanha" a partir das 21h no Brasil
  data_entrada    DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  data_prevista   DATE,
  data_conclusao  DATE,
  quilometragem   INTEGER,
  observacoes     TEXT,
  -- valor_total e mantido pela aplicacao (soma dos itens); guardado aqui
  -- para listagens e relatorios nao precisarem somar item a item.
  valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  -- origem_servico_id liga a OS ao registro antigo de "servicos" que a gerou.
  -- UNIQUE garante que a migracao de historico nunca duplica.
  origem_servico_id UUID UNIQUE REFERENCES servicos(id) ON DELETE SET NULL,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ITENS DA OS (servico realizado ou peca utilizada)
-- ============================================================
CREATE TABLE IF NOT EXISTS os_itens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id           UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('servico', 'peca')),
  descricao       VARCHAR(300) NOT NULL,
  quantidade      NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
  -- preenchido apenas quando tipo = 'peca' (FK criada na migration 003)
  peca_id         UUID,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- atualizado_em automatico (reaproveita a funcao da 001)
-- ============================================================
CREATE OR REPLACE TRIGGER trg_ordens_servico_upd
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION gestao_set_atualizado_em();

-- ============================================================
-- INDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_os_veiculo        ON ordens_servico(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_os_status         ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_os_data_entrada   ON ordens_servico(data_entrada DESC);
CREATE INDEX IF NOT EXISTS idx_os_data_prevista  ON ordens_servico(data_prevista) WHERE data_prevista IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_os_itens_os       ON os_itens(os_id);

-- ============================================================
-- MIGRACAO DO HISTORICO: servicos -> ordens_servico (+ 1 item cada)
-- Idempotente: so copia o que ainda nao foi copiado (origem_servico_id).
-- Status 'entregue': o historico antigo ja aconteceu.
-- ============================================================
INSERT INTO ordens_servico
  (veiculo_id, status, data_entrada, data_conclusao, quilometragem, observacoes, valor_total, origem_servico_id, criado_em)
SELECT
  s.veiculo_id, 'entregue', s.data, s.data, s.quilometragem, s.observacoes, s.valor, s.id, s.criado_em
FROM servicos s
WHERE NOT EXISTS (SELECT 1 FROM ordens_servico o WHERE o.origem_servico_id = s.id);

INSERT INTO os_itens (os_id, tipo, descricao, quantidade, valor_unitario)
SELECT o.id, 'servico', s.descricao, 1, s.valor
FROM ordens_servico o
JOIN servicos s ON s.id = o.origem_servico_id
WHERE NOT EXISTS (SELECT 1 FROM os_itens i WHERE i.os_id = o.id);
