
CREATE TABLE integration_connection_tokens (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integration_connection_tokens_token ON integration_connection_tokens(token);
CREATE INDEX idx_integration_connection_tokens_expires ON integration_connection_tokens(expires_at);
