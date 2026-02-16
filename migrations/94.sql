
CREATE TABLE marketplace_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  company_id INTEGER NOT NULL,
  integration_id INTEGER NOT NULL,
  listing_id TEXT NOT NULL,
  sku TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  price REAL NOT NULL,
  original_price REAL,
  available_quantity INTEGER NOT NULL,
  sold_quantity INTEGER NOT NULL,
  thumbnail TEXT,
  permalink TEXT,
  status TEXT NOT NULL,
  listing_type TEXT,
  category_id TEXT,
  category_name TEXT,
  free_shipping BOOLEAN,
  logistic_type TEXT,
  health REAL,
  store_name TEXT,
  listing_created_at TEXT,
  listing_updated_at TEXT,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_listings_user_company ON marketplace_listings(user_id, company_id);
CREATE INDEX idx_marketplace_listings_listing_id ON marketplace_listings(listing_id);
CREATE INDEX idx_marketplace_listings_integration ON marketplace_listings(integration_id);
CREATE UNIQUE INDEX idx_marketplace_listings_unique ON marketplace_listings(company_id, integration_id, listing_id);
