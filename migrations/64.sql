
-- Update remaining users with old IDs (< 2445148686) to new sequential IDs
-- Get the current highest user ID to continue the sequence

-- Store the starting ID for new assignments
-- Starting from 2445148689 (after the 3 users we already migrated)

-- Update each old user ID one by one
-- First, update user_id = 14558 (the one having issues)

-- Update all tables for user 14558 -> 2445148689
UPDATE products SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE spreadsheet_data SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE suppliers SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE orders SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE accounts_payable SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE accounts_receivable SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE payment_records SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE bank_accounts SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE admin_notifications SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE operational_expenses SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE product_groups SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE variation_colors SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE variation_sizes SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE ean_config SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE spreadsheet_history SET user_id = 2445148689 WHERE user_id = 14558;
UPDATE activity_logs SET user_id = '2445148689' WHERE user_id = '14558';

-- Now update the user itself
UPDATE users SET id = 2445148689 WHERE id = 14558;

-- Update the sequence
UPDATE sqlite_sequence SET seq = 2445148689 WHERE name = 'users';
