
-- Tabela para kits/composições
CREATE TABLE product_kit_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kit_sku TEXT NOT NULL,
  component_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_kit_items_kit_sku ON product_kit_items(kit_sku);
CREATE INDEX idx_product_kit_items_component_sku ON product_kit_items(component_sku);
