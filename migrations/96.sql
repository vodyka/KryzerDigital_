
CREATE TABLE product_ml_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  product_sku TEXT NOT NULL,
  ml_listing_id TEXT NOT NULL,
  ml_variation_id TEXT,
  integration_id TEXT NOT NULL,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_ml_mappings_product_sku ON product_ml_mappings(product_sku);
CREATE INDEX idx_product_ml_mappings_ml_listing_id ON product_ml_mappings(ml_listing_id);
CREATE INDEX idx_product_ml_mappings_company_id ON product_ml_mappings(company_id);
