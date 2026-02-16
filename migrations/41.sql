
-- Expandir tabela products para suportar os 4 tipos
ALTER TABLE products ADD COLUMN user_id INTEGER;
ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'simple';
ALTER TABLE products ADD COLUMN spu TEXT;
ALTER TABLE products ADD COLUMN alias_name TEXT;
ALTER TABLE products ADD COLUMN use_alias_in_nfe BOOLEAN DEFAULT 0;
ALTER TABLE products ADD COLUMN barcode TEXT;
ALTER TABLE products ADD COLUMN mpn TEXT;
ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT 1;
ALTER TABLE products ADD COLUMN sale_price REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN description TEXT;
ALTER TABLE products ADD COLUMN brand TEXT;
ALTER TABLE products ADD COLUMN weight REAL;
ALTER TABLE products ADD COLUMN length_cm REAL;
ALTER TABLE products ADD COLUMN width_cm REAL;
ALTER TABLE products ADD COLUMN height_cm REAL;
ALTER TABLE products ADD COLUMN ncm TEXT;
ALTER TABLE products ADD COLUMN cest TEXT;
ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'UN';
ALTER TABLE products ADD COLUMN origin TEXT DEFAULT '0';

CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_spu ON products(spu);
CREATE INDEX idx_products_product_type ON products(product_type);
