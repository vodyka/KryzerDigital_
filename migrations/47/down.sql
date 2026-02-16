
DROP INDEX idx_products_is_deleted;
DROP INDEX idx_products_product_id;
DROP TABLE product_id_sequence;
ALTER TABLE products DROP COLUMN is_deleted;
ALTER TABLE products DROP COLUMN product_id;
