import { useState, useEffect } from "react";
import { X, Search, Plus, Trash2, Upload, Edit2, Check, Image } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Badge } from "@/react-app/components/ui/badge";
import QuickSupplierForm from "./QuickSupplierForm";
import { apiGet, apiPost, apiPut } from "@/react-app/lib/api";

interface CreateOrderModalProps {
  onClose: () => void;
  onOrderCreated: () => void;
  editOrderId?: number;
  orderStatus?: string;
}

interface OrderItem {
  product_id: number;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  allocated_cost: number;
  purchase_cost: number;
  subtotal: number;
  image_url?: string | null;
}

export default function CreateOrderModal({ onClose, onOrderCreated, editOrderId, orderStatus }: CreateOrderModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [showQuickSupplierForm, setShowQuickSupplierForm] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  
  // Cost fields
  const [discount, setDiscount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);
  
  // Payment fields
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [paymentType, setPaymentType] = useState("À Vista");
  const [installmentSchedule, setInstallmentSchedule] = useState("");
  const [isGrouped, setIsGrouped] = useState(false);
  
  // Product search
  const [skuSearch, setSkuSearch] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [showProductList, setShowProductList] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  
  // Order items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [editingPrices, setEditingPrices] = useState<{ [key: number]: boolean }>({});
  const [editingQuantities, setEditingQuantities] = useState<{ [key: number]: boolean }>({});
  const [tempPrices, setTempPrices] = useState<{ [key: number]: string }>({});
  const [tempQuantities, setTempQuantities] = useState<{ [key: number]: string }>({});
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState("");
  
  const [loading, setLoading] = useState(false);
  
  // Check if order is completed (blocks editing of items)
  const isOrderCompleted = orderStatus === "Completo";

  useEffect(() => {
    loadSuppliers();
    loadProducts();
    if (editOrderId) {
      loadOrderForEdit();
    } else {
      loadNextOrderNumber();
    }
  }, [editOrderId]);

  const loadSuppliers = async () => {
    try {
      const data = await apiGet("/api/suppliers");
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiGet("/api/products");
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadNextOrderNumber = async () => {
    try {
      const data = await apiGet("/api/orders/next-number");
      setOrderNumber(data.order_number);
    } catch (error) {
      console.error("Error loading next order number:", error);
    }
  };

  const loadOrderForEdit = async () => {
    if (!editOrderId) return;
    
    try {
      const data = await apiGet(`/api/orders/${editOrderId}`);
      
      if (data.order) {
        setOrderNumber(data.order.order_number);
        setSelectedSupplierId(data.order.supplier_id);
        setDiscount(parseFloat(data.order.discount) || 0);
        setShippingCost(parseFloat(data.order.shipping_cost) || 0);
        setOtherCosts(parseFloat(data.order.other_costs) || 0);
        setPaymentMethod(data.order.payment_method || "Pix");
        setPaymentType(data.order.payment_type || "À Vista");
        setIsGrouped(data.order.is_grouped === 1);
        
        if (data.items && data.items.length > 0) {
          const loadedItems = data.items.map((item: any) => ({
            product_id: item.product_id,
            sku: item.sku,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: parseFloat(item.unit_price),
            allocated_cost: parseFloat(item.allocated_cost),
            purchase_cost: parseFloat(item.purchase_cost),
            subtotal: parseFloat(item.subtotal),
            image_url: item.image_url || null,
          }));
          setOrderItems(loadedItems.sort((a: OrderItem, b: OrderItem) => a.sku.localeCompare(b.sku)));
        }
        
        if (data.installments && data.installments.length > 0) {
          const schedule = data.installments.map((inst: any) => {
            const dueDate = new Date(inst.due_date);
            const orderDate = new Date(data.order.created_at);
            const diffDays = Math.round((dueDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays;
          }).join(',');
          setInstallmentSchedule(schedule);
          setPaymentType("Parcelado");
        }
      }
    } catch (error) {
      console.error("Error loading order for edit:", error);
    }
  };

  const handleSupplierCreated = (supplierId: number) => {
    setSelectedSupplierId(supplierId);
    loadSuppliers();
  };

  const handleSkuSearch = () => {
    if (!skuSearch.trim()) return;
    
    const product = products.find(p => 
      p.sku.toLowerCase() === skuSearch.toLowerCase().trim() ||
      p.sku.toLowerCase().includes(skuSearch.toLowerCase().trim())
    );
    
    if (product) {
      addProductToOrder(product);
      setSkuSearch("");
      setQuantityInput("1");
    } else {
      alert("Produto não encontrado");
    }
  };

  const sortItemsBySku = (items: OrderItem[]) => {
    return [...items].sort((a: OrderItem, b: OrderItem) => a.sku.localeCompare(b.sku));
  };

  const addProductToOrder = (product: any) => {
    const quantity = parseInt(quantityInput) || 1;
    const unitPrice = product.cost_price || 0;
    const subtotal = quantity * unitPrice;
    
    // Check if product already in order
    const existingIndex = orderItems.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      // Update quantity
      const newItems = [...orderItems];
      newItems[existingIndex].quantity += quantity;
      newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].unit_price;
      setOrderItems(sortItemsBySku(newItems));
    } else {
      // Add new item
      const newItems = [...orderItems, {
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
        allocated_cost: 0,
        purchase_cost: unitPrice,
        subtotal,
        image_url: product.image_url || null,
      }];
      setOrderItems(sortItemsBySku(newItems));
    }
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const startEditingPrice = (index: number) => {
    setTempPrices({ ...tempPrices, [index]: orderItems[index].unit_price.toString() });
    setEditingPrices({ ...editingPrices, [index]: true });
  };

  const startEditingQuantity = (index: number) => {
    setTempQuantities({ ...tempQuantities, [index]: orderItems[index].quantity.toString() });
    setEditingQuantities({ ...editingQuantities, [index]: true });
  };

  const confirmPriceEdit = (index: number) => {
    const newPrice = parseFloat(tempPrices[index]) || 0;
    const newItems = [...orderItems];
    newItems[index].unit_price = newPrice;
    newItems[index].purchase_cost = newPrice;
    newItems[index].subtotal = newItems[index].quantity * newPrice;
    setOrderItems(newItems);
    setEditingPrices({ ...editingPrices, [index]: false });
    const newTempPrices = { ...tempPrices };
    delete newTempPrices[index];
    setTempPrices(newTempPrices);
  };

  const confirmQuantityEdit = (index: number) => {
    const newQty = parseInt(tempQuantities[index]) || 1;
    const newItems = [...orderItems];
    newItems[index].quantity = newQty;
    newItems[index].subtotal = newQty * newItems[index].unit_price;
    setOrderItems(newItems);
    setEditingQuantities({ ...editingQuantities, [index]: false });
    const newTempQtys = { ...tempQuantities };
    delete newTempQtys[index];
    setTempQuantities(newTempQtys);
  };

  const cancelPriceEdit = (index: number) => {
    setEditingPrices({ ...editingPrices, [index]: false });
    const newTempPrices = { ...tempPrices };
    delete newTempPrices[index];
    setTempPrices(newTempPrices);
  };

  const cancelQuantityEdit = (index: number) => {
    setEditingQuantities({ ...editingQuantities, [index]: false });
    const newTempQtys = { ...tempQuantities };
    delete newTempQtys[index];
    setTempQuantities(newTempQtys);
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const applyBulkPriceUpdate = () => {
    if (!bulkPrice || selectedItems.length === 0) return;
    
    const newPrice = parseFloat(bulkPrice);
    const newItems = [...orderItems];
    
    selectedItems.forEach(index => {
      newItems[index].unit_price = newPrice;
      newItems[index].purchase_cost = newPrice;
      newItems[index].subtotal = newItems[index].quantity * newPrice;
    });
    
    setOrderItems(newItems);
    setBulkPrice("");
    setSelectedItems([]);
  };

  const applyBulkQuantityUpdate = () => {
    if (!bulkQuantity || selectedItems.length === 0) return;
    
    const newQty = parseInt(bulkQuantity);
    const newItems = [...orderItems];
    
    selectedItems.forEach(index => {
      newItems[index].quantity = newQty;
      newItems[index].subtotal = newQty * newItems[index].unit_price;
    });
    
    setOrderItems(newItems);
    setBulkQuantity("");
    setSelectedItems([]);
  };

  const calculateTotals = () => {
    const itemsTotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalPieces = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const additionalCosts = shippingCost + otherCosts;
    const total = itemsTotal - discount + additionalCosts;
    
    // Calculate allocated cost per PIECE (distributed equally among all pieces)
    const costPerPiece = totalPieces > 0 ? (additionalCosts - discount) / totalPieces : 0;
    
    // Calculate allocated cost per item based on quantity
    const allocatedCostPerItem = orderItems.map(item => {
      return costPerPiece * item.quantity;
    });
    
    return {
      itemsTotal,
      total,
      totalPieces,
      totalSkus: orderItems.length,
      allocatedCostPerItem,
      costPerPiece,
    };
  };

  const generateInstallments = () => {
    if (paymentType !== "Parcelado" || !installmentSchedule.trim()) return [];
    
    const totals = calculateTotals();
    const schedule: any[] = [];
    
    // Parse schedule like "30,60,90" or manual dates
    const parts = installmentSchedule.split(',').map(p => p.trim());
    const installmentAmount = totals.total / parts.length;
    
    parts.forEach((part, index) => {
      const daysOffset = parseInt(part);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysOffset);
      
      schedule.push({
        number: index + 1,
        amount: installmentAmount,
        due_date: dueDate.toISOString().split('T')[0],
      });
    });
    
    return schedule;
  };

  const handleSubmit = async () => {
    if (!selectedSupplierId) {
      alert("Selecione um fornecedor");
      return;
    }
    
    if (orderItems.length === 0) {
      alert("Adicione pelo menos um produto");
      return;
    }
    
    setLoading(true);
    
    try {
      const totals = calculateTotals();
      const installments = paymentType === "Parcelado" ? generateInstallments() : [];
      
      // Update items with calculated allocated costs and ensure they're sorted by SKU
      const sortedItems = [...orderItems].sort((a: OrderItem, b: OrderItem) => a.sku.localeCompare(b.sku));
      const itemsWithAllocatedCosts = sortedItems.map((item) => {
        const itemIndex = orderItems.findIndex(i => i.product_id === item.product_id);
        const allocatedPerPiece = (totals.allocatedCostPerItem[itemIndex] || 0) / item.quantity;
        return {
          ...item,
          allocated_cost: allocatedPerPiece,
          purchase_cost: item.unit_price + allocatedPerPiece,
          subtotal: item.subtotal + totals.allocatedCostPerItem[itemIndex],
        };
      });
      
      const body = {
        supplier_id: selectedSupplierId,
        order_number: orderNumber,
        discount,
        shipping_cost: shippingCost,
        other_costs: otherCosts,
        payment_method: paymentMethod,
        payment_type: paymentType,
        installments: paymentType === "Parcelado" ? installments.length : 1,
        installment_schedule: installments,
        is_grouped: isGrouped,
        items: itemsWithAllocatedCosts,
      };
      
      if (editOrderId) {
        await apiPut(`/api/orders/${editOrderId}`, body);
      } else {
        await apiPost("/api/orders", body);
      }
      
      onOrderCreated();
      onClose();
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Erro ao salvar pedido");
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();
  const filteredProducts = products.filter(p =>
    !productSearchQuery.trim() ||
    p.sku?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.name?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editOrderId ? "Editar Pedido" : "Novo Pedido"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Pedido: <span className="font-mono font-medium">{orderNumber}</span>
              </p>
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
            {/* Supplier Selection */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fornecedor *
              </Label>
              <div className="flex gap-2">
                <select
                  value={selectedSupplierId || ""}
                  onChange={(e) => setSelectedSupplierId(parseInt(e.target.value))}
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                >
                  <option value="">Selecione um fornecedor</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.person_type === "fisica"
                        ? supplier.name
                        : supplier.trade_name || supplier.company_name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuickSupplierForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Fornecedor
                </Button>
              </div>
            </div>

            {/* Completed Order Warning */}
            {isOrderCompleted && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  ⚠️ Este pedido está marcado como <strong>Completo</strong>. Você pode editar apenas a forma de pagamento, fornecedor e opção de agrupamento. Não é possível adicionar, remover ou alterar produtos.
                </p>
              </div>
            )}

            {/* Cost Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Info. de Custos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    disabled={isOrderCompleted}
                  />
                </div>
                <div>
                  <Label htmlFor="shipping">Custo de Frete (R$)</Label>
                  <Input
                    id="shipping"
                    type="number"
                    step="0.01"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    disabled={isOrderCompleted}
                  />
                </div>
                <div>
                  <Label htmlFor="other_costs">Outros Custos (R$)</Label>
                  <Input
                    id="other_costs"
                    type="number"
                    step="0.01"
                    value={otherCosts}
                    onChange={(e) => setOtherCosts(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    disabled={isOrderCompleted}
                  />
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Forma de Pagamento
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="payment_method">Método</Label>
                  <select
                    id="payment_method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão">Cartão</option>
                    <option value="Dinheiro">Dinheiro</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="payment_type">Tipo</Label>
                  <select
                    id="payment_type"
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                  >
                    <option value="À Vista">À Vista</option>
                    <option value="Parcelado">Parcelado</option>
                  </select>
                </div>
              </div>
              
              {paymentType === "Parcelado" && (
                <div className="mb-4">
                  <Label htmlFor="installment_schedule">
                    Parcelas (ex: 30,60,90 para vencimento em 30, 60 e 90 dias)
                  </Label>
                  <Input
                    id="installment_schedule"
                    value={installmentSchedule}
                    onChange={(e) => setInstallmentSchedule(e.target.value)}
                    placeholder="30,60,90"
                  />
                </div>
              )}
              
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGrouped}
                    onChange={(e) => setIsGrouped(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Agrupar pedidos semanalmente (segunda a sábado)
                  </span>
                </label>
              </div>
            </div>

            {/* Product Search */}
            {!isOrderCompleted && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Info. do Produto
                </h3>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1">
                    <Input
                      value={skuSearch}
                      onChange={(e) => setSkuSearch(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSkuSearch()}
                      placeholder="Digite SKU ou EAN"
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      min="1"
                      value={quantityInput}
                      onChange={(e) => setQuantityInput(e.target.value)}
                      placeholder="Qtd."
                    />
                  </div>
                  <Button onClick={handleSkuSearch}>
                    Buscar
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowProductList(!showProductList)}
                    className="flex-1"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Adicionar SKU
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="flex-1"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importar Planilha
                  </Button>
                </div>
              
              {showProductList && (
                <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <Input
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder="Buscar por SKU ou nome..."
                    className="mb-3"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          addProductToOrder(product);
                          setShowProductList(false);
                          setProductSearchQuery("");
                        }}
                        className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                <Image className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {product.sku} • Estoque: {product.stock}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            R$ {(product.cost_price || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Bulk Actions */}
            {!isOrderCompleted && selectedItems.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-4">
                  <Badge className="bg-blue-600">{selectedItems.length} selecionados</Badge>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      placeholder="Preço"
                      className="w-32"
                    />
                    <Button size="sm" onClick={applyBulkPriceUpdate}>
                      Aplicar Preço
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={bulkQuantity}
                      onChange={(e) => setBulkQuantity(e.target.value)}
                      placeholder="Qtd."
                      className="w-32"
                    />
                    <Button size="sm" onClick={applyBulkQuantityUpdate}>
                      Aplicar Qtd.
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items Table */}
            {orderItems.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Produtos do Pedido
                  </h3>
                  {!isOrderCompleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOrderItems([])}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover Todos
                    </Button>
                  )}
                </div>
                
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {!isOrderCompleted && (
                          <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(orderItems.map((_, i) => i));
                                } else {
                                  setSelectedItems([]);
                                }
                              }}
                              className="rounded"
                            />
                          </th>
                        )}
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Produto</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Qtd.</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Preço Unit. (R$)</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Custo Rateado (R$)</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Custo de Compra (R$)</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Subtotal (R$)</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, index) => (
                        <tr key={index} className="border-t border-gray-100 dark:border-gray-800">
                          {!isOrderCompleted && (
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(index)}
                                onChange={() => toggleItemSelection(index)}
                                className="rounded"
                              />
                            </td>
                          )}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                                {item.image_url ? (
                                  <img 
                                    src={item.image_url} 
                                    alt={item.product_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Image className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{item.sku}</div>
                                <div className="text-xs text-gray-500">{item.product_name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {!isOrderCompleted && editingQuantities[index] ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={tempQuantities[index] || ""}
                                  onChange={(e) => setTempQuantities({ ...tempQuantities, [index]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") confirmQuantityEdit(index);
                                    if (e.key === "Escape") cancelQuantityEdit(index);
                                  }}
                                  className="w-20"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => confirmQuantityEdit(index)}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelQuantityEdit(index)}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                onClick={!isOrderCompleted ? () => startEditingQuantity(index) : undefined}
                                className={!isOrderCompleted ? "cursor-pointer hover:text-blue-600 flex items-center gap-2" : "flex items-center gap-2"}
                              >
                                {item.quantity}
                                {!isOrderCompleted && <Edit2 className="w-3 h-3 opacity-50" />}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {!isOrderCompleted && editingPrices[index] ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={tempPrices[index] || ""}
                                  onChange={(e) => setTempPrices({ ...tempPrices, [index]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") confirmPriceEdit(index);
                                    if (e.key === "Escape") cancelPriceEdit(index);
                                  }}
                                  className="w-24"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => confirmPriceEdit(index)}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => cancelPriceEdit(index)}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                onClick={!isOrderCompleted ? () => startEditingPrice(index) : undefined}
                                className={!isOrderCompleted ? "cursor-pointer hover:text-blue-600 flex items-center gap-2" : "flex items-center gap-2"}
                              >
                                {item.unit_price.toFixed(2)}
                                {!isOrderCompleted && <Edit2 className="w-3 h-3 opacity-50" />}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">{(totals.allocatedCostPerItem[index] / item.quantity || 0).toFixed(4)}</td>
                          <td className="py-3 px-4">{(item.unit_price + (totals.allocatedCostPerItem[index] / item.quantity || 0)).toFixed(4)}</td>
                          <td className="py-3 px-4 font-medium">{(item.subtotal + totals.allocatedCostPerItem[index]).toFixed(4)}</td>
                          {!isOrderCompleted && (
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-semibold">
                        {!isOrderCompleted && <td className="py-3 px-4"></td>}
                        <td colSpan={2} className="py-3 px-4">Resumo</td>
                        <td className="py-3 px-4">Qtd. SKU: {totals.totalSkus} | {totals.totalPieces}</td>
                        <td colSpan={3} className="py-3 px-4"></td>
                        <td className="py-3 px-4">{totals.itemsTotal.toFixed(2)}</td>
                        {!isOrderCompleted && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Order Summary */}
            {orderItems.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium">R$ {totals.itemsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Desconto:</span>
                    <span className="font-medium text-red-600">- R$ {discount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Frete:</span>
                    <span className="font-medium">R$ {shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Outros Custos:</span>
                    <span className="font-medium">R$ {otherCosts.toFixed(2)}</span>
                  </div>
                  <div className="col-span-2 border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600 dark:text-blue-400">R$ {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !selectedSupplierId || orderItems.length === 0}>
              {loading ? "Salvando..." : editOrderId ? "Salvar Alterações" : "Criar Pedido"}
            </Button>
          </div>
        </div>
      </div>

      {showQuickSupplierForm && (
        <QuickSupplierForm
          onClose={() => setShowQuickSupplierForm(false)}
          onSupplierCreated={handleSupplierCreated}
        />
      )}
    </>
  );
}
