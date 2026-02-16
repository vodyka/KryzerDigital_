
ALTER TABLE bank_accounts ADD COLUMN is_default BOOLEAN DEFAULT 0;
ALTER TABLE bank_accounts ADD COLUMN current_balance REAL DEFAULT 0;

UPDATE bank_accounts SET current_balance = initial_balance;
