
CREATE TABLE menu_visibility (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_path TEXT NOT NULL UNIQUE,
  menu_label TEXT NOT NULL,
  visibility_type TEXT NOT NULL,
  hidden_for_user_ids TEXT,
  hidden_for_levels TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_visibility_path ON menu_visibility(menu_path);
