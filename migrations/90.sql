
ALTER TABLE accounts_payable ADD COLUMN parent_id INTEGER;
ALTER TABLE accounts_payable ADD COLUMN installment_number INTEGER;
ALTER TABLE accounts_payable ADD COLUMN total_installments INTEGER;

CREATE INDEX idx_accounts_payable_parent_id ON accounts_payable(parent_id);
