
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS'
AND name IN ('Pagamento de INSS Retido', 'Pagamento de IRPJ Retido', 'Pagamento de Outras retenções', 'Pagamento de ISS Retido', 'Pagamento de PIS Retido', 'CSLL Retido sobre Pagamentos');
