
-- Remove user_id columns
ALTER TABLE spreadsheet_history DROP COLUMN user_id;
ALTER TABLE spreadsheet_data DROP COLUMN user_id;
