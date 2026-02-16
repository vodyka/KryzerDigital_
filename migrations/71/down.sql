
DELETE FROM categories 
WHERE is_native = 1 
AND group_name = 'CUSTOS OPERACIONAIS'
AND name IN ('CSLL Retido sobre a Receita', 'ISS Retido sobre a Receita', 'PIS Retido sobre a Receita', 'IRPJ Retido sobre a Receita', 'COFINS Retido sobre a Receita', 'Compras - Embalagens', 'Frete sobre Compras');
