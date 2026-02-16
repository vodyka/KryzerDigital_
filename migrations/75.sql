
-- DESPESAS OPERACIONAIS E OUTRAS RECEITAS (parte 4)
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'INSS Retido sobre Pagamentos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 19, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'INSS Retido sobre Pagamentos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'IRPJ Retido sobre Pagamentos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 20, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'IRPJ Retido sobre Pagamentos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'COFINS Retido sobre Pagamentos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 21, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'COFINS Retido sobre Pagamentos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'PIS Retido sobre Pagamentos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 22, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'PIS Retido sobre Pagamentos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'ISS Retido sobre Pagamentos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 23, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'ISS Retido sobre Pagamentos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Outras Retenções sobre Pagamentos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 24, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Outras Retenções sobre Pagamentos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');
