import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card } from "@/react-app/components/ui/card";
import { useNavigate } from "react-router";

interface ExpiredIntegration {
  id: string;
  marketplace: string;
  store_name: string;
  nickname: string;
  expires_at: string;
}

export default function ExpiredIntegrationsAlert() {
  const [expiredIntegrations, setExpiredIntegrations] = useState<ExpiredIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpiredIntegrations();
  }, []);

  async function fetchExpiredIntegrations() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const companyId = localStorage.getItem("selectedCompanyId");
      if (!companyId) return;

      const response = await fetch(
        `/api/integrations/mercadolivre/list?companyId=${companyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      const now = new Date();

      // Filtra integrações expiradas
      const expired = (data.integrations || []).filter((integration: any) => {
        const expiresAt = new Date(integration.expires_at);
        return expiresAt < now;
      });

      setExpiredIntegrations(expired);
    } catch (error) {
      console.error("Error fetching expired integrations:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || expiredIntegrations.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-500/50 bg-orange-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="font-semibold text-orange-900 dark:text-orange-100">
              {expiredIntegrations.length === 1
                ? "Integração Expirada"
                : `${expiredIntegrations.length} Integrações Expiradas`}
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              {expiredIntegrations.length === 1
                ? "Uma integração do Mercado Livre expirou e precisa ser reconectada."
                : "Algumas integrações do Mercado Livre expiraram e precisam ser reconectadas."}
            </p>
          </div>
          <ul className="space-y-1 text-sm">
            {expiredIntegrations.map((integration) => (
              <li
                key={integration.id}
                className="text-orange-700 dark:text-orange-300 flex items-center gap-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                {integration.nickname || integration.store_name || "Loja"}
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="outline"
            className="border-orange-600 text-orange-600 hover:bg-orange-500/20"
            onClick={() => navigate("/configuracoes/integracoes")}
          >
            Reconectar Agora
          </Button>
        </div>
      </div>
    </Card>
  );
}
