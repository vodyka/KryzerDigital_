
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('cliente', 'funcionario', 'socio')),
  name TEXT NOT NULL,
  document TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_name ON contacts(name);

INSERT INTO contacts (company_id, type, name, document, email, phone, city, state) VALUES
(1, 'cliente', 'Ana Silva Comércio', '12.345.678/0001-90', 'ana@exemplo.com', '(11) 98765-4321', 'São Paulo', 'SP'),
(1, 'cliente', 'Carlos Santos Ltda', '23.456.789/0001-01', 'carlos@exemplo.com', '(21) 97654-3210', 'Rio de Janeiro', 'RJ'),
(1, 'cliente', 'Daniela Souza ME', '34.567.890/0001-12', 'daniela@exemplo.com', '(31) 96543-2109', 'Belo Horizonte', 'MG'),
(1, 'cliente', 'Eduardo Costa Serviços', '45.678.901/0001-23', 'eduardo@exemplo.com', '(41) 95432-1098', 'Curitiba', 'PR'),
(1, 'cliente', 'Fernanda Lima Eireli', '56.789.012/0001-34', 'fernanda@exemplo.com', '(51) 94321-0987', 'Porto Alegre', 'RS'),
(1, 'cliente', 'Gabriel Oliveira & Cia', '67.890.123/0001-45', 'gabriel@exemplo.com', '(61) 93210-9876', 'Brasília', 'DF'),
(1, 'cliente', 'Helena Martins Ltda', '78.901.234/0001-56', 'helena@exemplo.com', '(71) 92109-8765', 'Salvador', 'BA'),
(1, 'cliente', 'Igor Pereira ME', '89.012.345/0001-67', 'igor@exemplo.com', '(81) 91098-7654', 'Recife', 'PE'),
(1, 'cliente', 'Julia Alves Comércio', '90.123.456/0001-78', 'julia@exemplo.com', '(85) 90987-6543', 'Fortaleza', 'CE'),
(1, 'cliente', 'Lucas Fernandes Ltda', '01.234.567/0001-89', 'lucas@exemplo.com', '(62) 89876-5432', 'Goiânia', 'GO');
