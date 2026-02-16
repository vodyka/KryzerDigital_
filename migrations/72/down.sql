
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS'
AND name IN ('Aluguel e condomínio', 'Descontos Recebidos', 'Juros Pagos', 'Luz, água e outros', 'Material de escritório', 'Multas Pagas');
