
-- DESPESAS OPERACIONAIS E OUTRAS RECEITAS (parte 2)
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Outras despesas', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 7, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Outras despesas' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Salários, encargos e benefícios', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 8, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Salários, encargos e benefícios' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Serviços contratados', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 9, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Serviços contratados' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Taxas e contribuições', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 10, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Taxas e contribuições' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de CSLL Retido', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 11, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de CSLL Retido' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de Cofins Retido', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 12, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de Cofins Retido' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');
