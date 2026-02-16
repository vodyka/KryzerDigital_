
-- Adicionar colunas para cálculo de estoque em produtos compostos
ALTER TABLE products ADD COLUMN calculated_stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN last_stock_calculation TIMESTAMP;
