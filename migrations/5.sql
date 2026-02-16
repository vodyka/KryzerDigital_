
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  person_type TEXT NOT NULL,
  cpf TEXT,
  name TEXT,
  cnpj TEXT,
  company_name TEXT,
  trade_name TEXT,
  municipal_registration TEXT,
  state_registration TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  address_cep TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_state TEXT,
  address_city TEXT,
  portal_password TEXT,
  portal_id TEXT UNIQUE,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_user_id ON suppliers(user_id);
CREATE INDEX idx_suppliers_portal_id ON suppliers(portal_id);
CREATE INDEX idx_suppliers_cpf ON suppliers(cpf);
CREATE INDEX idx_suppliers_cnpj ON suppliers(cnpj);
