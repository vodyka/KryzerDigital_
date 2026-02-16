
-- Migrar price → cost_price para produtos que ainda não têm cost_price definido
UPDATE products 
SET cost_price = price, sale_price = 0 
WHERE cost_price = 0 OR cost_price IS NULL;
