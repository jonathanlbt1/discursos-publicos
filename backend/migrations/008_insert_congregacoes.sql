-- Migration: insert initial congregacoes list
-- Generated: 2025-11-02

-- Ensure unique index on nome so ON CONFLICT can be used
CREATE UNIQUE INDEX IF NOT EXISTS idx_congregacoes_nome_unique ON congregacoes (nome);

