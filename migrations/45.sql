
-- Tabela para mídia de produtos
CREATE TABLE product_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_sku TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_media_product_sku ON product_media(product_sku);
