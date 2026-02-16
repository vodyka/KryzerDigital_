
-- Adicionar colunas product_id e is_deleted
ALTER TABLE products ADD COLUMN product_id INTEGER;
ALTER TABLE products ADD COLUMN is_deleted BOOLEAN DEFAULT 0;

-- Criar tabela para controlar a sequência de IDs
CREATE TABLE product_id_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  next_id INTEGER NOT NULL DEFAULT 10000,
  CHECK (id = 1)
);

-- Inserir valor inicial
INSERT INTO product_id_sequence (next_id) VALUES (10000);

CREATE INDEX idx_products_product_id ON products(product_id);
CREATE INDEX idx_products_is_deleted ON products(is_deleted);
