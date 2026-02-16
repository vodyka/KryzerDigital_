
-- CUSTOS OPERACIONAIS (parte 1)
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Compras de fornecedores', 'expense', 1, 'CUSTOS OPERACIONAIS', 1, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Compras de fornecedores' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Custo serviço prestado', 'expense', 1, 'CUSTOS OPERACIONAIS', 2, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Custo serviço prestado' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Custos produto vendido', 'expense', 1, 'CUSTOS OPERACIONAIS', 3, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Custos produto vendido' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Impostos sobre receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 4, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Impostos sobre receita' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'INSS Retido sobre a Receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 5, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'INSS Retido sobre a Receita' AND group_name = 'CUSTOS OPERACIONAIS');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Outras Retenções sobre a Receita', 'expense', 1, 'CUSTOS OPERACIONAIS', 6, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Outras Retenções sobre a Receita' AND group_name = 'CUSTOS OPERACIONAIS');
