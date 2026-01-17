-- Tabela de Congregações
CREATE TABLE IF NOT EXISTS congregacoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  endereco TEXT,
  horario VARCHAR(50),
  nome_contato VARCHAR(255),
  celular_contato VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Discursos
CREATE TABLE IF NOT EXISTS discursos (
  id SERIAL PRIMARY KEY,
  numero INTEGER UNIQUE NOT NULL,
  tema TEXT NOT NULL,
  data_versao_esboco DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Irmãos/Oradores
CREATE TABLE IF NOT EXISTS oradores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  celular VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  discurso_id INTEGER REFERENCES discursos(id) ON DELETE CASCADE,
  orador_id INTEGER REFERENCES oradores(id) ON DELETE CASCADE,
  congregacao_id INTEGER REFERENCES congregacoes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('local', 'enviado', 'recebido')),
  -- tipo: 'local' = discurso na própria congregação
  -- tipo: 'enviado' = irmão enviado para outra congregação
  -- tipo: 'recebido' = orador recebido de outra congregação
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Histórico de Discursos Proferidos
CREATE TABLE IF NOT EXISTS historico_discursos (
  id SERIAL PRIMARY KEY,
  discurso_id INTEGER REFERENCES discursos(id) ON DELETE CASCADE,
  orador_id INTEGER REFERENCES oradores(id) ON DELETE CASCADE,
  congregacao_id INTEGER REFERENCES congregacoes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('local', 'enviado', 'recebido')),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_discurso ON agendamentos(discurso_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_orador ON agendamentos(orador_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_congregacao ON agendamentos(congregacao_id);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_discursos(data);
CREATE INDEX IF NOT EXISTS idx_historico_discurso ON historico_discursos(discurso_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
-- Drop any existing triggers to make migration idempotent
DROP TRIGGER IF EXISTS update_congregacoes_updated_at ON congregacoes;
CREATE TRIGGER update_congregacoes_updated_at BEFORE UPDATE ON congregacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discursos_updated_at ON discursos;
CREATE TRIGGER update_discursos_updated_at BEFORE UPDATE ON discursos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_oradores_updated_at ON oradores;
CREATE TRIGGER update_oradores_updated_at BEFORE UPDATE ON oradores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agendamentos_updated_at ON agendamentos;
CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

