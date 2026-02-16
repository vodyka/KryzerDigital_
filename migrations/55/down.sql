-- Remover relações
DELETE FROM collection_point_marketplaces;

-- Remover marketplaces
DELETE FROM marketplaces WHERE id IN (1,2,3,4,5,6,7,8,9,10,11,12,13);