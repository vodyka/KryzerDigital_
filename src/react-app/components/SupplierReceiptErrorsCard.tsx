import { useEffect, useState } from "react";
import { AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Badge } from "@/react-app/components/ui/badge";

interface ReceiptError {
  id: number;
  order_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  quantity: number;
  error_reason: string;
  order_number: string;
  order_date: string;
  created_at: string;
}

interface SupplierReceiptErrorsCardProps {
  supplierId: number;
}

export default function SupplierReceiptErrorsCard({ supplierId }: SupplierReceiptErrorsCardProps) {
  const [errors, setErrors] = useState<ReceiptError[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supplierId) {
      loadErrors();
    }
  }, [supplierId]);

  const loadErrors = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/receipt-errors/by-supplier/${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors || []);
      }
    } catch (error) {
      console.error("Error loading receipt errors:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case "Tamanho não solicitado":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "Modelo não solicitado":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "Estampa não solicitada":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Últimos Erros de Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (errors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Últimos Erros de Recebimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nenhum erro registrado nos últimos recebimentos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Últimos Erros de Recebimento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {errors.slice(0, 10).map((error) => (
            <div
              key={error.id}
              className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {error.product_name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    SKU: {error.sku}
                  </p>
                </div>
                <Badge className={getReasonColor(error.error_reason)}>
                  {error.error_reason}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>
                  Pedido: <span className="font-mono">{error.order_number}</span>
                </span>
                <span>Qtd: {error.quantity}</span>
                <span>{formatDate(error.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
