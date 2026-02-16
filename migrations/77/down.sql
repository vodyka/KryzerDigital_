
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'ATIVIDADES DE FINANCIAMENTO'
AND name IN ('Aporte de capital', 'Obtenção de empréstimo', 'Pagamento de empréstimo', 'Retirada de capital');
