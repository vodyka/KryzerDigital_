
-- Add user_id to spreadsheet_data and spreadsheet_history
ALTER TABLE spreadsheet_data ADD COLUMN user_id INTEGER;
ALTER TABLE spreadsheet_history ADD COLUMN user_id INTEGER;

-- Assign all existing data to user 14558 (Thales)
UPDATE spreadsheet_data SET user_id = 14558 WHERE user_id IS NULL;
UPDATE spreadsheet_history SET user_id = 14558 WHERE user_id IS NULL;
