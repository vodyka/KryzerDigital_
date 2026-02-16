
ALTER TABLE integrations_marketplace ADD COLUMN access_token_expires_at DATETIME;

ALTER TABLE integrations_marketplace ADD COLUMN connected_at DATETIME;

UPDATE integrations_marketplace
SET connected_at = COALESCE(connected_at, updated_at, created_at)
WHERE connected_at IS NULL;

UPDATE integrations_marketplace
SET expires_at = datetime('now', '+365 days')
WHERE expires_at IS NULL;

UPDATE integrations_marketplace
SET access_token_expires_at = COALESCE(access_token_expires_at, datetime('now', '+6 hours'))
WHERE access_token_expires_at IS NULL;
