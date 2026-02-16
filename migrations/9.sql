
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  discount REAL DEFAULT 0.00,
  shipping_cost REAL DEFAULT 0.00,
  other_costs REAL DEFAULT 0.00,
  payment_method TEXT,
  payment_type TEXT,
  installments INTEGER DEFAULT 1,
  is_grouped BOOLEAN DEFAULT 0,
  status TEXT DEFAULT 'Pendente',
  total_amount REAL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
