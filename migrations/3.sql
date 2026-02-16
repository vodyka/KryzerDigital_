
CREATE TABLE spreadsheet_slots (
  slot_number INTEGER PRIMARY KEY,
  month_label TEXT,
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spreadsheet_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot_number INTEGER NOT NULL,
  sku TEXT NOT NULL,
  name TEXT,
  units INTEGER NOT NULL,
  revenue REAL NOT NULL,
  avg_price REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spreadsheet_data_slot ON spreadsheet_data(slot_number);
CREATE INDEX idx_spreadsheet_data_sku ON spreadsheet_data(sku);

CREATE TABLE rotation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rotated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
