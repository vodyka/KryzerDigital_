
-- Revert to previous sequence value
UPDATE product_id_sequence 
SET next_id = (
  SELECT COALESCE(MAX(product_id), 510320099) + 1 
  FROM products 
  WHERE product_id IS NOT NULL
)
WHERE id = 1;
