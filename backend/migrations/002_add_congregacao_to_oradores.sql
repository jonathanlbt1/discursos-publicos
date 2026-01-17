-- Migration: adicionar coluna congregacao_id em oradores
-- Generated: 2025-11-03

ALTER TABLE oradores
  ADD COLUMN IF NOT EXISTS congregacao_id INTEGER REFERENCES congregacoes(id) ON DELETE SET NULL;

-- Optionally populate from existing data if needed (no-op here)
-- UPDATE oradores SET congregacao_id = NULL WHERE congregacao_id IS NULL;
