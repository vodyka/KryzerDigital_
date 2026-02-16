ALTER TABLE products ADD COLUMN company_id INTEGER;
ALTER TABLE suppliers ADD COLUMN company_id INTEGER;
ALTER TABLE orders ADD COLUMN company_id INTEGER;
ALTER TABLE categories ADD COLUMN company_id INTEGER;
ALTER TABLE bank_accounts ADD COLUMN company_id INTEGER;
ALTER TABLE accounts_payable ADD COLUMN company_id INTEGER;
ALTER TABLE accounts_receivable ADD COLUMN company_id INTEGER;
ALTER TABLE spreadsheet_data ADD COLUMN company_id INTEGER;
ALTER TABLE activity_logs ADD COLUMN company_id INTEGER;
ALTER TABLE operational_expenses ADD COLUMN company_id INTEGER;
ALTER TABLE product_groups ADD COLUMN company_id INTEGER;
ALTER TABLE variation_colors ADD COLUMN company_id INTEGER;
ALTER TABLE variation_sizes ADD COLUMN company_id INTEGER;
ALTER TABLE ean_config ADD COLUMN company_id INTEGER;
ALTER TABLE spreadsheet_history ADD COLUMN company_id INTEGER;
ALTER TABLE supplier_production_queue ADD COLUMN company_id INTEGER;

CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_suppliers_company ON suppliers(company_id);
CREATE INDEX idx_orders_company ON orders(company_id);
CREATE INDEX idx_categories_company ON categories(company_id);
CREATE INDEX idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX idx_accounts_payable_company ON accounts_payable(company_id);
CREATE INDEX idx_accounts_receivable_company ON accounts_receivable(company_id);

-- Single bulk update using user_companies lookup for all user_id-based tables
UPDATE products SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = products.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE suppliers SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = suppliers.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE orders SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = orders.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE bank_accounts SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = bank_accounts.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE accounts_payable SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = accounts_payable.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE accounts_receivable SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = accounts_receivable.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE spreadsheet_data SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = spreadsheet_data.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE operational_expenses SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = operational_expenses.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE product_groups SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = product_groups.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE variation_colors SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = variation_colors.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE variation_sizes SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = variation_sizes.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE ean_config SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = ean_config.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;
UPDATE spreadsheet_history SET company_id = (SELECT uc.company_id FROM user_companies uc WHERE uc.user_id = spreadsheet_history.user_id AND uc.is_default = 1 LIMIT 1) WHERE company_id IS NULL AND user_id IS NOT NULL;