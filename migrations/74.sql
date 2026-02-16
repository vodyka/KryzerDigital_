
-- DESPESAS OPERACIONAIS E OUTRAS RECEITAS (parte 3)
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de INSS Retido', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 13, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de INSS Retido' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de IRPJ Retido', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 14, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de IRPJ Retido' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de Outras retenções', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 15, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de Outras retenções' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de ISS Retido', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 16, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de ISS Retido' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de PIS Retido', 'expense', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 17, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de PIS Retido' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'CSLL Retido sobre Pagamentos', 'income', 1, 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 18, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'CSLL Retido sobre Pagamentos' AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS');
