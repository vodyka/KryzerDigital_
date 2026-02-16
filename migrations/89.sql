
-- Set the sequence to start at 615100101
-- This ensures all new products get IDs starting from this number
UPDATE product_id_sequence 
SET next_id = 615100101 
WHERE id = 1;

-- If the sequence row doesn't exist, create it
INSERT OR IGNORE INTO product_id_sequence (id, next_id) 
VALUES (1, 615100101);
