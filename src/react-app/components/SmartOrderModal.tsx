import { useState, useEffect } from "react";
import { X, Wand2, AlertCircle, Package, TrendingUp, Calendar, Loader2, Trash2, Plus, Search, Users } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Badge } from "@/react-app/components/ui/badge";
import MultiSupplierOrderModal from "./MultiSupplierOrderModal";
import { apiGet, apiPost } from "@/react-app/lib/api";

interface SmartOrderModalProps {
  onClose: () => void;
  onOrderCreated: () => void;
}

type GenerationType = "days" | "out_of_stock" | "curve_a" | "recommended";
type OrderMode = "single" | "multi" | null;

export default function SmartOrderModal({ onClose, onOrderCreated }: SmartOrderModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orderMode, setOrderMode] = useState<OrderMode>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [generationType, setGenerationType] = useState<GenerationType | null>(null);
  const [daysValue, setDaysValue] = useState<number>(30);
  const [stockDays, setStockDays] = useState<number>(30);
  const [includeInactive, setIncludeInactive] = useState<boolean | null>(null);
  const [applyRounding, setApplyRounding] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showMultiSupplierModal, setShowMultiSupplierModal] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [useSPUFilter, setUseSPUFilter] = useState<boolean>(false);
  const [spuPrefixes, setSPUPrefixes] = useState<string>("");

  useEffect(() => {
    loadSuppliers();
  }, []);

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
      setAllProducts(data.products || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };



  const getSupplierName = (supplier: any) => {
    if (supplier.person_type === "fisica") {
      return supplier.name || "—";
    }
    return supplier.trade_name || supplier.company_name || "—";
  };

  const calculateQuantity = (product: any) => {
    const currentStock = parseInt(product.stock) || 0;
    const unitsSoldLast30Days = 0; // Sales data will be calculated on backend
    const dailySalesRate = unitsSoldLast30Days / 30;
    
    let quantity = 0;
    
    switch (generationType) {
      case "out_of_stock":
        if (dailySalesRate > 0) {
          quantity = Math.ceil(dailySalesRate * stockDays);
        } else {
          quantity = 5;
        }
        break;
        
      case "curve_a":
        if (dailySalesRate > 0) {
          quantity = Math.ceil(dailySalesRate * stockDays);
        } else {
          quantity = 5;
        }
        break;
        
      case "recommended":
        const stockNeededFor30Days = dailySalesRate > 0 ? Math.ceil(dailySalesRate * 30) : 15;
        const deficit = stockNeededFor30Days - currentStock;
        
        if (deficit > 0) {
          quantity = deficit;
        } else {
          quantity = 0;
        }
        break;
        
      case "days":
        if (dailySalesRate > 0) {
          quantity = Math.ceil(dailySalesRate * daysValue);
        } else {
          quantity = 5;
        }
        break;
        
      default:
        quantity = 5;
    }
    
    if (applyRounding === true && quantity > 0) {
      quantity = Math.max(Math.ceil(quantity / 10) * 10, 10);
    }
    
    return quantity;
  };

  const handleGeneratePreview = async () => {
    if (!orderMode) {
      alert("Selecione o modo do pedido");
      return;
    }

    if (orderMode === "single" && !selectedSupplierId) {
      alert("Selecione um fornecedor");
      return;
    }

    if (!generationType) {
      alert("Selecione um tipo de geração");
      return;
    }

    if (generationType === "days" && (daysValue < 7 || daysValue > 90)) {
      alert("Digite um valor entre 7 e 90 dias");
      return;
    }

    if (applyRounding === null) {
      alert("Selecione se deseja aplicar a regra de arredondamento");
      return;
    }

    if (useSPUFilter && !spuPrefixes.trim()) {
      alert("Digite pelo menos um prefixo de SPU");
      return;
    }

    setLoading(true);
    try {
      if (orderMode === "multi") {
        const allItemsData = await apiGet("/api/products");
        
        if (!allItemsData.products || allItemsData.products.length === 0) {
          alert("Nenhum produto encontrado");
          setLoading(false);
          return;
        }

        // For multi-supplier mode, we don't pre-filter by sales data
        // The backend will handle all the filtering logic
        const filteredItems = allItemsData.products
          .filter((p: any) => {
            if (useSPUFilter && spuPrefixes.trim()) {
              const prefixes = spuPrefixes.split(',').map(p => p.trim()).filter(p => p);
              const matchesSPU = prefixes.some(prefix => p.sku.startsWith(prefix));
              if (!matchesSPU) return false;
            }
            
            if (!includeInactive) {
              const status = (p.status || "").toLowerCase();
              const isActive = status === "ativo" || status === "active";
              if (!isActive) return false;
            }
            
            // For multi-supplier, include all products that pass basic filters
            // Backend will apply sales-based filters when creating orders
            return true;
          })
          .map((p: any) => {
            const quantity = calculateQuantity(p);
            const unitPrice = parseFloat(p.price) || 0;
            
            return {
              product_id: p.id,
              sku: p.sku,
              product_name: p.name,
              image_url: p.image_url || null,
              current_stock: parseInt(p.stock) || 0,
              quantity: quantity,
              unit_price: unitPrice,
              purchase_cost: unitPrice,
              subtotal: quantity * unitPrice
            };
          });
        
        if (filteredItems.length === 0) {
          alert("Nenhum produto encontrado com os critérios selecionados");
          setLoading(false);
          return;
        }

        setPreviewItems(filteredItems);
        setShowMultiSupplierModal(true);
      } else {
        const params = new URLSearchParams({
          supplier_id: selectedSupplierId!.toString(),
          generation_type: generationType!,
          include_inactive: includeInactive ? "true" : "false",
          apply_rounding: applyRounding ? "true" : "false",
          ...(generationType === "days" && { days: daysValue.toString() }),
          ...(useSPUFilter && spuPrefixes.trim() && { spu_prefixes: spuPrefixes })
        });

        const data = await apiGet(`/api/orders/smart-preview?${params}`);

        if (data.items.length === 0) {
          alert("Nenhum produto encontrado com os critérios selecionados");
          return;
        }

        setPreviewItems(data.items);
        setStep(2);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      alert("Erro ao gerar prévia do pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedSupplierId || previewItems.length === 0) return;

    setLoading(true);
    try {
      const data = await apiPost("/api/orders/smart-create", {
        supplier_id: selectedSupplierId,
        items: previewItems,
        generation_type: generationType,
        days: generationType === "days" ? daysValue : undefined,
      });

      alert(`Pedido ${data.orderNumber} criado com sucesso!`);
      onOrderCreated();
      onClose();
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const updatedItems = [...previewItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQuantity,
      subtotal: newQuantity * updatedItems[index].unit_price
    };
    setPreviewItems(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = previewItems.filter((_, i) => i !== index);
    setPreviewItems(updatedItems);
  };

  const handleAddProduct = (product: any) => {
    const existingIndex = previewItems.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      const updatedItems = [...previewItems];
      const newQuantity = updatedItems[existingIndex].quantity + 10;
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: newQuantity,
        subtotal: newQuantity * updatedItems[existingIndex].unit_price
      };
      setPreviewItems(updatedItems);
    } else {
      const newItem = {
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        current_stock: product.stock || 0,
        quantity: 10,
        unit_price: parseFloat(product.price) || 0,
        subtotal: 10 * (parseFloat(product.price) || 0)
      };
      setPreviewItems([...previewItems, newItem]);
    }
    
    setShowAddProduct(false);
    setProductSearch("");
  };

  const getOrderSummary = () => {
    return {
      total_skus: previewItems.length,
      total_pieces: previewItems.reduce((sum, item) => sum + item.quantity, 0),
      total_value: previewItems.reduce((sum, item) => sum + item.subtotal, 0)
    };
  };

  const orderSummary = getOrderSummary();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const filteredProducts = allProducts.filter(p => {
    const query = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full my-8 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Pedido Inteligente
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 1 ? "Configurar parâmetros do pedido inteligente" : "Prévia do pedido"}
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
          {step === 1 ? (
            <>
              {/* Step 1: Complete Configuration */}
              <div className="space-y-6">
                {/* Order Mode Selection */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    1. Selecione o Modo do Pedido *
                  </Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setOrderMode("single");
                        setSelectedSupplierId(null);
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        orderMode === "single"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Fornecedor Único
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Gerar pedido para um único fornecedor
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setOrderMode("multi");
                        setSelectedSupplierId(null);
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        orderMode === "multi"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Multi-Fornecedor
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Distribuir produtos entre vários fornecedores
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Supplier Selection (only for single mode) */}
                {orderMode === "single" && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      2. Selecione o Fornecedor *
                    </Label>
                    <select
                      value={selectedSupplierId || ""}
                      onChange={(e) => setSelectedSupplierId(parseInt(e.target.value))}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                    >
                      <option value="">Selecione um fornecedor</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {getSupplierName(supplier)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      O sistema buscará apenas produtos vinculados a este fornecedor
                    </p>
                  </div>
                )}

                {/* Multi-supplier info */}
                {orderMode === "multi" && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <div className="flex gap-2">
                      <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-purple-800 dark:text-purple-200">
                        <p className="font-semibold mb-1">Modo Multi-Fornecedor</p>
                        <p>O sistema gerará uma lista de produtos baseada nos critérios selecionados. Você poderá distribuir os produtos entre diferentes fornecedores usando drag-and-drop.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generation Type */}
                {orderMode && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {orderMode === "single" ? "3" : "2"}. Escolha o Tipo de Geração *
                    </Label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Days-based generation */}
                    <button
                      onClick={() => setGenerationType("days")}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        generationType === "days"
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Gerar para X Dias
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Calcula estoque necessário para o período escolhido
                          </p>
                          {generationType === "days" && (
                            <div>
                              <Label className="text-xs mb-1">Dias de estoque (7-90):</Label>
                              <Input
                                type="number"
                                min="7"
                                max="90"
                                value={daysValue}
                                onChange={(e) => setDaysValue(parseInt(e.target.value) || 30)}
                                className="w-full"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Out of stock */}
                    <button
                      onClick={() => setGenerationType("out_of_stock")}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        generationType === "out_of_stock"
                          ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-red-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Apenas Sem Estoque
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Gera pedido somente de produtos com estoque zerado
                          </p>
                          {generationType === "out_of_stock" && (
                            <div>
                              <Label className="text-xs mb-1">Estoque para:</Label>
                              <div className="flex gap-2">
                                {[7, 15, 30].map((days) => (
                                  <button
                                    key={days}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStockDays(days);
                                    }}
                                    className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                                      stockDays === days
                                        ? "bg-red-600 text-white border-red-600"
                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-red-400"
                                    }`}
                                  >
                                    {days}D
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Curve A */}
                    <button
                      onClick={() => setGenerationType("curve_a")}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        generationType === "curve_a"
                          ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Curva A
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Produtos de alta rotatividade com estoque baixo
                          </p>
                          {generationType === "curve_a" && (
                            <div>
                              <Label className="text-xs mb-1">Estoque para:</Label>
                              <div className="flex gap-2">
                                {[7, 15, 30].map((days) => (
                                  <button
                                    key={days}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStockDays(days);
                                    }}
                                    className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                                      stockDays === days
                                        ? "bg-green-600 text-white border-green-600"
                                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-green-400"
                                    }`}
                                  >
                                    {days}D
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Recommended */}
                    <button
                      onClick={() => setGenerationType("recommended")}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        generationType === "recommended"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            Reposição Recomendada
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Baseado em análise de vendas e estoque mínimo de 30 dias
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
                )}

                {/* Rounding Rule Option */}
                {orderMode && generationType && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {orderMode === "single" ? "4" : "3"}. Regra de Arredondamento *
                    </Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setApplyRounding(false)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          applyRounding === false
                            ? "border-gray-500 bg-gray-50 dark:bg-gray-900/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              Não
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Usar quantidades exatas calculadas
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setApplyRounding(true)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          applyRounding === true
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              Sim
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Arredondar para múltiplos de 10
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {applyRounding === true && (
                      <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex gap-2">
                          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-blue-800 dark:text-blue-200">
                            <p className="font-semibold mb-1">Como funciona:</p>
                            <ul className="list-disc ml-5 space-y-0.5">
                              <li>1-14 unidades → arredonda para 10</li>
                              <li>15-24 unidades → arredonda para 20</li>
                              <li>25-34 unidades → arredonda para 30</li>
                              <li>E assim por diante...</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SPU Filter */}
                {orderMode && generationType && applyRounding !== null && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {orderMode === "single" ? "5" : "4"}. Filtro de Nível de SPU
                    </Label>
                    
                    <div className="flex items-center gap-3 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSPUFilter}
                          onChange={(e) => {
                            setUseSPUFilter(e.target.checked);
                            if (!e.target.checked) setSPUPrefixes("");
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Filtrar produtos por prefixos de SKU
                        </span>
                      </label>
                    </div>

                    {useSPUFilter && (
                      <div>
                        <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                          Digite os prefixos separados por vírgula (Ex: 515, 504, 600)
                        </Label>
                        <Input
                          value={spuPrefixes}
                          onChange={(e) => setSPUPrefixes(e.target.value)}
                          placeholder="Ex: 515, 504, 600"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Apenas produtos com SKU iniciando com esses prefixos serão incluídos
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Include Inactive Products */}
                {orderMode && generationType && applyRounding !== null && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {orderMode === "single" ? "6" : "5"}. Incluir Produtos Inativos? *
                    </Label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setIncludeInactive(false)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          includeInactive === false
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              Não
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Apenas produtos ativos
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setIncludeInactive(true)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          includeInactive === true
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              Sim
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Incluir produtos inativos
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Step 2: Preview */}
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">
                      Total de SKUs
                    </div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {orderSummary.total_skus}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                      Total de Peças
                    </div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {orderSummary.total_pieces}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <div className="text-sm text-green-600 dark:text-green-400 mb-1">
                      Valor Total
                    </div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {formatCurrency(orderSummary.total_value)}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Produtos do Pedido
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddProduct(true)}
                      className="gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Produto
                    </Button>
                  </div>

                  {previewItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                      Nenhum produto no pedido. Adicione produtos para continuar.
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                SKU
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Produto
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Estoque
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Quantidade
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Preço Unit.
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Subtotal
                              </th>
                              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewItems.map((item, index) => (
                              <tr key={index} className="border-t border-gray-100 dark:border-gray-800">
                                <td className="py-3 px-4">
                                  <code className="text-xs font-mono px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">
                                    {item.sku}
                                  </code>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {item.product_name}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline" className={
                                    item.current_stock === 0 
                                      ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                                      : "bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                  }>
                                    {item.current_stock}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                                    className="w-20 text-center font-semibold"
                                  />
                                </td>
                                <td className="py-3 px-4">
                                  {formatCurrency(item.unit_price)}
                                </td>
                                <td className="py-3 px-4 font-medium">
                                  {formatCurrency(item.subtotal)}
                                </td>
                                <td className="py-3 px-4">
                                  <button
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                                    title="Remover item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Voltar
            </Button>
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            {step === 1 ? (
              <Button
                onClick={handleGeneratePreview}
                disabled={loading || !orderMode || (orderMode === "single" && !selectedSupplierId) || !generationType || applyRounding === null || includeInactive === null || (useSPUFilter && !spuPrefixes.trim())}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Gerar Prévia do Pedido
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleCreateOrder}
                disabled={loading || previewItems.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Criar Pedido
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Supplier Modal */}
      {showMultiSupplierModal && (
        <MultiSupplierOrderModal
          items={previewItems}
          onClose={() => {
            setShowMultiSupplierModal(false);
            onClose();
          }}
          onOrdersCreated={() => {
            setShowMultiSupplierModal(false);
            onOrderCreated();
            onClose();
          }}
          applyRounding={applyRounding || false}
        />
      )}

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Adicionar Produto
              </h3>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setProductSearch("");
                  setAllProducts([]);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => {
                    if (allProducts.length === 0) {
                      loadProducts();
                    }
                  }}
                  placeholder="Buscar por nome ou SKU..."
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {productSearch ? "Nenhum produto encontrado" : "Digite para buscar produtos..."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {product.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          SKU: {product.sku}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          {formatCurrency(parseFloat(product.price) || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddProduct(false);
                  setProductSearch("");
                  setAllProducts([]);
                }}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
