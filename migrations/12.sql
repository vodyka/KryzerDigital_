
CREATE TABLE accounts_payable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  supplier_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  due_date DATE NOT NULL,
  is_grouped BOOLEAN DEFAULT 0,
  group_week_start DATE,
  group_week_end DATE,
  order_ids TEXT,
  total_pieces INTEGER DEFAULT 0,
  payment_method TEXT,
  is_paid BOOLEAN DEFAULT 0,
  paid_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_payable_user_id ON accounts_payable(user_id);
CREATE INDEX idx_accounts_payable_supplier_id ON accounts_payable(supplier_id);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX idx_accounts_payable_is_paid ON accounts_payable(is_paid);
