
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS'
AND name IN ('Outras despesas', 'Salários, encargos e benefícios', 'Serviços contratados', 'Taxas e contribuições', 'Pagamento de CSLL Retido', 'Pagamento de Cofins Retido');
