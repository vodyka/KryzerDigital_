import { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical, Search, ChevronDown, Package } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Badge } from "@/react-app/components/ui/badge";
import ConfirmDialog from "@/react-app/components/ConfirmDialog";
import { apiGet, apiPost } from "@/react-app/lib/api";

interface MultiSupplierOrderModalProps {
  items: any[];
  onClose: () => void;
  onOrdersCreated: () => void;
  applyRounding: boolean;
}

interface SupplierGroup {
  id: string;
  supplierId: number | null;
  supplierName: string;
  items: any[];
  isExpanded: boolean;
}

interface DialogState {
  open: boolean;
  type: "confirm" | "alert" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function MultiSupplierOrderModal({
  items: initialItems,
  onClose,
  onOrdersCreated,
  applyRounding,
}: MultiSupplierOrderModalProps) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [unassignedItems, setUnassignedItems] = useState<any[]>(initialItems);
  const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([]);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [draggedFromGroup, setDraggedFromGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedUnassignedItems, setSelectedUnassignedItems] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "alert",
    title: "",
    message: "",
  });

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

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

  const addSupplierGroup = () => {
    const newGroup: SupplierGroup = {
      id: Date.now().toString(),
      supplierId: null,
      supplierName: "Selecione um fornecedor",
      items: [],
      isExpanded: true,
    };
    setSupplierGroups([...supplierGroups, newGroup]);
  };

  const removeSupplierGroup = (groupId: string) => {
    const group = supplierGroups.find((g) => g.id === groupId);
    if (group && group.items.length > 0) {
      // Return items to unassigned
      setUnassignedItems([...unassignedItems, ...group.items]);
    }
    setSupplierGroups(supplierGroups.filter((g) => g.id !== groupId));
  };

  const updateSupplier = (groupId: string, supplierId: number) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    setSupplierGroups(
      supplierGroups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              supplierId,
              supplierName: getSupplierName(supplier),
            }
          : g
      )
    );
  };

  const toggleGroupExpansion = (groupId: string) => {
    setSupplierGroups(
      supplierGroups.map((g) => (g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g))
    );
  };

  const handleDragStart = (item: any, fromGroup: string | null) => {
    setDraggedItem(item);
    setDraggedFromGroup(fromGroup);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetGroupId: string | null) => {
    if (!draggedItem) return;

    if (draggedFromGroup === targetGroupId) {
      setDraggedItem(null);
      setDraggedFromGroup(null);
      return;
    }

    // Remove from source
    if (draggedFromGroup === null) {
      setUnassignedItems(unassignedItems.filter((item) => item.product_id !== draggedItem.product_id));
    } else {
      setSupplierGroups(
        supplierGroups.map((g) =>
          g.id === draggedFromGroup ? { ...g, items: g.items.filter((item) => item.product_id !== draggedItem.product_id) } : g
        )
      );
    }

    // Add to target
    if (targetGroupId === null) {
      setUnassignedItems([...unassignedItems, draggedItem]);
    } else {
      setSupplierGroups(
        supplierGroups.map((g) => (g.id === targetGroupId ? { ...g, items: [...g.items, draggedItem] } : g))
      );
    }

    setDraggedItem(null);
    setDraggedFromGroup(null);
  };

  const updateItemQuantity = (groupId: string | null, productId: number, newQuantity: number) => {
    if (newQuantity <= 0) return;

    if (groupId === null) {
      setUnassignedItems(
        unassignedItems.map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: newQuantity * item.unit_price,
              }
            : item
        )
      );
    } else {
      setSupplierGroups(
        supplierGroups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                items: g.items.map((item) =>
                  item.product_id === productId
                    ? {
                        ...item,
                        quantity: newQuantity,
                        subtotal: newQuantity * item.unit_price,
                      }
                    : item
                ),
              }
            : g
        )
      );
    }
  };

  const removeItem = (groupId: string | null, productId: number) => {
    if (groupId === null) {
      setUnassignedItems(unassignedItems.filter((item) => item.product_id !== productId));
      setSelectedUnassignedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    } else {
      setSupplierGroups(
        supplierGroups.map((g) =>
          g.id === groupId ? { ...g, items: g.items.filter((item) => item.product_id !== productId) } : g
        )
      );
    }
  };

  const toggleUnassignedItemSelection = (productId: number) => {
    setSelectedUnassignedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleAllUnassignedItems = () => {
    if (selectedUnassignedItems.size === unassignedItems.length) {
      setSelectedUnassignedItems(new Set());
    } else {
      setSelectedUnassignedItems(new Set(unassignedItems.map((item) => item.product_id)));
    }
  };

  const deleteSelectedUnassignedItems = () => {
    if (selectedUnassignedItems.size === 0) return;
    
    showDialog(
      "confirm",
      "Confirmar exclusão",
      `Excluir ${selectedUnassignedItems.size} produto(s) selecionado(s)?`,
      () => {
        setUnassignedItems(unassignedItems.filter((item) => !selectedUnassignedItems.has(item.product_id)));
        setSelectedUnassignedItems(new Set());
      }
    );
  };

  const deleteAllUnassignedItems = () => {
    if (unassignedItems.length === 0) return;
    
    showDialog(
      "confirm",
      "Confirmar exclusão",
      `Excluir todos os ${unassignedItems.length} produtos não atribuídos?`,
      () => {
        setUnassignedItems([]);
        setSelectedUnassignedItems(new Set());
      }
    );
  };

  const handleAddProduct = (product: any, targetGroupId: string | null) => {
    const newItem = {
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
      image_url: product.image_url || null,
      quantity: 10,
      unit_price: parseFloat(product.price) || 0,
      purchase_cost: parseFloat(product.price) || 0,
      subtotal: 10 * (parseFloat(product.price) || 0),
    };

    if (targetGroupId === null) {
      setUnassignedItems([...unassignedItems, newItem]);
    } else {
      setSupplierGroups(
        supplierGroups.map((g) => (g.id === targetGroupId ? { ...g, items: [...g.items, newItem] } : g))
      );
    }

    setShowAddProduct(false);
    setProductSearch("");
  };

  const handleCreateOrders = async () => {
    // Validate: all groups must have a supplier selected
    const invalidGroups = supplierGroups.filter((g) => g.items.length > 0 && !g.supplierId);
    if (invalidGroups.length > 0) {
      showDialog("error", "Erro de validação", "Todos os fornecedores com produtos devem ser selecionados");
      return;
    }

    // Validate: at least one group with items
    const groupsWithItems = supplierGroups.filter((g) => g.items.length > 0);
    if (groupsWithItems.length === 0) {
      showDialog("error", "Erro de validação", "Adicione pelo menos um produto a um fornecedor");
      return;
    }

    setLoading(true);
    try {
      const createdOrders = [];

      for (const group of groupsWithItems) {
        // Get next order number
        const numberData = await apiGet("/api/orders/next-number");

        // Create order
        try {
          const data = await apiPost("/api/orders", {
            supplier_id: group.supplierId,
            order_number: numberData.order_number,
            discount: 0,
            shipping_cost: 0,
            other_costs: 0,
            payment_method: "Pix",
            payment_type: "À Vista",
            installments: 1,
            is_grouped: false,
            items: group.items,
          });

          createdOrders.push({
            supplier: group.supplierName,
            orderNumber: data.order_number,
          });
        } catch (error: any) {
          showDialog("error", "Erro ao criar pedido", `Erro ao criar pedido para ${group.supplierName}: ${error.message}`);
          return;
        }
      }

      const orderList = createdOrders.map((o) => `${o.orderNumber} (${o.supplier})`).join(", ");
      showDialog("success", "Pedidos criados", `${createdOrders.length} pedido(s) criado(s) com sucesso:\n${orderList}`, () => {
        onOrdersCreated();
        onClose();
      });
    } catch (error) {
      console.error("Error creating orders:", error);
      showDialog("error", "Erro", "Erro ao criar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getGroupTotal = (group: SupplierGroup) => {
    return group.items.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const filteredProducts = allProducts.filter((p) => {
    const query = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query);
  });

  const renderItemCard = (item: any, groupId: string | null) => {
    const isUnassigned = groupId === null;
    const isSelected = isUnassigned && selectedUnassignedItems.has(item.product_id);

    return (
      <div
        key={item.product_id}
        draggable
        onDragStart={() => handleDragStart(item, groupId)}
        className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg cursor-move hover:border-blue-400 dark:hover:border-blue-500 transition-colors group ${
          isSelected ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
        }`}
      >
        {isUnassigned && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleUnassignedItemSelection(item.product_id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
          />
        )}
        <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-6 h-6 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.product_name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">SKU: {item.sku}</div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => updateItemQuantity(groupId, item.product_id, parseInt(e.target.value) || 1)}
          className="w-16 h-8 text-center text-sm"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 w-20 text-right">
          {formatCurrency(item.subtotal)}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeItem(groupId, item.product_id);
          }}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full my-8 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Distribuir Produtos por Fornecedor</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Arraste e solte os produtos para os fornecedores correspondentes
              </p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" disabled={loading}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Unassigned Items */}
              <div className="lg:col-span-2">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Produtos Não Atribuídos</h3>
                      <Badge variant="outline">{unassignedItems.length}</Badge>
                    </div>
                    {unassignedItems.length > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedUnassignedItems.size === unassignedItems.length && unassignedItems.length > 0}
                        onChange={toggleAllUnassignedItems}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        title="Selecionar todos"
                      />
                    )}
                  </div>

                  <div
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(null)}
                    className="space-y-2 min-h-[200px]"
                  >
                    {unassignedItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                        Todos os produtos foram atribuídos
                      </div>
                    ) : (
                      unassignedItems.map((item) => renderItemCard(item, null))
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddProduct(true)}
                      className="w-full"
                      disabled={loading}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Produto
                    </Button>
                    
                    {unassignedItems.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deleteSelectedUnassignedItems}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          disabled={loading || selectedUnassignedItems.size === 0}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir {selectedUnassignedItems.size > 0 ? `(${selectedUnassignedItems.size})` : 'Selecionados'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deleteAllUnassignedItems}
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Tudo
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Supplier Groups */}
              <div className="lg:col-span-3">
                <div className="space-y-4">
                  {supplierGroups.map((group) => (
                    <div key={group.id} className="bg-white dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Group Header */}
                      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => toggleGroupExpansion(group.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <ChevronDown
                            className={`w-5 h-5 text-gray-500 transition-transform ${
                              group.isExpanded ? "" : "-rotate-90"
                            }`}
                          />
                        </button>

                        <select
                          value={group.supplierId || ""}
                          onChange={(e) => updateSupplier(group.id, parseInt(e.target.value))}
                          className="flex-1 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                          disabled={loading}
                        >
                          <option value="">Selecione um fornecedor</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {getSupplierName(supplier)}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{group.items.length} itens</Badge>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {formatCurrency(getGroupTotal(group))}
                          </div>
                          <button
                            onClick={() => removeSupplierGroup(group.id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Group Items */}
                      {group.isExpanded && (
                        <div
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(group.id)}
                          className="p-4 space-y-2 min-h-[150px] bg-gray-50/50 dark:bg-gray-800/50"
                        >
                          {group.items.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              Arraste produtos aqui
                            </div>
                          ) : (
                            group.items.map((item) => renderItemCard(item, group.id))
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <Button variant="outline" onClick={addSupplierGroup} className="w-full" disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Fornecedor
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {applyRounding && "Regra de arredondamento aplicada (múltiplos de 10)"}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleCreateOrders} disabled={loading}>
                {loading ? "Criando..." : "Criar Pedidos"}
              </Button>
            </div>
          </div>
        </div>

        {/* Add Product Modal */}
        {showAddProduct && (
          <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Adicionar Produto</h3>
                <button
                  onClick={() => {
                    setShowAddProduct(false);
                    setProductSearch("");
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
                    placeholder="Buscar por nome ou SKU..."
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {productSearch ? "Nenhum produto encontrado" : "Carregando produtos..."}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleAddProduct(product, null)}
                        className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Sem foto</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">SKU: {product.sku}</div>
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
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
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
