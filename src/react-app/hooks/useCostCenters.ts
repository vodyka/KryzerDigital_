import { useState, useEffect } from 'react';

export interface CostCenter {
  id: string;
  name: string;
}

// Predefined cost centers - can be expanded or made dynamic later
const DEFAULT_COST_CENTERS: CostCenter[] = [
  { id: 'administrativo', name: 'Administrativo' },
  { id: 'vendas', name: 'Vendas' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'operacional', name: 'Operacional' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'ti', name: 'TI / Tecnologia' },
  { id: 'rh', name: 'Recursos Humanos' },
  { id: 'producao', name: 'Produção' },
  { id: 'logistica', name: 'Logística' },
];

export function useCostCenters() {
  const [costCenters] = useState<CostCenter[]>(DEFAULT_COST_CENTERS);
  const [loading, setLoading] = useState(false);

  // In the future, this could load from an API
  useEffect(() => {
    setLoading(false);
  }, []);

  return { costCenters, loading };
}
