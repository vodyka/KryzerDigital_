
-- DESPESAS OPERACIONAIS E OUTRAS RECEITAS (parte 1)
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Aluguel e condomínio', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 1, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Aluguel e condomínio' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Descontos Recebidos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 2, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Descontos Recebidos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Juros Pagos', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 3, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Juros Pagos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Luz, água e outros', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 4, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Luz, água e outros' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Material de escritório', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 5, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Material de escritório' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Multas Pagas', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 6, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Multas Pagas' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');
