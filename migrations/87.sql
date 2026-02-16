
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  transfer_date DATE NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  from_account_id INTEGER,
  from_account_name TEXT,
  to_account_id INTEGER,
  to_account_name TEXT,
  created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transfers_company_id ON transfers(company_id);
CREATE INDEX idx_transfers_date ON transfers(transfer_date);
CREATE INDEX idx_transfers_from_account ON transfers(from_account_id);
CREATE INDEX idx_transfers_to_account ON transfers(to_account_id);
