
CREATE TABLE marketplaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collection_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  complement TEXT,
  city TEXT,
  state TEXT,
  photo_url TEXT,
  accepts_returns BOOLEAN DEFAULT 0,
  accepts_orders BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  accepts_uber_delivery BOOLEAN DEFAULT 0,
  sells_shipping_supplies BOOLEAN DEFAULT 0,
  provides_resale_merchandise BOOLEAN DEFAULT 0,
  accepts_after_hours BOOLEAN DEFAULT 0,
  whatsapp_number TEXT,
  owner_email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collection_point_marketplaces (
  collection_point_id INTEGER NOT NULL,
  marketplace_id INTEGER NOT NULL,
  accepts_after_hours BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_point_id, marketplace_id)
);

CREATE TABLE collection_point_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_point_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  opening_time TEXT,
  closing_time TEXT,
  is_closed BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE collection_point_marketplace_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_point_id INTEGER NOT NULL,
  marketplace_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  opening_time TEXT,
  closing_time TEXT,
  is_closed BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE admin_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  system_logo TEXT,
  login_logo TEXT,
  theme_primary_color TEXT DEFAULT '#3b82f6',
  theme_secondary_color TEXT DEFAULT '#6366f1',
  theme_background_from TEXT DEFAULT '#f8fafc',
  theme_background_via TEXT DEFAULT '#dbeafe',
  theme_background_to TEXT DEFAULT '#e0e7ff',
  uber_icon TEXT,
  whatsapp_icon TEXT,
  shipping_supplies_icon TEXT,
  resale_merchandise_icon TEXT,
  after_hours_icon TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1)
);

CREATE TABLE banner_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  banner_image TEXT,
  banner_title TEXT DEFAULT '',
  banner_subtitle TEXT DEFAULT '',
  banner_button_text TEXT DEFAULT '',
  banner_button_link TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (id = 1)
);

INSERT INTO admin_settings (id) VALUES (1);
INSERT INTO banner_settings (id) VALUES (1);
