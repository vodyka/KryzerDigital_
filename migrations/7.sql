
UPDATE users SET id = 14558 WHERE id = 1;

UPDATE suppliers SET user_id = 14558 WHERE user_id = 1;

UPDATE activity_logs SET user_id = '14558' WHERE user_id = '1';

UPDATE suppliers SET id = 210101, portal_id = '14558-' || COALESCE(cnpj, cpf) WHERE id = 1;

UPDATE sqlite_sequence SET seq = 14558 WHERE name = 'users';

INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('suppliers', 210101);
