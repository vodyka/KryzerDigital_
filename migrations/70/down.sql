
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'CUSTOS OPERACIONAIS'
AND name IN ('Compras de fornecedores', 'Custo serviço prestado', 'Custos produto vendido', 'Impostos sobre receita', 'INSS Retido sobre a Receita', 'Outras Retenções sobre a Receita');
