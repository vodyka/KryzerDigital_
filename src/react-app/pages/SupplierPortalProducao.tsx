import { useEffect, useState } from "react";
import {
  Calendar,
  Package,
  DollarSign,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Download,
  PowerOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Badge } from "@/react-app/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/react-app/components/ui/collapsible";
import { Button } from "@/react-app/components/ui/button";

interface Order {
  id: number;
  order_number: string;
  order_date: string;
  status: string;
  total_amount: number;
  is_urgent: number;
  items: Array<{
    product_name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    image_url: string | null;
    product_id: number | null;
  }>;
}

export default function SupplierPortalProducao() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [disabledItems, setDisabledItems] = useState<Map<string, boolean>>(new Map());
  const [filterMode, setFilterMode] = useState<"all" | "urgent" | "production">("all");

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    if (token) {
      loadProductionOrders(token);
    }
  }, []);

  useEffect(() => {
    loadAllUnavailableItems();
  }, [orders]);

  const loadProductionOrders = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/portal/orders?status=production", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error loading production orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUnavailableItems = async () => {
    if (orders.length === 0) return;
    
    try {
      const newDisabledMap = new Map<string, boolean>();
      
      const fetchPromises = orders.map(order =>
        fetch(`/api/supplier-unavailable-items/order/${order.id}`)
          .then(response => response.ok ? response.json() : { unavailable_items: [] })
          .then(data => ({ orderId: order.id, items: data.unavailable_items || [] }))
          .catch(() => ({ orderId: order.id, items: [] }))
      );
      
      const results = await Promise.all(fetchPromises);
      
      results.forEach(({ orderId, items }) => {
        items.forEach((item: any) => {
          if (item.is_unavailable === 1) {
            const key = `${orderId}-${item.item_index}`;
            newDisabledMap.set(key, true);
          }
        });
      });
      
      setDisabledItems(newDisabledMap);
    } catch (error) {
      console.error("Error loading unavailable items:", error);
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

  const toggleItemDisabled = async (orderId: number, itemIndex: number) => {
    const key = `${orderId}-${itemIndex}`;
    const currentState = disabledItems.get(key) || false;
    const newState = !currentState;
    
    const token = localStorage.getItem("portal_token");
    const supplierStr = localStorage.getItem("supplier");
    
    if (!token) {
      alert("Sessão expirada. Por favor, faça login novamente.");
      window.location.href = "/portal";
      return;
    }
    
    if (!supplierStr) {
      alert("Erro ao carregar dados do fornecedor. Por favor, faça login novamente.");
      return;
    }
    
    const supplier = JSON.parse(supplierStr);
    
    if (!supplier.id) {
      alert("Erro ao carregar ID do fornecedor. Por favor, faça login novamente.");
      return;
    }
    
    try {
      const response = await fetch("/api/supplier-unavailable-items/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          item_index: itemIndex,
          supplier_id: supplier.id,
          is_unavailable: newState,
        }),
      });
      
      if (!response.ok) {
        alert("Erro ao atualizar status do item. Por favor, tente novamente.");
        return;
      }
      
      setDisabledItems((prev) => {
        const newMap = new Map(prev);
        newMap.set(key, newState);
        return newMap;
      });
      
      if (newState) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const allItemsDisabled = order.items.every((_: any, idx: number) => {
            const itemKey = `${orderId}-${idx}`;
            return idx === itemIndex ? true : disabledItems.get(itemKey);
          });
          
          if (allItemsDisabled) {
            const confirmCancel = window.confirm(
              "Nenhum modelo está disponível para fabricação. O pedido será cancelado automaticamente. Concorda em cancelar?"
            );
            
            if (confirmCancel) {
              await fetch(`/api/portal/orders/${orderId}/cancel`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                },
              });
              
              const currentToken = localStorage.getItem("portal_token");
              if (currentToken) {
                loadProductionOrders(currentToken);
              }
              alert("Pedido cancelado com sucesso.");
            } else {
              setDisabledItems((prev) => {
                const newMap = new Map(prev);
                newMap.set(key, false);
                return newMap;
              });
              
              await fetch("/api/supplier-unavailable-items/toggle", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                  order_id: orderId,
                  item_index: itemIndex,
                  supplier_id: supplier.id,
                  is_unavailable: false,
                }),
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error updating item availability:", error);
    }
  };

  const isItemDisabled = (orderId: number, itemIndex: number) => {
    const key = `${orderId}-${itemIndex}`;
    return disabledItems.get(key) || false;
  };

  const calculateOrderTotals = (order: Order) => {
    let totalAmount = 0;
    let totalQuantity = 0;
    let activeItemsCount = 0;

    order.items.forEach((item, index) => {
      if (!isItemDisabled(order.id, index)) {
        totalAmount += item.total_price;
        totalQuantity += item.quantity;
        activeItemsCount++;
      }
    });

    return { totalAmount, totalQuantity, activeItemsCount };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const handleDownloadPDF = (order: Order) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const { totalAmount } = calculateOrderTotals(order);

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Pedido ${order.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .order-info { margin-bottom: 30px; }
            .order-info table { width: 100%; }
            .order-info td { padding: 5px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .items-table th { background-color: #f4f4f4; font-weight: bold; }
            .items-table .image-cell { width: 80px; }
            .items-table .image-cell img { width: 60px; height: 60px; object-fit: cover; border-radius: 4px; }
            .items-table .text-right { text-align: right; }
            .total-row { background-color: #f9f9f9; font-weight: bold; }
            .urgent-badge { display: inline-block; background-color: #fee; color: #c00; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 10px; }
            .unavailable-row { background-color: #fee; color: #999; }
            .unavailable-badge { display: inline-block; background-color: #c00; color: white; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; }
            .product-sku { font-size: 11px; color: #666; margin-top: 4px; font-family: monospace; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Pedido de Fabricação</h1>
            <h2>#${order.order_number}${order.is_urgent === 1 ? '<span class="urgent-badge">⚠️ URGENTE</span>' : ''}</h2>
          </div>
          <div class="order-info">
            <table>
              <tr><td><strong>Data do Pedido:</strong></td><td>${formatDate(order.order_date)}</td></tr>
              <tr><td><strong>Status:</strong></td><td>Em Produção</td></tr>
              <tr><td><strong>Valor Total:</strong></td><td><strong>${formatCurrency(totalAmount)}</strong></td></tr>
            </table>
          </div>
          <h3>Itens para Fabricação</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th class="image-cell">Imagem</th>
                <th>Produto</th>
                <th class="text-right">Quantidade</th>
                <th class="text-right">Preço Unit.</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map((item, index) => {
                const disabled = isItemDisabled(order.id, index);
                const rowClass = disabled ? ' class="unavailable-row"' : '';
                const imgStyle = disabled ? 'opacity:0.5;filter:grayscale(100%);' : '';
                const imageHtml = item.image_url 
                  ? '<img src="' + item.image_url + '" alt="' + item.product_name + '" style="' + imgStyle + '">'
                  : '<div style="width:60px;height:60px;background:#eee;border-radius:4px;"></div>';
                const unavailableBadge = disabled ? '<br><span class="unavailable-badge">INDISPONÍVEL</span>' : '';
                const quantity = disabled ? '0' : item.quantity;
                const unitPrice = disabled ? 'R$ 0,00' : formatCurrency(item.unit_price);
                const totalPrice = disabled ? 'R$ 0,00' : formatCurrency(item.total_price);
                
                return `
                <tr${rowClass}>
                  <td class="image-cell">${imageHtml}</td>
                  <td>${item.product_name}<div class="product-sku">${item.sku}</div>${unavailableBadge}</td>
                  <td class="text-right">${quantity}</td>
                  <td class="text-right">${unitPrice}</td>
                  <td class="text-right">${totalPrice}</td>
                </tr>
              `}).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="4" class="text-right">Total do Pedido:</td>
                <td class="text-right">${formatCurrency(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Fabricação</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pedidos em produção que precisam ser fabricados e entregues
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Card 
          className={`border-l-2 border-l-orange-500 cursor-pointer transition-all hover:scale-105 ${filterMode === "production" ? "ring-2 ring-orange-500 shadow-lg" : ""}`}
          onClick={() => setFilterMode(filterMode === "production" ? "all" : "production")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-md flex items-center justify-center">
                <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Em Produção</p>
                <p className="text-xl font-bold text-foreground">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`border-l-2 border-l-red-500 cursor-pointer transition-all hover:scale-105 ${filterMode === "urgent" ? "ring-2 ring-red-500 shadow-lg" : ""}`}
          onClick={() => setFilterMode(filterMode === "urgent" ? "all" : "urgent")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-md flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Urgentes</p>
                <p className="text-xl font-bold text-foreground">{orders.filter(o => o.is_urgent === 1).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-2 border-l-blue-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-md flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Valor Total</p>
                <p className="text-base font-bold text-foreground truncate">
                  {formatCurrency(orders.reduce((sum, order) => {
                    const { totalAmount } = calculateOrderTotals(order);
                    return sum + totalAmount;
                  }, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-2 border-l-green-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-md flex items-center justify-center">
                <Package className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Itens Totais</p>
                <p className="text-xl font-bold text-foreground">
                  {orders.reduce((sum, order) => {
                    const { activeItemsCount } = calculateOrderTotals(order);
                    return sum + activeItemsCount;
                  }, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">Nenhum pedido em produção</h3>
              <p className="text-sm text-muted-foreground">Não há pedidos aguardando fabricação no momento.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders
            .filter((order) => {
              if (filterMode === "all") return true;
              if (filterMode === "urgent") return order.is_urgent === 1;
              if (filterMode === "production") return true;
              return true;
            })
            .map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const isUrgent = order.is_urgent === 1;
            const { totalAmount, activeItemsCount } = calculateOrderTotals(order);

            return (
              <Card key={order.id} className={isUrgent ? "border-l-2 border-l-red-500" : ""}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleOrder(order.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <div className={`w-9 h-9 rounded-md flex items-center justify-center ${isUrgent ? "bg-red-100 dark:bg-red-900/30" : "bg-orange-100 dark:bg-orange-900/30"}`}>
                              <FileText className={`w-4 h-4 ${isUrgent ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <CardTitle className="text-sm font-semibold text-foreground">#{order.order_number}</CardTitle>
                              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs px-2 py-0">Em Produção</Badge>
                              {isUrgent && (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs px-2 py-0">
                                  <AlertCircle className="w-3 h-3 mr-1" />Urgência
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(order.order_date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>{activeItemsCount} de {order.items.length} itens</span>
                              </div>
                              <div className="flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                                <DollarSign className="w-3 h-3" />
                                <span>{formatCurrency(totalAmount)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="flex-shrink-0 h-7 w-7 p-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-3">
                      <div className="border-t border-border pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-foreground">Itens para Fabricação</h4>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleDownloadPDF(order); }}>
                            <Download className="w-3 h-3 mr-1" />Baixar PDF
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground w-16">Imagem</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Produto</th>
                                <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">SKU</th>
                                <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">Qtd</th>
                                <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">Preço Unit.</th>
                                <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, index) => {
                                const disabled = isItemDisabled(order.id, index);
                                return (
                                  <tr key={index} className={`border-b border-border/50 last:border-0 ${disabled ? "opacity-50" : ""}`}>
                                    <td className="py-1.5 px-2">
                                      <div className="relative group">
                                        {item.image_url ? (
                                          <img src={item.image_url} alt={item.product_name} className={`w-10 h-10 object-cover rounded border border-border ${disabled ? "grayscale" : ""}`} />
                                        ) : (
                                          <div className="w-10 h-10 bg-muted rounded border border-border flex items-center justify-center">
                                            <Package className="w-5 h-5 text-muted-foreground" />
                                          </div>
                                        )}
                                        <button onClick={() => toggleItemDisabled(order.id, index)} className="absolute inset-0 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title={disabled ? "Marcar como disponível" : "Marcar como indisponível"}>
                                          <PowerOff className={`w-5 h-5 ${disabled ? "text-green-400" : "text-red-400"}`} />
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-2">
                                      <div className={disabled ? "line-through text-muted-foreground" : "text-foreground"}>{item.product_name}</div>
                                      {disabled && <div className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">Sem material disponível</div>}
                                      {item.product_id && (
                                        <div className="text-[10px] text-muted-foreground mt-0.5">ID: {item.product_id}</div>
                                      )}
                                    </td>
                                    <td className={`py-1.5 px-2 text-muted-foreground font-mono ${disabled ? "line-through" : ""}`}>{item.sku}</td>
                                    <td className={`py-1.5 px-2 text-right font-medium text-foreground ${disabled ? "line-through" : ""}`}>{item.quantity}</td>
                                    <td className={`py-1.5 px-2 text-right text-muted-foreground ${disabled ? "line-through" : ""}`}>{formatCurrency(item.unit_price)}</td>
                                    <td className={`py-1.5 px-2 text-right font-semibold text-foreground ${disabled ? "line-through" : ""}`}>{formatCurrency(item.total_price)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-border">
                                <td colSpan={5} className="py-2 px-2 font-semibold text-right text-foreground">Total a Fabricar:</td>
                                <td className="py-2 px-2 font-bold text-right text-orange-600 dark:text-orange-400">{formatCurrency(totalAmount)}</td>
                              </tr>
                              {totalAmount !== order.total_amount && (
                                <tr className="border-t border-border/50">
                                  <td colSpan={5} className="py-1.5 px-2 text-[10px] text-right text-muted-foreground">Total Original:</td>
                                  <td className="py-1.5 px-2 text-[10px] text-right text-muted-foreground line-through">{formatCurrency(order.total_amount)}</td>
                                </tr>
                              )}
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
