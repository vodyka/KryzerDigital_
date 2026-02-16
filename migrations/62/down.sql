
-- Revert user ID back to original
UPDATE users SET id = 14558 WHERE id = 2445148686;

-- Revert all related tables
UPDATE products SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE spreadsheet_data SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE suppliers SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE orders SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE accounts_payable SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE accounts_receivable SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE payment_records SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE bank_accounts SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE admin_notifications SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE operational_expenses SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE product_groups SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE variation_colors SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE variation_sizes SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE ean_config SET user_id = 14558 WHERE user_id = 2445148686;
UPDATE spreadsheet_history SET user_id = 14558 WHERE user_id = 2445148686;

-- Revert sequence
UPDATE sqlite_sequence SET seq = 14558 WHERE name = 'users';
