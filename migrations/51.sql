
-- Criar nova tabela para histórico de planilhas (até 36 meses)
CREATE TABLE spreadsheet_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month_year TEXT NOT NULL UNIQUE,
  month_label TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_complete BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para busca rápida
CREATE INDEX idx_spreadsheet_history_month_year ON spreadsheet_history(month_year);

-- Migrar dados existentes dos slots para o histórico
INSERT INTO spreadsheet_history (month_year, month_label, uploaded_at)
SELECT 
  CASE 
    WHEN month_label LIKE '%/%' THEN 
      substr(month_label, instr(month_label, '/') + 1, 4) || '-' || 
      CASE substr(month_label, 1, instr(month_label, '/') - 1)
        WHEN 'Jan' THEN '01'
        WHEN 'Fev' THEN '02'
        WHEN 'Mar' THEN '03'
        WHEN 'Abr' THEN '04'
        WHEN 'Mai' THEN '05'
        WHEN 'Jun' THEN '06'
        WHEN 'Jul' THEN '07'
        WHEN 'Ago' THEN '08'
        WHEN 'Set' THEN '09'
        WHEN 'Out' THEN '10'
        WHEN 'Nov' THEN '11'
        WHEN 'Dez' THEN '12'
      END
    ELSE month_label
  END as month_year,
  month_label,
  uploaded_at
FROM spreadsheet_slots
WHERE month_label IS NOT NULL;

-- Alterar spreadsheet_data para usar month_year ao invés de slot_number
ALTER TABLE spreadsheet_data ADD COLUMN month_year TEXT;

-- Migrar dados de spreadsheet_data
UPDATE spreadsheet_data
SET month_year = (
  SELECT CASE 
    WHEN ss.month_label LIKE '%/%' THEN 
      substr(ss.month_label, instr(ss.month_label, '/') + 1, 4) || '-' || 
      CASE substr(ss.month_label, 1, instr(ss.month_label, '/') - 1)
        WHEN 'Jan' THEN '01'
        WHEN 'Fev' THEN '02'
        WHEN 'Mar' THEN '03'
        WHEN 'Abr' THEN '04'
        WHEN 'Mai' THEN '05'
        WHEN 'Jun' THEN '06'
        WHEN 'Jul' THEN '07'
        WHEN 'Ago' THEN '08'
        WHEN 'Set' THEN '09'
        WHEN 'Out' THEN '10'
        WHEN 'Nov' THEN '11'
        WHEN 'Dez' THEN '12'
      END
    ELSE ss.month_label
  END
  FROM spreadsheet_slots ss
  WHERE ss.slot_number = spreadsheet_data.slot_number
);

-- Criar índice na nova coluna
CREATE INDEX idx_spreadsheet_data_month_year ON spreadsheet_data(month_year);
