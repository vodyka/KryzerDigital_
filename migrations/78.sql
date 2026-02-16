
CREATE TABLE transaction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  changed_fields TEXT,
  old_values TEXT,
  new_values TEXT,
  changed_by_user_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaction_history_company ON transaction_history(company_id);
CREATE INDEX idx_transaction_history_transaction ON transaction_history(transaction_type, transaction_id);
CREATE INDEX idx_transaction_history_created ON transaction_history(created_at DESC);
