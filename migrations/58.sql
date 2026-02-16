
-- Insert or update default marketplaces with public logo URLs
-- Using INSERT OR REPLACE to ensure these marketplaces exist in both dev and prod

-- Shopee
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (1, 'Shopee', 'shopee', 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopee_logo.svg/250px-Shopee_logo.svg.png', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Mercado Livre
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (2, 'Mercado Livre', 'mercado-livre', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/MercadoLibre.svg/250px-MercadoLibre.svg.png', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Shein
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (3, 'Shein', 'shein', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/SHEIN_logo.svg/250px-SHEIN_logo.svg.png', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Kwai
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (4, 'Kwai', 'kwai', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Kwai_logo.svg/250px-Kwai_logo.svg.png', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- TikTok
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (5, 'TikTok', 'tiktok', 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/250px-TikTok_logo.svg.png', 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- J&T
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (6, 'J&T', 'jt', 'https://i.ibb.co/vwTcC3p/jt-express.png', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- JadLog
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (7, 'JadLog', 'jadlog', 'https://i.ibb.co/sgV2Jqr/jadlog.png', 1, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Loggi
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (8, 'Loggi', 'loggi', 'https://i.ibb.co/hWqRhmk/loggi.png', 1, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Temu
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (9, 'Temu', 'temu', 'https://i.ibb.co/mN4LXJP/temu.png', 1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Correios
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (13, 'Correios', 'correios', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Correios_logo.svg/250px-Correios_logo.svg.png', 1, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Total Express
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (10, 'Total Express', 'total-express', 'https://i.ibb.co/k0bkB2h/total-express.png', 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Club Envios
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (11, 'Club Envios', 'club-envios', 'https://i.ibb.co/6WqZZFP/club-envios.png', 1, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Envia Mais
INSERT OR REPLACE INTO marketplaces (id, name, slug, logo_url, is_active, display_order, created_at, updated_at)
VALUES (12, 'Envia Mais', 'envia-mais', 'https://i.ibb.co/9yxnWrL/envia-mais.png', 1, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
