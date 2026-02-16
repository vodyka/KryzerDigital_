
-- Revert to the previous sequence value (though this is not ideal)
UPDATE product_id_sequence 
SET next_id = 510320448 
WHERE id = 1;
