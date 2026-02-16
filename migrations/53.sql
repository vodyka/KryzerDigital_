
-- Add grouped_order_number to accounts_payable
ALTER TABLE accounts_payable ADD COLUMN grouped_order_number TEXT;

-- Create sequence table for grouped order numbers
CREATE TABLE grouped_order_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  next_number INTEGER NOT NULL DEFAULT 55001,
  CHECK (id = 1)
);

-- Initialize the sequence
INSERT INTO grouped_order_sequence (id, next_number) VALUES (1, 55001);
