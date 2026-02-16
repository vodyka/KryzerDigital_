
CREATE TABLE payment_installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  installment_number INTEGER NOT NULL,
  amount REAL NOT NULL,
  due_date DATE NOT NULL,
  is_paid BOOLEAN DEFAULT 0,
  paid_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_installments_order_id ON payment_installments(order_id);
CREATE INDEX idx_payment_installments_due_date ON payment_installments(due_date);
