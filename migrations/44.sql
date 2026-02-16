
-- Tabela para produtos dinâmicos
CREATE TABLE product_dynamic_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dynamic_sku TEXT NOT NULL,
  component_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_dynamic_items_dynamic_sku ON product_dynamic_items(dynamic_sku);
CREATE INDEX idx_product_dynamic_items_component_sku ON product_dynamic_items(component_sku);
