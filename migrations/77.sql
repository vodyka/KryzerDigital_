
-- ATIVIDADES DE FINANCIAMENTO
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Aporte de capital', 'income', 1, 'ATIVIDADES DE FINANCIAMENTO', 1, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Aporte de capital' AND group_name = 'ATIVIDADES DE FINANCIAMENTO');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Obtenção de empréstimo', 'income', 1, 'ATIVIDADES DE FINANCIAMENTO', 2, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Obtenção de empréstimo' AND group_name = 'ATIVIDADES DE FINANCIAMENTO');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Pagamento de empréstimo', 'expense', 1, 'ATIVIDADES DE FINANCIAMENTO', 3, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Pagamento de empréstimo' AND group_name = 'ATIVIDADES DE FINANCIAMENTO');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Retirada de capital', 'expense', 1, 'ATIVIDADES DE FINANCIAMENTO', 4, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Retirada de capital' AND group_name = 'ATIVIDADES DE FINANCIAMENTO');
