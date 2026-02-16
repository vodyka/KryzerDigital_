import { useEffect, useState } from "react";
import {
  Calendar,
  Package,
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Badge } from "@/react-app/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/react-app/components/ui/collapsible";
import { Button } from "@/react-app/components/ui/button";
import ProductImageHover from "@/react-app/components/ProductImageHover";

interface Order {
  id: number;
  order_number: string;
  order_date: string;
  expected_delivery_date: string | null;
  delivery_date: string | null;
  status: string;
  total_amount: number;
  has_error_items?: number;
  items: Array<{
    product_name: string;
    sku: string;
    quantity?: number;
    quantity_ordered?: number;
    quantity_received?: number;
    unit_price: number;
    total_price: number;
    image_url: string | null;
    error_reason?: string;
  }>;
}

const statusConfig: Record<string, {
  label: string;
  icon: any;
  color: string;
}> = {
  Pendente: {
    label: "Pendente",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  Produção: {
    label: "Produção",
    icon: Package,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  Trânsito: {
    label: "Trânsito",
    icon: Truck,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  Completo: {
    label: "Completo",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  Cancelado: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

export default function SupplierPortalOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    if (token) {
      loadOrders(token);
    }
  }, []);

  const loadOrders = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/portal/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (orderId: number) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não definida";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-primary mx-auto mb-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Meus Pedidos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visualize e acompanhe todos os pedidos realizados
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">
                Nenhum pedido encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                Você ainda não possui pedidos registrados no sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const config = statusConfig[order.status] || statusConfig.Pendente;
            const StatusIcon = config.icon;

            return (
              <Card key={order.id} className={order.has_error_items === 1 ? "border-l-2 border-l-orange-500" : ""}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleOrder(order.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className={`cursor-pointer transition-colors py-3 px-4 ${order.has_error_items === 1 ? "bg-orange-50/50 dark:bg-orange-900/10 hover:bg-orange-50 dark:hover:bg-orange-900/20" : "hover:bg-muted/50"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            {order.status === "Completo" ? (
                              <div className="w-9 h-9 rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center relative">
                                <div className="absolute inset-0 rounded-md border-2 border-green-500 dark:border-green-400"></div>
                                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <CardTitle className="text-sm font-semibold text-foreground">
                                #{order.order_number}
                              </CardTitle>
                              <Badge className={`${config.color} text-xs px-2 py-0`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
                              {order.has_error_items === 1 && (
                                <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 text-xs px-2 py-0">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Itens Incorretos
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(order.order_date)}</span>
                              </div>
                              {order.expected_delivery_date && (
                                <div className="flex items-center gap-1">
                                  <Truck className="w-3 h-3" />
                                  <span>Prev: {formatDate(order.expected_delivery_date)}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1 font-semibold text-primary">
                                <DollarSign className="w-3 h-3" />
                                <span>{formatCurrency(order.total_amount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="flex-shrink-0 h-7 w-7 p-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-3">
                      <div className="border-t border-border pt-3">
                        <h4 className="text-xs font-semibold text-foreground mb-2">
                          Itens do Pedido
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground w-12">
                                  Imagem
                                </th>
                                <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">
                                  Produto
                                </th>
                                <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">
                                  SKU
                                </th>
                                <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">
                                  {order.status === "Completo" ? "Qtd Recebida" : "Qtd"}
                                </th>
                                <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">
                                  Preço Unit.
                                </th>
                                <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">
                                  Total
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, index) => {
                                const isComplete = order.status === "Completo";
                                const qtyReceived = item.quantity_received ?? item.quantity ?? 0;
                                const qtyOrdered = item.quantity_ordered ?? item.quantity ?? 0;
                                const notReceived = isComplete && qtyReceived === 0 && qtyOrdered > 0;
                                const errorItem = isComplete && item.error_reason;

                                return (
                                  <tr
                                    key={index}
                                    className={`border-b border-border/50 last:border-0 transition-colors ${
                                      notReceived
                                        ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30"
                                        : errorItem
                                        ? "bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30"
                                        : "hover:bg-muted/50"
                                    }`}
                                  >
                                    <td className="py-1.5 px-2">
                                      <ProductImageHover
                                        imageUrl={item.image_url}
                                        productName={item.product_name}
                                        size="sm"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <div className="text-foreground">{item.product_name}</div>
                                      {notReceived && (
                                        <div className="text-xs text-red-600 dark:text-red-400 font-semibold mt-0.5">
                                          Não veio no pedido
                                        </div>
                                      )}
                                      {errorItem && (
                                        <div className="text-xs text-orange-600 dark:text-orange-400 font-semibold mt-0.5">
                                          {item.error_reason === "Solicitação para acrescentar"
                                            ? "Item acrescentado"
                                            : "Recebimento incorreto"}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-2 text-muted-foreground font-mono">
                                      {item.sku}
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                      {isComplete ? (
                                        <div>
                                          <div className={notReceived ? "text-red-600 dark:text-red-400 font-semibold" : "text-foreground"}>
                                            {qtyReceived}
                                          </div>
                                          {qtyOrdered !== qtyReceived && qtyOrdered > 0 && (
                                            <div className="text-xs text-muted-foreground">
                                              Pedido: {qtyOrdered}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-foreground">{item.quantity}</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-2 text-right text-muted-foreground">
                                      {formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-semibold">
                                      <span className={notReceived ? "text-red-600 dark:text-red-400" : "text-foreground"}>
                                        {formatCurrency(item.total_price)}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-border">
                                <td
                                  colSpan={5}
                                  className="py-2 px-2 font-semibold text-right text-foreground"
                                >
                                  Total do Pedido:
                                </td>
                                <td className="py-2 px-2 font-bold text-right text-primary">
                                  {formatCurrency(order.total_amount)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
