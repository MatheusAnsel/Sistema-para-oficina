-- Foto principal do veiculo (uma por veiculo, por enquanto). Guarda so a URL
-- publica do arquivo no Vercel Blob -- o arquivo em si nao fica no Postgres.
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS foto_url TEXT;
