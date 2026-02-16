
-- Revert user 2445148689 back to 14558
UPDATE users SET id = 14558 WHERE id = 2445148689;

UPDATE products SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE spreadsheet_data SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE suppliers SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE orders SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE accounts_payable SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE accounts_receivable SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE payment_records SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE bank_accounts SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE admin_notifications SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE operational_expenses SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE product_groups SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE variation_colors SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE variation_sizes SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE ean_config SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE spreadsheet_history SET user_id = 14558 WHERE user_id = 2445148689;
UPDATE activity_logs SET user_id = '14558' WHERE user_id = '2445148689';

UPDATE sqlite_sequence SET seq = 14558 WHERE name = 'users';
