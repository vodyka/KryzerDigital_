
-- Add group_type column to product_groups table
ALTER TABLE product_groups ADD COLUMN group_type TEXT DEFAULT 'variacao';
