
-- Remove categorias de RECEITAS OPERACIONAIS
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'RECEITAS OPERACIONAIS'
AND name IN ('Descontos Concedidos', 'Juros Recebidos', 'Multas Recebidas', 'Outras receitas');
