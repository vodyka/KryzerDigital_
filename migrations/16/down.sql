
DELETE FROM suppliers WHERE company_name = 'SANTANDER SA';
DELETE FROM accounts_payable WHERE description IN ('Compras de fornecedores', 'Pagamento de empréstimo');

ALTER TABLE accounts_payable DROP COLUMN cost_center;
ALTER TABLE accounts_payable DROP COLUMN category_id;
ALTER TABLE accounts_payable DROP COLUMN description;
ALTER TABLE accounts_payable DROP COLUMN competence_date;
