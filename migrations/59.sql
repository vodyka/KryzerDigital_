
-- Remove the universal marketplace entries that were auto-inserted
-- Each environment (dev/prod) should manage its own marketplace photos
DELETE FROM collection_point_marketplaces 
WHERE marketplace_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13);

DELETE FROM marketplaces 
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13);
