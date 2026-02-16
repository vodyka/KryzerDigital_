import { useState, useEffect } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";

interface Integration {
  id: number;
  marketplace: string;
  site: string;
  store_name: string;
  status: string;
}

export function useMarketplaceIntegrations() {
  const { selectedCompany } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedCompany?.id) {
      setLoading(false);
      return;
    }

    const fetchIntegrations = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Buscar integrações do Mercado Livre
        const mlResponse = await fetch(
          `/api/integrations/mercadolivre/list?companyId=${selectedCompany.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (mlResponse.ok) {
          const mlData = await mlResponse.json();
          const activeIntegrations = (mlData.integrations || []).filter(
            (i: Integration) => i.status === "active"
          );
          setIntegrations(activeIntegrations);
        }
      } catch (error) {
        console.error("Erro ao buscar integrações:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchIntegrations();
  }, [selectedCompany?.id]);

  return { integrations, loading };
}
