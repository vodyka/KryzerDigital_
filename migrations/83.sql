
-- Add new fields to contacts table
ALTER TABLE contacts ADD COLUMN person_type TEXT;
ALTER TABLE contacts ADD COLUMN cnpj TEXT;
ALTER TABLE contacts ADD COLUMN razao_social TEXT;
ALTER TABLE contacts ADD COLUMN nome_fantasia TEXT;
ALTER TABLE contacts ADD COLUMN inscricao_municipal TEXT;
ALTER TABLE contacts ADD COLUMN inscricao_estadual TEXT;
ALTER TABLE contacts ADD COLUMN contact_person TEXT;
ALTER TABLE contacts ADD COLUMN website TEXT;
ALTER TABLE contacts ADD COLUMN bank_name TEXT;
ALTER TABLE contacts ADD COLUMN bank_agency TEXT;
ALTER TABLE contacts ADD COLUMN bank_account TEXT;
ALTER TABLE contacts ADD COLUMN bank_account_digit TEXT;
ALTER TABLE contacts ADD COLUMN pix_key TEXT;
