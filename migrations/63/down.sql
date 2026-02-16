-- Revert users back to original IDs
UPDATE users SET id = 1 WHERE id = 2445148686;
UPDATE users SET id = 2 WHERE id = 2445148687;
UPDATE users SET id = 3 WHERE id = 2445148688;

-- Revert all related tables for user 2445148686 -> 1
UPDATE products SET user_id = 1 WHERE user_id = 2445148686;
UPDATE spreadsheet_data SET user_id = 1 WHERE user_id = 2445148686;
UPDATE suppliers SET user_id = 1 WHERE user_id = 2445148686;
UPDATE orders SET user_id = 1 WHERE user_id = 2445148686;
UPDATE accounts_payable SET user_id = 1 WHERE user_id = 2445148686;
UPDATE accounts_receivable SET user_id = 1 WHERE user_id = 2445148686;
UPDATE payment_records SET user_id = 1 WHERE user_id = 2445148686;
UPDATE bank_accounts SET user_id = 1 WHERE user_id = 2445148686;
UPDATE admin_notifications SET user_id = 1 WHERE user_id = 2445148686;
UPDATE operational_expenses SET user_id = 1 WHERE user_id = 2445148686;
UPDATE product_groups SET user_id = 1 WHERE user_id = 2445148686;
UPDATE variation_colors SET user_id = 1 WHERE user_id = 2445148686;
UPDATE variation_sizes SET user_id = 1 WHERE user_id = 2445148686;
UPDATE ean_config SET user_id = 1 WHERE user_id = 2445148686;
UPDATE spreadsheet_history SET user_id = 1 WHERE user_id = 2445148686;

-- Revert all related tables for user 2445148687 -> 2
UPDATE products SET user_id = 2 WHERE user_id = 2445148687;
UPDATE spreadsheet_data SET user_id = 2 WHERE user_id = 2445148687;
UPDATE suppliers SET user_id = 2 WHERE user_id = 2445148687;
UPDATE orders SET user_id = 2 WHERE user_id = 2445148687;
UPDATE accounts_payable SET user_id = 2 WHERE user_id = 2445148687;
UPDATE accounts_receivable SET user_id = 2 WHERE user_id = 2445148687;
UPDATE payment_records SET user_id = 2 WHERE user_id = 2445148687;
UPDATE bank_accounts SET user_id = 2 WHERE user_id = 2445148687;
UPDATE admin_notifications SET user_id = 2 WHERE user_id = 2445148687;
UPDATE operational_expenses SET user_id = 2 WHERE user_id = 2445148687;
UPDATE product_groups SET user_id = 2 WHERE user_id = 2445148687;
UPDATE variation_colors SET user_id = 2 WHERE user_id = 2445148687;
UPDATE variation_sizes SET user_id = 2 WHERE user_id = 2445148687;
UPDATE ean_config SET user_id = 2 WHERE user_id = 2445148687;
UPDATE spreadsheet_history SET user_id = 2 WHERE user_id = 2445148687;

-- Revert all related tables for user 2445148688 -> 3
UPDATE products SET user_id = 3 WHERE user_id = 2445148688;
UPDATE spreadsheet_data SET user_id = 3 WHERE user_id = 2445148688;
UPDATE suppliers SET user_id = 3 WHERE user_id = 2445148688;
UPDATE orders SET user_id = 3 WHERE user_id = 2445148688;
UPDATE accounts_payable SET user_id = 3 WHERE user_id = 2445148688;
UPDATE accounts_receivable SET user_id = 3 WHERE user_id = 2445148688;
UPDATE payment_records SET user_id = 3 WHERE user_id = 2445148688;
UPDATE bank_accounts SET user_id = 3 WHERE user_id = 2445148688;
UPDATE admin_notifications SET user_id = 3 WHERE user_id = 2445148688;
UPDATE operational_expenses SET user_id = 3 WHERE user_id = 2445148688;
UPDATE product_groups SET user_id = 3 WHERE user_id = 2445148688;
UPDATE variation_colors SET user_id = 3 WHERE user_id = 2445148688;
UPDATE variation_sizes SET user_id = 3 WHERE user_id = 2445148688;
UPDATE ean_config SET user_id = 3 WHERE user_id = 2445148688;
UPDATE spreadsheet_history SET user_id = 3 WHERE user_id = 2445148688;

-- Revert sequence
UPDATE sqlite_sequence SET seq = 3 WHERE name = 'users';