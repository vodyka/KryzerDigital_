
DROP INDEX idx_products_product_type;
DROP INDEX idx_products_spu;
DROP INDEX idx_products_user_id;

ALTER TABLE products DROP COLUMN origin;
ALTER TABLE products DROP COLUMN unit;
ALTER TABLE products DROP COLUMN cest;
ALTER TABLE products DROP COLUMN ncm;
ALTER TABLE products DROP COLUMN height_cm;
ALTER TABLE products DROP COLUMN width_cm;
ALTER TABLE products DROP COLUMN length_cm;
ALTER TABLE products DROP COLUMN weight;
ALTER TABLE products DROP COLUMN brand;
ALTER TABLE products DROP COLUMN description;
ALTER TABLE products DROP COLUMN cost_price;
ALTER TABLE products DROP COLUMN sale_price;
ALTER TABLE products DROP COLUMN is_active;
ALTER TABLE products DROP COLUMN mpn;
ALTER TABLE products DROP COLUMN barcode;
ALTER TABLE products DROP COLUMN use_alias_in_nfe;
ALTER TABLE products DROP COLUMN alias_name;
ALTER TABLE products DROP COLUMN spu;
ALTER TABLE products DROP COLUMN product_type;
ALTER TABLE products DROP COLUMN user_id;
