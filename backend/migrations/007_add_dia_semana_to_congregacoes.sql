-- Migration: adicionar coluna dia_semana em congregacoes
-- Generated: 2025-01-27
-- Descrição: Adiciona coluna para armazenar o dia da semana da congregação

ALTER TABLE congregacoes
  ADD COLUMN IF NOT EXISTS dia_semana VARCHAR(50);

-- Comentário na coluna para documentação
COMMENT ON COLUMN congregacoes.dia_semana IS 'Dia da semana em que a congregação se reúne (ex: Domingo, Segunda-feira, etc.)';

