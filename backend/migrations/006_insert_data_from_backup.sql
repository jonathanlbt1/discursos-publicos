-- Inserção de dados extraídos do backup COPY
-- Gerado automaticamente a partir do arquivo backup_discursos
-- Data: 2025-12-09

-- ===================================
-- Tabela: usuarios
-- ===================================

INSERT INTO public.usuarios (id, nome, email, senha_hash, role, ativo, ultimo_acesso, created_at, updated_at) VALUES
(1, 'Administrador', 'admin@admin.com', '$2b$10$4YMbfbldEVUnUwnjG1T7quIP/HtlX9QN0x0.bGD4ID1T.VPM7XJxa', 'admin', true, '2025-11-07 21:02:20.52426', '2025-11-07 18:18:18.16655', '2025-11-07 21:02:20.52426')
ON CONFLICT (id) DO NOTHING;

-- ===================================
-- Resetar sequences
-- ===================================

SELECT setval('public.agendamentos_id_seq', (SELECT MAX(id) FROM public.agendamentos));
SELECT setval('public.arranjos_id_seq', (SELECT MAX(id) FROM public.arranjos));
SELECT setval('public.arranjos_congregacoes_id_seq', (SELECT MAX(id) FROM public.arranjos_congregacoes));
SELECT setval('public.historico_discursos_id_seq', (SELECT MAX(id) FROM public.historico_discursos));
SELECT setval('public.usuarios_id_seq', (SELECT MAX(id) FROM public.usuarios));
