
CREATE TABLE supplier_production_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity_needed INTEGER NOT NULL,
  priority_score INTEGER NOT NULL,
  abc_curve TEXT NOT NULL,
  reason TEXT NOT NULL,
  is_in_production BOOLEAN DEFAULT 0,
  marked_production_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_production_queue_supplier ON supplier_production_queue(supplier_id);
CREATE INDEX idx_supplier_production_queue_sku ON supplier_production_queue(sku);
CREATE INDEX idx_supplier_production_queue_production ON supplier_production_queue(is_in_production);
