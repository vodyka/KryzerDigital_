
-- ATIVIDADES DE INVESTIMENTO
INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Compra de ativo fixo', 'expense', 1, 'ATIVIDADES DE INVESTIMENTO', 1, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Compra de ativo fixo' AND group_name = 'ATIVIDADES DE INVESTIMENTO');

INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
SELECT c.id, 'Venda de ativo fixo', 'income', 1, 'ATIVIDADES DE INVESTIMENTO', 2, datetime('now'), datetime('now')
FROM companies c WHERE NOT EXISTS (SELECT 1 FROM categories WHERE company_id = c.id AND name = 'Venda de ativo fixo' AND group_name = 'ATIVIDADES DE INVESTIMENTO');
