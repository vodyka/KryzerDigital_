
-- Adicionar campo is_paid na tabela accounts_receivable
ALTER TABLE accounts_receivable ADD COLUMN is_paid BOOLEAN DEFAULT 0;

-- Marcar todos os recebimentos existentes como pagos (comportamento anterior)
UPDATE accounts_receivable SET is_paid = 1;
