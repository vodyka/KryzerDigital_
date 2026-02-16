
-- Update existing user to new ID format
UPDATE users SET id = 2445148686 WHERE id = 14558;

-- Update all related tables that reference user_id
UPDATE products SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE spreadsheet_data SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE suppliers SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE orders SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE accounts_payable SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE accounts_receivable SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE payment_records SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE bank_accounts SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE admin_notifications SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE operational_expenses SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE product_groups SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE variation_colors SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE variation_sizes SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE ean_config SET user_id = 2445148686 WHERE user_id = 14558;
UPDATE spreadsheet_history SET user_id = 2445148686 WHERE user_id = 14558;

-- Reset the sequence to start from 2445148686
UPDATE sqlite_sequence SET seq = 2445148686 WHERE name = 'users';
