
ALTER TABLE accounts_payable ADD COLUMN competence_date DATE;
ALTER TABLE accounts_payable ADD COLUMN description TEXT;
ALTER TABLE accounts_payable ADD COLUMN category_id INTEGER;
ALTER TABLE accounts_payable ADD COLUMN cost_center TEXT;

INSERT INTO accounts_payable (user_id, supplier_id, due_date, competence_date, description, amount) VALUES
(1, 1, '2025-10-04', '2025-10-04', 'Compras de fornecedores', -924.00),
(1, 1, '2025-10-04', '2025-10-04', 'Compras de fornecedores', -835.92),
(1, 1, '2025-10-11', '2025-10-11', 'Compras de fornecedores', -1054.33),
(1, 1, '2025-10-28', '2025-10-28', 'Compras de fornecedores', -308.50),
(1, 2, '2025-10-29', '2025-10-29', 'Compras de fornecedores', -1616.61),
(1, 1, '2025-11-04', '2025-11-04', 'Compras de fornecedores', -308.50),
(1, 3, '2025-11-05', '2025-11-05', 'Compras de fornecedores', -1684.00),
(1, 2, '2025-11-06', '2025-10-22', 'Compras de fornecedores', -1694.43),
(1, 4, '2025-11-10', '2025-11-10', 'Pagamento de empréstimo', -2664.67),
(1, 1, '2025-11-10', '2025-11-10', 'Compras de fornecedores', -1054.33),
(1, 1, '2025-11-11', '2025-11-11', 'Compras de fornecedores', -308.50),
(1, 3, '2025-11-18', '2025-09-24', 'Compras de fornecedores', -5110.00),
(1, 1, '2025-11-18', '2025-11-18', 'Compras de fornecedores', -308.50),
(1, 2, '2025-11-21', '2025-10-22', 'Compras de fornecedores', -1694.43),
(1, 1, '2025-11-25', '2025-11-25', 'Compras de fornecedores', -308.50),
(1, 1, '2025-12-02', '2025-12-02', 'Compras de fornecedores', -308.50),
(1, 2, '2025-12-08', '2025-10-22', 'Compras de fornecedores', -1694.43),
(1, 1, '2025-12-09', '2025-12-09', 'Compras de fornecedores', -308.50),
(1, 4, '2025-12-10', '2025-11-10', 'Pagamento de empréstimo', -2664.67),
(1, 3, '2025-12-13', '2025-09-24', 'Compras de fornecedores', -5110.00),
(1, 1, '2025-12-16', '2025-12-16', 'Compras de fornecedores', -308.50),
(1, 2, '2025-12-22', '2025-10-22', 'Compras de fornecedores', -1694.43),
(1, 1, '2025-12-23', '2025-12-23', 'Compras de fornecedores', -308.50),
(1, 1, '2025-12-30', '2025-12-30', 'Compras de fornecedores', -308.50),
(1, 2, '2026-01-05', '2025-10-22', 'Compras de fornecedores', -1694.43),
(1, 1, '2026-01-06', '2026-01-06', 'Compras de fornecedores', -308.50),
(1, 3, '2026-01-07', '2025-09-24', 'Compras de fornecedores', -5110.00),
(1, 4, '2026-01-10', '2025-11-10', 'Pagamento de empréstimo', -2664.67),
(1, 1, '2026-01-13', '2026-01-13', 'Compras de fornecedores', -308.50);

UPDATE suppliers SET company_name = 'REAL MOTO PECAS LTDA' WHERE id = 1;
UPDATE suppliers SET company_name = 'CIA BRASILEIRA DIST SA' WHERE id = 2;
UPDATE suppliers SET company_name = 'VCJ INJETAVEIS LTDA' WHERE id = 3;

INSERT INTO suppliers (user_id, person_type, cnpj, company_name, trade_name, status)
VALUES (1, 'Jurídica', '90400888000142', 'SANTANDER SA', 'Santander', 'Ativo')
ON CONFLICT DO NOTHING;
