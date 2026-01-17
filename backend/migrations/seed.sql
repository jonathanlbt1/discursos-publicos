-- Dados de exemplo para teste (opcional)
-- Este arquivo pode ser usado para popular o banco com dados de exemplo

-- Exemplo de discursos
INSERT INTO discursos (numero, tema, data_versao_esboco) VALUES
(1, 'Quem é Qualificado Para Ser Ministro de Deus?', '2023-01-01'),
(2, 'Está Chegando — O Novo Mundo de Deus!', '2023-01-01'),
(3, 'Tenha a Mente de Cristo', '2023-01-01'),
(4, 'Siga o Proceder de Cristo em Seu Ministério', '2023-01-01'),
(5, 'Revestidos da Qualidade do Amor', '2023-01-01')
ON CONFLICT (numero) DO NOTHING;

-- Exemplo de oradores (opcional - remover se não quiser dados de exemplo)
-- INSERT INTO oradores (nome, celular, email, ativo) VALUES
-- ('João Silva', '(11) 98765-4321', 'joao@email.com', true),
-- ('Pedro Santos', '(11) 98765-1234', 'pedro@email.com', true)
-- ON CONFLICT DO NOTHING;

-- Exemplo de congregações (opcional - remover se não quiser dados de exemplo)
-- INSERT INTO congregacoes (nome, endereco, horario, nome_contato, celular_contato) VALUES
-- ('Congregação Central', 'Rua Principal, 123', 'Domingos às 10h', 'José Contato', '(11) 91234-5678'),
-- ('Congregação Norte', 'Av. Norte, 456', 'Domingos às 9h30', 'Maria Contato', '(11) 91234-8765')
-- ON CONFLICT DO NOTHING;

