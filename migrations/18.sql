ALTER TABLE orders ADD COLUMN original_order_id INTEGER;
ALTER TABLE orders ADD COLUMN is_replenishment BOOLEAN DEFAULT 0;