import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/react-app/components/ui/input";
import { Button } from "@/react-app/components/ui/button";

interface Product {
  id: number;
  sku: string;
  name: string;
  image_url: string | null;
  current_purchase_cost: number;
}

interface ProductSearchSelectProps {
  onSelect: (product: Product, quantity: number, cost: number, reason: string) => void;
  onClose: () => void;
}

export default function ProductSearchSelect({ onSelect, onClose }: ProductSearchSelectProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [cost, setCost] = useState("");
  const [errorReason, setErrorReason] = useState("Tamanho não solicitado");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setFilteredProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setCost(product.current_purchase_cost?.toString() || "0");
  };

  const handleConfirm = () => {
    if (!selectedProduct) return;
    
    const qty = parseInt(quantity) || 0;
    const costValue = parseFloat(cost) || 0;
    
    if (qty <= 0) {
      alert("Por favor, insira uma quantidade válida");
      return;
    }
    
    if (costValue <= 0) {
      alert("Por favor, insira um custo válido");
      return;
    }
    
    onSelect(selectedProduct, qty, costValue, errorReason);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Selecionar Produto
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou SKU..."
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando produtos...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nenhum produto encontrado</div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProduct?.id === product.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  {/* Product Image */}
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

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      SKU: {product.sku}
                    </div>
                    {product.current_purchase_cost > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Custo atual: R$ {product.current_purchase_cost.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {selectedProduct?.id === product.id && (
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Product Details */}
        {selectedProduct && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Detalhes do Item
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantidade
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantidade"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custo Unitário (R$)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motivo do Recebimento Incorreto
              </label>
              <select
                value={errorReason}
                onChange={(e) => setErrorReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800"
              >
                <option value="Tamanho não solicitado">Tamanho não solicitado</option>
                <option value="Modelo não solicitado">Modelo não solicitado</option>
                <option value="Estampa não solicitada">Estampa não solicitada</option>
                <option value="Solicitação para acrescentar">Solicitação para acrescentar</option>
              </select>
            </div>
            {parseFloat(cost) > 0 && parseInt(quantity) > 0 && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total: </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  R$ {(parseFloat(cost) * parseInt(quantity)).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedProduct}>
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
