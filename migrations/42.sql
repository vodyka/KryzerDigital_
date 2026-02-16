
-- Tabela para variantes de produtos (cor, tamanho, etc)
CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spu TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  variant_type TEXT NOT NULL,
  variant_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_variants_spu ON product_variants(spu);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
