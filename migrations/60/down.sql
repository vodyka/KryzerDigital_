
-- Remover marketplaces inseridos
DELETE FROM marketplaces WHERE slug IN (
  'shopee', 'mercado-livre', 'shein', 'amazon', 'aliexpress', 
  'magazine-luiza', 'americanas', 'casas-bahia'
);
