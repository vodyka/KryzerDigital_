
-- Remover índice
DROP INDEX IF EXISTS idx_spreadsheet_data_month_year;

-- Remover coluna month_year de spreadsheet_data
ALTER TABLE spreadsheet_data DROP COLUMN month_year;

-- Remover índice de spreadsheet_history
DROP INDEX IF EXISTS idx_spreadsheet_history_month_year;

-- Remover tabela spreadsheet_history
DROP TABLE IF EXISTS spreadsheet_history;
