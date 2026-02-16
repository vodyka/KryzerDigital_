
CREATE TABLE integrations_marketplace (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  site TEXT,
  store_name TEXT,
  external_store_id TEXT,
  status TEXT DEFAULT 'active',
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integrations_marketplace_company ON integrations_marketplace(company_id, marketplace);
CREATE INDEX idx_integrations_marketplace_external ON integrations_marketplace(company_id, external_store_id);
