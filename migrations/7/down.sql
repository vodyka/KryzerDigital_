
UPDATE users SET id = 1 WHERE id = 14558;

UPDATE suppliers SET user_id = 1 WHERE user_id = 14558;

UPDATE activity_logs SET user_id = '1' WHERE user_id = '14558';

UPDATE suppliers SET id = 1, portal_id = '1-' || COALESCE(cnpj, cpf) WHERE id = 210101;

UPDATE sqlite_sequence SET seq = 1 WHERE name = 'users';

UPDATE sqlite_sequence SET seq = 1 WHERE name = 'suppliers';
