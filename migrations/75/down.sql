
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS'
AND name IN ('INSS Retido sobre Pagamentos', 'IRPJ Retido sobre Pagamentos', 'COFINS Retido sobre Pagamentos', 'PIS Retido sobre Pagamentos', 'ISS Retido sobre Pagamentos', 'Outras Retenções sobre Pagamentos');
