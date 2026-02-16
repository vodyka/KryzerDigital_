ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;

UPDATE users SET is_admin = 1 WHERE email = 'thalesocintra@gmail.com';