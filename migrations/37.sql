
CREATE TABLE operational_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reference_month TEXT NOT NULL,
  cost_packaging REAL DEFAULT 0,
  cost_accountant REAL DEFAULT 0,
  cost_prolabore REAL DEFAULT 0,
  cost_employee_salary REAL DEFAULT 0,
  cost_shipping REAL DEFAULT 0,
  cost_rent REAL DEFAULT 0,
  cost_water REAL DEFAULT 0,
  cost_electricity REAL DEFAULT 0,
  cost_internet REAL DEFAULT 0,
  total_expenses REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operational_expenses_user_month ON operational_expenses(user_id, reference_month);
