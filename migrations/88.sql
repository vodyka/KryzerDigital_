
-- Update the sequence to be one more than the highest product_id currently in use
-- This ensures new products get sequential IDs starting from the correct number
UPDATE product_id_sequence 
SET next_id = (
  SELECT COALESCE(MAX(product_id), 510320099) + 1 
  FROM products 
  WHERE product_id IS NOT NULL
)
WHERE id = 1;

-- If the sequence row doesn't exist yet, insert it
INSERT OR IGNORE INTO product_id_sequence (id, next_id) 
VALUES (1, 510320100);
