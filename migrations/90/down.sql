
DROP INDEX idx_accounts_payable_parent_id;

ALTER TABLE accounts_payable DROP COLUMN total_installments;
ALTER TABLE accounts_payable DROP COLUMN installment_number;
ALTER TABLE accounts_payable DROP COLUMN parent_id;
