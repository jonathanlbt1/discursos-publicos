-- Tabela de Arranjos
CREATE TABLE IF NOT EXISTS arranjos (
  id SERIAL PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ano, mes)
);

-- Tabela de relacionamento entre Arranjos e Congregações (many-to-many)
CREATE TABLE IF NOT EXISTS arranjos_congregacoes (
  id SERIAL PRIMARY KEY,
  arranjo_id INTEGER NOT NULL REFERENCES arranjos(id) ON DELETE CASCADE,
  congregacao_id INTEGER NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(arranjo_id, congregacao_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_arranjos_ano_mes ON arranjos(ano, mes);
CREATE INDEX IF NOT EXISTS idx_arranjos_congregacoes_arranjo ON arranjos_congregacoes(arranjo_id);
CREATE INDEX IF NOT EXISTS idx_arranjos_congregacoes_congregacao ON arranjos_congregacoes(congregacao_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_arranjos_updated_at ON arranjos;
CREATE TRIGGER update_arranjos_updated_at 
  BEFORE UPDATE ON arranjos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

