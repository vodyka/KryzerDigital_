
-- Reset the sequence to prevent large ID generation
UPDATE sqlite_sequence SET seq = 14558 WHERE name = 'users';

-- Ensure AUTOINCREMENT is working correctly by recreating the sequence if needed
DELETE FROM sqlite_sequence WHERE name = 'users';
INSERT INTO sqlite_sequence (name, seq) VALUES ('users', 14558);
