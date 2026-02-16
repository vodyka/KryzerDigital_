
-- CUSTOS OPERACIONAIS (parte 2)
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'CSLL Retido sobre a Receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 7, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'CSLL Retido sobre a Receita' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'ISS Retido sobre a Receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 8, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'ISS Retido sobre a Receita' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'PIS Retido sobre a Receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 9, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'PIS Retido sobre a Receita' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'IRPJ Retido sobre a Receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 10, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'IRPJ Retido sobre a Receita' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'COFINS Retido sobre a Receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 11, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'COFINS Retido sobre a Receita' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Compras - Embalagens', 'expense', 1, 'CUSTOS OPERACIONAIS', 12, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Compras - Embalagens' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Frete sobre Compras', 'expense', 1, 'CUSTOS OPERACIONAIS', 13, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Frete sobre Compras' AND group_name = 'CUSTOS OPERACIONAIS');
