
-- Criar tabela de empresas
CREATE TABLE companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de relacionamento usuário-empresa
CREATE TABLE user_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  is_default BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_companies_user ON user_companies(user_id);
CREATE INDEX idx_user_companies_company ON user_companies(company_id);

-- Criar empresa padrão para cada usuário existente
INSERT INTO companies (name, slug, settings)
SELECT 
  COALESCE(company, name || '''s Company') as name,
  'company-' || id as slug,
  '{}' as settings
FROM users;

-- Associar cada usuário à sua empresa padrão
INSERT INTO user_companies (user_id, company_id, role, is_default)
SELECT 
  u.id as user_id,
  c.id as company_id,
  'owner' as role,
  1 as is_default
FROM users u
JOIN companies c ON c.slug = 'company-' || u.id;
