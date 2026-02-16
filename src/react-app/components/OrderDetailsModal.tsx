import { useState, useEffect } from "react";
import { X, Edit, Package, Eye, Image } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import CreateOrderModal from "./CreateOrderModal";
import { apiGet } from "@/react-app/lib/api";
import { generateOrderPDF } from "@/react-app/lib/orderPdfGenerator";
import { Download } from "lucide-react";

interface OrderDetailsModalProps {
  orderId: number;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export default function OrderDetailsModal({ orderId, onClose, onOrderUpdated }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<any>(null);
  const [showOriginalOrderModal, setShowOriginalOrderModal] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState<any[]>([]);
  const [errorItems, setErrorItems] = useState<any[]>([]);

  useEffect(() => {
    loadOrderDetails();
    loadReceiptData();
    loadUnavailableItems();
  }, [orderId]);

  const calculateOriginalTotal = () => {
    if (!items || items.length === 0) return 0;
    const itemsTotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal || 0), 0);
    return itemsTotal - parseFloat(order?.discount || 0) + parseFloat(order?.shipping_cost || 0) + parseFloat(order?.other_costs || 0);
  };

  const calculateReceivedTotal = () => {
    if (!items || items.length === 0 || receipts.length === 0) return parseFloat(order?.total_amount || 0);
    
    let receivedTotal = 0;
    for (const item of items) {
      const receiptInfo = receipts.find((r: any) => r.product_id === item.product_id);
      const receivedQty = receiptInfo?.quantity_received || 0;
      const unitPrice = parseFloat(item.unit_price || 0);
      receivedTotal += receivedQty * unitPrice;
    }
    
    // Add error items
    for (const errorItem of errorItems) {
      receivedTotal += (errorItem.quantity || 0) * (errorItem.unit_cost || 0);
    }
    
    // Apply costs proportionally
    const originalItemsTotal = items.reduce((sum: number, item: any) => sum + parseFloat(item.subtotal || 0), 0);
    const proportion = originalItemsTotal > 0 ? receivedTotal / originalItemsTotal : 1;
    
    const discount = parseFloat(order?.discount || 0);
    const shipping = parseFloat(order?.shipping_cost || 0);
    const otherCosts = parseFloat(order?.other_costs || 0);
    
    return receivedTotal - (discount * proportion) + (shipping * proportion) + (otherCosts * proportion);
  };

  const hasPartialReceipt = receipts.length > 0;
  const originalTotal = calculateOriginalTotal();
  const receivedTotal = hasPartialReceipt ? calculateReceivedTotal() : parseFloat(order?.total_amount || 0);
  const notReceivedTotal = hasPartialReceipt ? originalTotal - receivedTotal : 0;

  const loadOrderDetails = async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/api/orders/${orderId}`);
      
      if (data.order) {
        setOrder(data.order);
        setItems(data.items || []);
        setInstallments(data.installments || []);
        
        // If this is a replenishment order, load original order
        if (data.order.is_replenishment === 1 && data.order.original_order_id) {
          loadOriginalOrder(data.order.original_order_id);
        }
      }
    } catch (error) {
      console.error("Error loading order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOriginalOrder = async (originalOrderId: number) => {
    try {
      const data = await apiGet(`/api/orders/${originalOrderId}`);
      if (data.order) {
        setOriginalOrder(data.order);
      }
    } catch (error) {
      console.error("Error loading original order:", error);
    }
  };

  const loadReceiptData = async () => {
    try {
      const data = await apiGet(`/api/order-receipts/${orderId}`);
      setReceipts(data.receipts || []);
      setErrorItems(data.errorItems || []);
    } catch (error) {
      console.error("Error loading receipt data:", error);
    }
  };

  const loadUnavailableItems = async () => {
    try {
      const data = await apiGet(`/api/supplier-unavailable-items/order/${orderId}`);
      setUnavailableItems(data.unavailable_items || []);
    } catch (error) {
      console.error("Error loading unavailable items:", error);
    }
  };

  const isItemUnavailable = (itemIndex: number) => {
    return unavailableItems.some(ui => ui.item_index === itemIndex && ui.is_unavailable === 1);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string } } = {
      "Pendente": { bg: "bg-yellow-100 dark:bg-yellow-900/20", text: "text-yellow-800 dark:text-yellow-300" },
      "Produção": { bg: "bg-orange-100 dark:bg-orange-900/20", text: "text-orange-800 dark:text-orange-300" },
      "Trânsito": { bg: "bg-blue-100 dark:bg-blue-900/20", text: "text-blue-800 dark:text-blue-300" },
      "Completo": { bg: "bg-green-100 dark:bg-green-900/20", text: "text-green-800 dark:text-green-300" },
      "Cancelado": { bg: "bg-red-100 dark:bg-red-900/20", text: "text-red-800 dark:text-red-300" },
    };
    
    const config = statusConfig[status] || statusConfig["Pendente"];
    
    return (
      <Badge className={`${config.bg} ${config.text} hover:${config.bg}`}>
        {status}
      </Badge>
    );
  };

  const getSupplierName = () => {
    if (!order) return "—";
    if (order.person_type === "fisica") {
      return order.name || "—";
    }
    return order.trade_name || order.company_name || "—";
  };

  const handleDownloadPDF = async () => {
    if (!order || !items) return;
    
    // Buscar dados da empresa
    let companyName = "—";
    try {
      const companiesData = await apiGet("/api/companies");
      if (companiesData.companies && companiesData.companies.length > 0) {
        const company = companiesData.companies[0];
        companyName = company.razao_social || company.name || "—";
      }
    } catch (error) {
      console.error("Error loading company data:", error);
    }
    
    generateOrderPDF({
      order_number: order.order_number,
      supplier_name: getSupplierName(),
      supplier_code: order.supplier_id,
      created_at: order.created_at,
      items: items.map(item => ({
        sku: item.sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        subtotal: parseFloat(item.subtotal),
        image_url: item.image_url,
      })),
      total_amount: parseFloat(order.total_amount),
      company_name: companyName,
    });
  };

  const handleEditComplete = () => {
    loadOrderDetails();
    onOrderUpdated();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <p className="text-gray-600 dark:text-gray-400">Carregando detalhes do pedido...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Detalhes do Pedido
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
                  {order.order_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {order.is_replenishment === 1 && originalOrder && (
                <Button variant="outline" onClick={() => setShowOriginalOrderModal(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Pedido Original
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowEditModal(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Replenishment Badge */}
          {order.is_replenishment === 1 && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                <Package className="w-4 h-4 inline mr-2" />
                Este é um pedido de reposição (PR) gerado a partir do pedido {originalOrder?.order_number || '—'}
              </p>
            </div>
          )}

          {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Informações do Pedido
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span>{getStatusBadge(order.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Data:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fornecedor:</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {getSupplierName()}
                    </span>
                  </div>
                  {order.contact_email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">E-mail:</span>
                      <span className="text-gray-900 dark:text-white">{order.contact_email}</span>
                    </div>
                  )}
                  {order.contact_phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Telefone:</span>
                      <span className="text-gray-900 dark:text-white">{order.contact_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Informações de Pagamento
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Método:</span>
                    <span className="text-gray-900 dark:text-white">{order.payment_method || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                    <span className="text-gray-900 dark:text-white">{order.payment_type || "—"}</span>
                  </div>
                  {order.payment_type === "Parcelado" && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Parcelas:</span>
                      <span className="text-gray-900 dark:text-white">{order.installments || 1}x</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Agrupado:</span>
                    <span className="text-gray-900 dark:text-white">
                      {order.is_grouped === 1 ? "Sim" : "Não"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Resumo de Custos
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
                {hasPartialReceipt ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Original do Pedido:</span>
                      <span className="text-gray-900 dark:text-white">
                        R$ {originalTotal.toFixed(2)}
                      </span>
                    </div>
                    {notReceivedTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Produtos Não Recebidos:</span>
                        <span className="text-red-600 dark:text-red-400">
                          - R$ {notReceivedTotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {errorItems.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Itens Incorretos Adicionados:</span>
                        <span className="text-amber-600 dark:text-amber-400">
                          + R$ {errorItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_cost), 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-base font-semibold">
                      <span className="text-gray-900 dark:text-white">Total a Pagar:</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        R$ {receivedTotal.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-gray-900 dark:text-white">
                        R$ {(parseFloat(order.total_amount) + parseFloat(order.discount) - parseFloat(order.shipping_cost) - parseFloat(order.other_costs)).toFixed(2)}
                      </span>
                    </div>
                    {parseFloat(order.discount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                        <span className="text-red-600 dark:text-red-400">
                          - R$ {parseFloat(order.discount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {parseFloat(order.shipping_cost) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Frete:</span>
                        <span className="text-gray-900 dark:text-white">
                          R$ {parseFloat(order.shipping_cost).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {parseFloat(order.other_costs) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Outros Custos:</span>
                        <span className="text-gray-900 dark:text-white">
                          R$ {parseFloat(order.other_costs).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-base font-semibold">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        R$ {parseFloat(order.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Error Items Table */}
            {errorItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3">
                  ⚠️ Itens Recebidos Incorretamente ({errorItems.length})
                </h3>
                <div className="border-2 border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-amber-100 dark:bg-amber-900/30">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">SKU</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Produto</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Quantidade</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Custo Unit.</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Total</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorItems.map((item: any, index: number) => (
                        <tr key={index} className="border-t border-amber-100 dark:border-amber-800">
                          <td className="py-3 px-4 font-mono text-sm text-amber-900 dark:text-amber-300">
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 text-sm text-amber-900 dark:text-amber-300">
                            {item.product_name}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-amber-900 dark:text-amber-300">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-4 text-sm text-amber-900 dark:text-amber-300">
                            R$ {parseFloat(item.unit_cost || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-amber-900 dark:text-amber-300">
                            R$ {(item.quantity * parseFloat(item.unit_cost || 0)).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300">
                              {item.error_reason}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Produtos ({items.length} itens)
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Produto</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Qtd.</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Preço Unit.</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Custo Rateado</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Custo Compra</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const receiptInfo = receipts.find(r => r.product_id === item.product_id);
                      const itemUnavailable = isItemUnavailable(index);
                      return (
                        <tr key={index} className={`border-t border-gray-100 dark:border-gray-800 ${
                          itemUnavailable ? "bg-red-50 dark:bg-red-900/10" : ""
                        }`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded overflow-hidden flex-shrink-0 ${
                                itemUnavailable ? "bg-red-200 dark:bg-red-900/30 ring-2 ring-red-500" : "bg-gray-200 dark:bg-gray-700"
                              }`}>
                                {item.image_url ? (
                                  <img 
                                    src={item.image_url} 
                                    alt={item.product_name}
                                    className={`w-full h-full object-cover ${itemUnavailable ? "opacity-60" : ""}`}
                                  />
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Image className={`w-6 h-6 ${itemUnavailable ? "text-red-400" : "text-gray-400"}`} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className={`font-mono text-sm ${
                                  itemUnavailable ? "text-red-700 dark:text-red-400 font-semibold" : "text-gray-900 dark:text-white"
                                }`}>{item.sku}</div>
                                <div className={`text-sm ${
                                  itemUnavailable ? "text-red-600 dark:text-red-300" : "text-gray-700 dark:text-gray-300"
                                }`}>{item.product_name}</div>
                                {itemUnavailable && (
                                  <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                                    ⚠️ Sem material disponível
                                  </div>
                                )}
                                {receiptInfo && receiptInfo.quantity_received < receiptInfo.quantity_ordered && (
                                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Recebido: {receiptInfo.quantity_received} de {receiptInfo.quantity_ordered}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className={`py-3 px-4 text-sm ${
                            itemUnavailable ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"
                          }`}>
                            {item.quantity}
                            {receiptInfo && (
                              <div className="text-xs text-green-600 dark:text-green-400">
                                ✓ {receiptInfo.quantity_received}
                              </div>
                            )}
                          </td>
                        <td className={`py-3 px-4 text-sm ${
                          itemUnavailable ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"
                        }`}>
                          R$ {parseFloat(item.unit_price).toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-sm ${
                          itemUnavailable ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"
                        }`}>
                          R$ {parseFloat(item.allocated_cost).toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-sm ${
                          itemUnavailable ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"
                        }`}>
                          R$ {parseFloat(item.purchase_cost).toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-sm font-medium ${
                          itemUnavailable ? "text-red-700 dark:text-red-400" : "text-gray-900 dark:text-white"
                        }`}>
                          R$ {parseFloat(item.subtotal).toFixed(2)}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Installments */}
            {installments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Parcelas ({installments.length}x)
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Parcela</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Valor</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Vencimento</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst) => (
                        <tr key={inst.id} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            {inst.installment_number}ª parcela
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                            R$ {parseFloat(inst.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                            {new Date(inst.due_date).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            {inst.is_paid === 1 ? (
                              <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                                Pago
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
                                Pendente
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
              {order.status === "Pendente" && (
                <Button onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </Button>
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>

      {showEditModal && (
        <CreateOrderModal
          editOrderId={orderId}
          orderStatus={order.status}
          onClose={() => setShowEditModal(false)}
          onOrderCreated={handleEditComplete}
        />
      )}

      {showOriginalOrderModal && originalOrder && (
        <OrderDetailsModal
          orderId={originalOrder.id}
          onClose={() => setShowOriginalOrderModal(false)}
          onOrderUpdated={() => {}}
        />
      )}
    </>
  );
}
