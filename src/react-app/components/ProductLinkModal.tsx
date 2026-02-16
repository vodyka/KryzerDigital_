import { useState, useEffect } from "react";
import { X, Search, Link, Hash, Trash2, Package } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Badge } from "@/react-app/components/ui/badge";
import { apiGet, apiPost, apiDelete } from "@/react-app/lib/api";

interface ProductLinkModalProps {
  supplierId: number;
  onClose: () => void;
}

export default function ProductLinkModal({ supplierId, onClose }: ProductLinkModalProps) {
  const [linkType, setLinkType] = useState<"individual" | "pattern">("individual");
  const [products, setProducts] = useState<any[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<any[]>([]);
  const [skuPatterns, setSkuPatterns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [skuPattern, setSkuPattern] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadAvailableProducts();
    loadLinkedProducts();
  }, []);

  const loadAvailableProducts = async () => {
    try {
      const data = await apiGet("/api/supplier-products");
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadLinkedProducts = async () => {
    setLoadingData(true);
    try {
      const data = await apiGet(`/api/supplier-products/${supplierId}`);
      setLinkedProducts(data.products || []);
      setSkuPatterns(data.sku_patterns || []);
    } catch (error) {
      console.error("Error loading linked products:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLinkProduct = async () => {
    if (linkType === "individual" && selectedProductIds.length === 0) {
      alert("Selecione pelo menos um produto");
      return;
    }
    
    if (linkType === "pattern" && !skuPattern.trim()) {
      alert("Digite um ou mais padrões SKU");
      return;
    }
    
    setLoading(true);
    try {
      if (linkType === "pattern") {
        // Handle multiple patterns
        const patterns = skuPattern.split('\n').map(p => p.trim()).filter(p => p);
        
        for (const pattern of patterns) {
          try {
            await apiPost(`/api/supplier-products/${supplierId}`, {
              link_type: "pattern",
              sku_pattern: pattern,
            });
          } catch (error: any) {
            alert(`Erro ao vincular padrão ${pattern}: ${error.message}`);
          }
        }
        
        setSkuPattern("");
        loadLinkedProducts();
      } else {
        // Handle multiple individual products
        for (const productId of selectedProductIds) {
          try {
            await apiPost(`/api/supplier-products/${supplierId}`, {
              link_type: "individual",
              product_id: productId,
            });
          } catch (error: any) {
            const product = products.find(p => p.id === productId);
            alert(`Erro ao vincular ${product?.name || 'produto'}: ${error.message}`);
          }
        }
        
        setSelectedProductIds([]);
        loadLinkedProducts();
      }
    } catch (error) {
      console.error("Error linking product:", error);
      alert("Erro ao vincular produto");
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleRemoveLink = async (linkId: number) => {
    if (!confirm("Deseja remover este vínculo?")) return;
    
    try {
      await apiDelete(`/api/supplier-products/${supplierId}/${linkId}`);
      loadLinkedProducts();
    } catch (error) {
      console.error("Error removing link:", error);
      alert("Erro ao remover vínculo");
    }
  };

  const getPatternMatchCount = (pattern: string) => {
    // Count from all products (not just filtered/unlinked ones)
    return products.filter(p => p.sku.startsWith(pattern)).length;
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = searchQuery === "" || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Don't show already linked products
    const alreadyLinked = linkedProducts.some(lp => lp.id === p.id);
    
    return matchesSearch && !alreadyLinked;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Vincular Produtos ao Fornecedor
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Link Type Selector */}
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Vínculo
            </Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="individual"
                  checked={linkType === "individual"}
                  onChange={() => setLinkType("individual")}
                  className="w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Produto Individual</span>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="pattern"
                  checked={linkType === "pattern"}
                  onChange={() => setLinkType("pattern")}
                  className="w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Por Padrão SKU</span>
                </div>
              </label>
            </div>
          </div>

          {/* Link Form */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
            {linkType === "individual" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selecionar Produtos
                  </Label>
                  {selectedProductIds.length > 0 && (
                    <Badge className="bg-blue-600">
                      {selectedProductIds.length} selecionado{selectedProductIds.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Buscar por SKU ou nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                  {filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      {searchQuery ? "Nenhum produto encontrado" : "Todos os produtos já estão vinculados"}
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <label
                        key={product.id}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                          selectedProductIds.includes(product.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {product.sku}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {product.category || "Sem categoria"} • Estoque: {product.stock}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          R$ {product.price.toFixed(2)}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="skuPattern" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Padrões SKU (um por linha)
                </Label>
                <textarea
                  id="skuPattern"
                  value={skuPattern}
                  onChange={(e) => setSkuPattern(e.target.value.toUpperCase())}
                  placeholder="Ex: 500&#10;600&#10;700"
                  className="mt-2 flex min-h-[100px] w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Digite um ou mais padrões SKU, um por linha. Exemplo: "500" vinculará todos produtos com SKU iniciando em 500
                </p>
                {skuPattern && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                    {skuPattern.split('\n').filter(p => p.trim()).map((pattern, idx) => (
                      <p key={idx} className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>{getPatternMatchCount(pattern.trim())}</strong> produto(s) correspondem ao padrão "{pattern.trim()}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleLinkProduct}
                disabled={loading || (linkType === "individual" && selectedProductIds.length === 0) || (linkType === "pattern" && !skuPattern.trim())}
              >
                {loading ? "Vinculando..." : linkType === "individual" && selectedProductIds.length > 1 
                  ? `Vincular ${selectedProductIds.length} Produtos` 
                  : "Vincular"}
              </Button>
            </div>
          </div>

          {/* Linked Products */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Produtos Vinculados
            </h3>
            
            {loadingData ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando vínculos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* SKU Patterns */}
                {skuPatterns.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Hash className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Padrões SKU
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {skuPatterns.map((pattern) => (
                        <div
                          key={pattern.id}
                          className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-purple-600 text-white">Padrão</Badge>
                              <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                {pattern.pattern}*
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {getPatternMatchCount(pattern.pattern)} produto(s) correspondem
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveLink(pattern.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Products */}
                {linkedProducts.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Link className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Produtos Individuais
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {linkedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {product.sku}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {product.category || "Sem categoria"} • R$ {product.price.toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveLink(product.link_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {linkedProducts.length === 0 && skuPatterns.length === 0 && !loadingData && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum produto vinculado</p>
                    <p className="text-sm mt-1">Adicione produtos ou padrões SKU acima</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
