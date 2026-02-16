
-- Adicionar categorias nativas para todas as empresas existentes
-- RECEITAS OPERACIONAIS
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Descontos Concedidos', 'expense', 1, 'RECEITAS OPERACIONAIS', 1, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Descontos Concedidos' AND group_name = 'RECEITAS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Juros Recebidos', 'income', 1, 'RECEITAS OPERACIONAIS', 2, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Juros Recebidos' AND group_name = 'RECEITAS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Multas Recebidas', 'income', 1, 'RECEITAS OPERACIONAIS', 3, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Multas Recebidas' AND group_name = 'RECEITAS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Outras receitas', 'income', 1, 'RECEITAS OPERACIONAIS', 4, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Outras receitas' AND group_name = 'RECEITAS OPERACIONAIS');
