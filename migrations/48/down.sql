
-- Reverter: copiar cost_price de volta para price
UPDATE products 
SET price = cost_price 
WHERE cost_price > 0;
