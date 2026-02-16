import { useState, useEffect } from "react";
import { X, Package, CheckCircle2, AlertCircle, Scan, Download, RotateCcw } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Badge } from "@/react-app/components/ui/badge";
import ProductSearchSelect from "@/react-app/components/ProductSearchSelect";
import ConfirmDialog from "@/react-app/components/ConfirmDialog";
import { apiGet, apiPost, apiRequest, apiDelete } from "@/react-app/lib/api";

interface ReceiveOrderModalProps {
  orderId: number;
  onClose: () => void;
  onReceiptComplete: () => void;
}

interface OrderItem {
  id: number;
  product_id: number;
  sku: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_remaining: number;
  is_unavailable?: boolean;
  quantity_exceeded?: boolean;
}

interface ErrorItem {
  product_id: number;
  sku: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  error_reason: string;
}

interface DialogState {
  open: boolean;
  type: "confirm" | "alert" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function ReceiveOrderModal({ orderId, onClose, onReceiptComplete }: ReceiveOrderModalProps) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [skuInput, setSkuInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [manualMode, setManualMode] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [errorItems, setErrorItems] = useState<ErrorItem[]>([]);
  const [showAddError, setShowAddError] = useState(false);
  const [hasExistingReceipt, setHasExistingReceipt] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "alert",
    title: "",
    message: "",
  });

  useEffect(() => {
    loadOrderItems();
  }, [orderId]);

  useEffect(() => {
    // Load existing receipt data if available
    loadExistingReceipts();
    // Load unavailable items
    loadUnavailableItems();
  }, [orderId]);

  const showDialog = (
    type: "confirm" | "alert" | "success" | "error",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setDialog({ open: true, type, title, message, onConfirm });
  };

  const closeDialog = () => {
    setDialog({ ...dialog, open: false });
  };

  const loadUnavailableItems = async () => {
    try {
      const data = await apiGet(`/api/supplier-unavailable-items/order/${orderId}`);
      const unavailableMap = new Map<number, boolean>();
      
      if (data.unavailable_items) {
        data.unavailable_items.forEach((item: any) => {
          if (item.is_unavailable === 1) {
            unavailableMap.set(item.item_index, true);
          }
        });
      }
      
      // Update items with unavailable status
      setItems(prevItems => {
        const updatedItems = prevItems.map((item, index) => ({
          ...item,
          is_unavailable: unavailableMap.get(index) || false,
        }));
        return sortItemsByStatus(updatedItems);
      });
    } catch (error) {
      console.error("Error loading unavailable items:", error);
    }
  };

  const loadExistingReceipts = async () => {
    try {
      const data = await apiGet(`/api/order-receipts/${orderId}`);
      if (data.receipts && data.receipts.length > 0) {
        setHasExistingReceipt(true);
        // Update items with existing receipt data
        setItems(prevItems => {
          const updatedItems = prevItems.map(item => {
            const receipt = data.receipts.find((r: any) => r.product_id === item.product_id);
            if (receipt) {
              return {
                ...item,
                quantity_received: receipt.quantity_received,
                quantity_remaining: receipt.quantity_remaining,
              };
            }
            return item;
          });
          return sortItemsByStatus(updatedItems);
        });
      }
      if (data.errorItems && data.errorItems.length > 0) {
        setErrorItems(data.errorItems);
      }
    } catch (error) {
      console.error("Error loading existing receipts:", error);
    }
  };

  const playSuccessSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Success sound: two beeps at higher frequencies
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const playErrorSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Error sound: lower frequency buzzer
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const loadOrderItems = async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/api/orders/${orderId}`);
      
      if (data.order && data.items) {
        setOrder(data.order);
        
        // Initialize receipt tracking
        const itemsWithReceipt = data.items.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          sku: item.sku,
          product_name: item.product_name,
          quantity_ordered: item.quantity,
          quantity_received: 0,
          quantity_remaining: item.quantity,
        }));
        
        setItems(itemsWithReceipt);
      }
    } catch (error) {
      console.error("Error loading order items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanOrSearch = () => {
    if (!skuInput.trim()) return;
    
    const item = items.find(i => 
      i.sku.toLowerCase() === skuInput.toLowerCase().trim()
    );
    
    if (!item) {
      playErrorSound();
      showDialog("error", "SKU não encontrado", "SKU não encontrado neste pedido");
      setSkuInput("");
      return;
    }
    
    if (item.is_unavailable) {
      playErrorSound();
      showDialog("error", "Item indisponível", "Este item foi marcado como indisponível pelo fornecedor e não pode ser recebido");
      setSkuInput("");
      return;
    }
    
    playSuccessSound();
    const qty = parseInt(quantityInput) || 1;
    receiveItem(item.id, qty);
    setSkuInput("");
    setQuantityInput("1");
  };

  const sortItemsByStatus = (items: OrderItem[]) => {
    return [...items].sort((a, b) => {
      // Calculate status for each item
      const getStatusPriority = (item: OrderItem) => {
        if (item.is_unavailable) return 3; // Unavailable at bottom
        if (item.quantity_remaining === 0) return 2; // Complete
        if (item.quantity_received > 0) return 1; // Partial
        return 0; // Pending (top priority)
      };
      
      return getStatusPriority(a) - getStatusPriority(b);
    });
  };

  const receiveItem = (itemId: number, quantity: number, skipConfirmation = false) => {
    setItems(prevItems => {
      const item = prevItems.find(i => i.id === itemId);
      if (!item) return prevItems;

      const newReceived = item.quantity_received + quantity;
      
      // Check if receiving more than ordered
      if (!skipConfirmation && newReceived > item.quantity_ordered) {
        showDialog(
          "confirm",
          "Quantidade Acima do Pedido",
          `Você está recebendo ${newReceived} unidades, mas o pedido é de apenas ${item.quantity_ordered} unidades.\n\nDeseja continuar?`,
          () => {
            closeDialog();
            receiveItem(itemId, quantity, true);
          }
        );
        return prevItems;
      }

      const updatedItems = prevItems.map(item => {
        if (item.id === itemId) {
          const exceeded = newReceived > item.quantity_ordered;
          return {
            ...item,
            quantity_received: newReceived,
            quantity_remaining: Math.max(0, item.quantity_ordered - newReceived),
            quantity_exceeded: exceeded,
          };
        }
        return item;
      });
      
      // Sort items by status after updating
      return sortItemsByStatus(updatedItems);
    });
  };

  const handleManualReceive = () => {
    if (selectedItemId === null) return;
    
    const qty = parseInt(quantityInput) || 0;
    if (qty <= 0) return;
    
    receiveItem(selectedItemId, qty);
    setSelectedItemId(null);
    setQuantityInput("1");
  };

  const handleResetItem = (itemId: number) => {
    setItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity_received: 0,
            quantity_remaining: item.quantity_ordered,
            quantity_exceeded: false,
          };
        }
        return item;
      });
      
      return sortItemsByStatus(updatedItems);
    });
  };

  const calculateProgress = () => {
    // Only count items that are not unavailable
    const availableItems = items.filter(item => !item.is_unavailable);
    const totalOrdered = availableItems.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalReceived = availableItems.reduce((sum, item) => sum + item.quantity_received, 0);
    const totalRemaining = availableItems.reduce((sum, item) => sum + item.quantity_remaining, 0);
    
    return {
      totalOrdered,
      totalReceived,
      totalRemaining,
      percentage: totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0,
    };
  };

  const handleAddErrorItem = (product: any, quantity: number, cost: number, reason: string) => {
    const newErrorItem: ErrorItem = {
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
      quantity: quantity,
      unit_cost: cost,
      error_reason: reason,
    };
    
    setErrorItems([...errorItems, newErrorItem]);
    setShowAddError(false);
  };

  const removeErrorItem = (index: number) => {
    setErrorItems(errorItems.filter((_, i) => i !== index));
  };

  const handleResetReceipt = () => {
    showDialog(
      "confirm",
      "Reiniciar Recebimento",
      "Tem certeza que deseja reiniciar o recebimento deste pedido? Todos os dados de recebimento serão removidos e você poderá receber as peças novamente.",
      async () => {
        try {
          // Delete receipt data from backend
          await apiDelete(`/api/order-receipts/${orderId}`);
          
          // Reset local state
          setItems(prevItems => 
            sortItemsByStatus(prevItems.map(item => ({
              ...item,
              quantity_received: 0,
              quantity_remaining: item.quantity_ordered,
            })))
          );
          setErrorItems([]);
          setHasExistingReceipt(false);
          
          // Update order status back to Pendente or Trânsito
          await apiRequest(`/api/orders/${orderId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "Pendente" }),
          });
          
          showDialog("success", "Recebimento Reiniciado", "O recebimento foi reiniciado com sucesso. Você pode receber as peças novamente.");
        } catch (error) {
          console.error("Error resetting receipt:", error);
          showDialog("error", "Erro", "Erro ao reiniciar recebimento");
        }
      }
    );
  };

  const handleFinishReceipt = async () => {
    const progress = calculateProgress();
    
    if (progress.totalRemaining > 0) {
      showDialog(
        "confirm",
        "Peças Faltantes",
        `Ainda faltam ${progress.totalRemaining} peças.\n\nDeseja gerar um novo pedido (PR) com as peças faltantes?`,
        async () => {
          closeDialog();
          await createReplenishmentOrder();
          await saveReceiptData();
        }
      );
    } else {
      showDialog(
        "confirm",
        "Finalizar Recebimento",
        "Tem certeza que deseja finalizar o recebimento deste pedido?",
        async () => {
          closeDialog();
          await saveReceiptData();
        }
      );
    }
  };

  const saveReceiptData = async () => {
    try {
      // Save receipt tracking with error items
      await apiPost(`/api/order-receipts/${orderId}`, { items, errorItems });
      
      // Update order status to complete
      await apiRequest(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "Completo" }),
      });
      
      // Update stock quantities
      for (const item of items) {
        if (item.quantity_received > 0) {
          await apiRequest(`/api/products/${item.product_id}/stock`, {
            method: "PATCH",
            body: JSON.stringify({ quantity: item.quantity_received, operation: "add" }),
          });
        }
      }
      
      showDialog("success", "Recebimento Finalizado", "Recebimento finalizado com sucesso!");
      
      // Wait a moment for user to see the success message
      setTimeout(() => {
        onReceiptComplete();
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Error finishing receipt:", error);
      showDialog("error", "Erro", "Erro ao finalizar recebimento");
    }
  };

  const createReplenishmentOrder = async () => {
    try {
      // Get missing items
      const missingItems = items
        .filter(item => item.quantity_remaining > 0)
        .map(item => ({
          product_id: item.product_id,
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity_remaining,
          unit_price: 0, // Will be fetched from product
          allocated_cost: 0,
          purchase_cost: 0,
          subtotal: 0,
        }));
      
      if (missingItems.length === 0) return;
      
      // Create PR order number (replace PO with PR)
      const prOrderNumber = order.order_number.replace('PO', 'PR');
      
      await apiPost("/api/orders/replenishment", {
        original_order_id: orderId,
        supplier_id: order.supplier_id,
        order_number: prOrderNumber,
        items: missingItems,
      });
      
      showDialog("success", "Pedido de Reposição Criado", `Pedido de reposição ${prOrderNumber} criado com sucesso!`);
    } catch (error) {
      console.error("Error creating replenishment order:", error);
      showDialog("error", "Erro", "Erro ao criar pedido de reposição");
    }
  };

  const progress = calculateProgress();
  const isFullyReceived = hasExistingReceipt && progress.totalRemaining === 0;

  const generateReceiptPDF = () => {
    const doc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recebimento de Pedido - ${order.order_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .header { margin-bottom: 30px; }
    .info { margin-bottom: 20px; }
    .info-row { display: flex; margin-bottom: 5px; }
    .info-label { font-weight: bold; width: 150px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4F46E5; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .complete { color: #16A34A; font-weight: bold; }
    .partial { color: #D97706; font-weight: bold; }
    .pending { color: #DC2626; font-weight: bold; }
    .summary { margin-top: 30px; padding: 20px; background-color: #F3F4F6; border-radius: 8px; }
    .summary-item { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Comprovante de Recebimento</h1>
    <div class="info">
      <div class="info-row">
        <span class="info-label">Pedido:</span>
        <span>${order.order_number}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data:</span>
        <span>${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Fornecedor:</span>
        <span>${order.trade_name || order.company_name || order.name || '—'}</span>
      </div>
    </div>
  </div>

  <h2>Itens Recebidos</h2>
  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Produto</th>
        <th>Pedido</th>
        <th>Recebido</th>
        <th>Faltante</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.sku}</td>
          <td>${item.product_name}</td>
          <td>${item.quantity_ordered}</td>
          <td class="${item.quantity_received > 0 ? 'complete' : ''}">${item.quantity_received}</td>
          <td class="${item.quantity_remaining > 0 ? 'pending' : ''}">${item.quantity_remaining}</td>
          <td class="${item.quantity_remaining === 0 ? 'complete' : item.quantity_received > 0 ? 'partial' : 'pending'}">
            ${item.quantity_remaining === 0 ? 'Completo' : item.quantity_received > 0 ? 'Parcial' : 'Pendente'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="summary">
    <h2>Resumo do Recebimento</h2>
    <div class="summary-item">
      <strong>Total de Peças Pedidas:</strong>
      <span>${progress.totalOrdered}</span>
    </div>
    <div class="summary-item">
      <strong>Total de Peças Recebidas:</strong>
      <span class="complete">${progress.totalReceived}</span>
    </div>
    <div class="summary-item">
      <strong>Total de Peças Faltantes:</strong>
      <span class="${progress.totalRemaining > 0 ? 'pending' : 'complete'}">${progress.totalRemaining}</span>
    </div>
    <div class="summary-item">
      <strong>Percentual Recebido:</strong>
      <span>${progress.percentage.toFixed(1)}%</span>
    </div>
  </div>

  <div class="footer">
    <p>Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
    <p>Kryzer Digital - Sistema de Gestão de Pedidos</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recebimento-${order.order_number}-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <p className="text-gray-600 dark:text-gray-400">Carregando itens do pedido...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Receber Pedido
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
                  {order?.order_number}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Progresso do Recebimento
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {progress.totalReceived} / {progress.totalOrdered} peças ({progress.percentage.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              {progress.totalRemaining > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Faltam {progress.totalRemaining} peças
                </p>
              )}
            </div>

            {/* Input Mode Tabs */}
            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <Button
                  variant={!manualMode ? "default" : "outline"}
                  onClick={() => setManualMode(false)}
                  className="flex-1"
                >
                  <Scan className="w-4 h-4 mr-2" />
                  Bipagem/Busca
                </Button>
                <Button
                  variant={manualMode ? "default" : "outline"}
                  onClick={() => setManualMode(true)}
                  className="flex-1"
                >
                  Manual
                </Button>
              </div>

              {!manualMode ? (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Digite o SKU e a quantidade recebida
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleScanOrSearch()}
                      placeholder="Digite ou escaneie o SKU"
                      className="flex-1"
                      autoFocus
                    />
                    <Input
                      type="number"
                      min="1"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      placeholder="Qtd."
                      className="w-24"
                    />
                    <Button onClick={handleScanOrSearch}>
                      Receber
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Selecione um item e digite a quantidade recebida
                  </p>
                  {selectedItemId && (
                    <div className="flex gap-2 mb-3">
                      <Input
                        type="number"
                        min="0"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        placeholder="Quantidade recebida"
                        className="flex-1"
                        autoFocus
                      />
                      <Button onClick={handleManualReceive}>
                        Confirmar
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setSelectedItemId(null);
                        setQuantityInput("1");
                      }}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Items List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Itens do Pedido ({items.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddError(true)}
                >
                  + Adicionar Item Recebido
                </Button>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">SKU</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Produto</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Pedido</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Recebido</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Faltando</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      {manualMode && (
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Ação</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const isComplete = item.quantity_remaining === 0;
                      const isPartial = item.quantity_received > 0 && item.quantity_remaining > 0;
                      const isUnavailable = item.is_unavailable || false;
                      
                      return (
                        <tr
                          key={item.id}
                          className={`border-t border-gray-100 dark:border-gray-800 ${
                            selectedItemId === item.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                          } ${isUnavailable ? "opacity-50" : ""}`}
                        >
                          <td className={`py-3 px-4 font-mono text-sm ${isUnavailable ? "line-through text-gray-500 dark:text-gray-500" : item.quantity_exceeded ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-900 dark:text-white"}`}>
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <div className={isUnavailable ? "line-through text-gray-500 dark:text-gray-500" : item.quantity_exceeded ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-700 dark:text-gray-300"}>
                              {item.product_name}
                            </div>
                            {isUnavailable && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Indisponível - não pode ser recebido
                              </div>
                            )}
                            {item.quantity_exceeded && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Recebido acima do pedido
                              </div>
                            )}
                          </td>
                          <td className={`py-3 px-4 text-sm ${isUnavailable ? "line-through text-gray-500 dark:text-gray-500" : "text-gray-900 dark:text-white"}`}>
                            {item.quantity_ordered}
                          </td>
                          <td className={`py-3 px-4 text-sm font-medium ${isUnavailable ? "line-through text-gray-500 dark:text-gray-500" : "text-green-600 dark:text-green-400"}`}>
                            {item.quantity_received}
                          </td>
                          <td className={`py-3 px-4 text-sm font-medium ${isUnavailable ? "line-through text-gray-500 dark:text-gray-500" : "text-amber-600 dark:text-amber-400"}`}>
                            {item.quantity_remaining}
                          </td>
                          <td className="py-3 px-4">
                            {isUnavailable ? (
                              <Badge className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                                <X className="w-3 h-3 mr-1" />
                                Indisponível
                              </Badge>
                            ) : isComplete ? (
                              <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Completo
                              </Badge>
                            ) : isPartial ? (
                              <Badge className="bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                                Parcial
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300">
                                Pendente
                              </Badge>
                            )}
                          </td>
                          {manualMode && (
                            <td className="py-3 px-4">
                              {isComplete ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleResetItem(item.id)}
                                  disabled={isUnavailable}
                                  className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Reiniciar
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedItemId(item.id)}
                                  disabled={isUnavailable}
                                  title={isUnavailable ? "Item indisponível não pode ser recebido" : undefined}
                                >
                                  Receber
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Error Item Modal */}
            {showAddError && (
              <ProductSearchSelect
                onSelect={handleAddErrorItem}
                onClose={() => setShowAddError(false)}
              />
            )}

            {/* Error Items List */}
            {errorItems.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-3">
                  Itens Recebidos Incorretamente ({errorItems.length})
                </h3>
                <div className="border border-amber-200 dark:border-amber-800 rounded-lg overflow-hidden bg-amber-50 dark:bg-amber-900/10">
                  <table className="w-full">
                    <thead className="bg-amber-100 dark:bg-amber-900/30">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">SKU</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Produto</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Quantidade</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Custo Unit.</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Total</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Motivo</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-amber-900 dark:text-amber-300">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errorItems.map((item, index) => (
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
                            R$ {item.unit_cost.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-amber-900 dark:text-amber-300">
                            R$ {(item.quantity * item.unit_cost).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300">
                              {item.error_reason}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeErrorItem(index)}
                              className="border-amber-300 dark:border-amber-700"
                            >
                              Remover
                            </Button>
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
          <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {progress.totalReceived === progress.totalOrdered ? (
                <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Todos os itens foram recebidos
                </span>
              ) : (
                <span>Recebimento em andamento</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={generateReceiptPDF}>
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {isFullyReceived ? (
                <Button onClick={handleResetReceipt} variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar Recebimento
                </Button>
              ) : (
                <Button onClick={handleFinishReceipt}>
                  Finalizar Recebimento
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialog.open}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
      />
    </>
  );
}
