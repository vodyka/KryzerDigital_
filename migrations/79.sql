
CREATE TABLE recurring_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('monthly', 'installment')),
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  person_name TEXT,
  person_id INTEGER,
  category_id INTEGER,
  cost_center TEXT,
  bank_account TEXT,
  bank_account_id INTEGER,
  payment_method TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  total_installments INTEGER,
  current_installment INTEGER DEFAULT 0,
  day_of_month INTEGER,
  is_active BOOLEAN DEFAULT 1,
  last_generated_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recurring_transactions_company ON recurring_transactions(company_id);
CREATE INDEX idx_recurring_transactions_active ON recurring_transactions(is_active);
