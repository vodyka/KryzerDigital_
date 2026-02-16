
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'ATIVIDADES DE INVESTIMENTO'
AND name IN ('Compra de ativo fixo', 'Venda de ativo fixo');
