
CREATE TABLE inventory_control (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  cost_price REAL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_control_product_id ON inventory_control(product_id);
CREATE INDEX idx_inventory_control_sku ON inventory_control(sku);
CREATE INDEX idx_inventory_control_company_id ON inventory_control(company_id);
