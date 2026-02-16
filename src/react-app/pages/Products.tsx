import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useNotification } from "@/react-app/contexts/NotificationContext";
import { useErrorTracking } from "@/react-app/contexts/ErrorTrackingContext";
import { apiRequest } from "@/react-app/lib/apiClient";
import {
  Search,
  Plus,
  Download,
  Upload,
  Box,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  X,
  Info,
  MoreVertical,
  Pencil,
  Eye,
  Copy,
  Trash2,
  Image,
  Loader2,
  TrendingUp,
  Settings,
  Barcode,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/react-app/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { Input } from "@/react-app/components/ui/input";
import { Switch } from "@/react-app/components/ui/switch";
import CreateProductModal from "@/react-app/components/CreateProductModal";
import ProductTypeSelectionMenu from "@/react-app/components/ProductTypeSelectionMenu";
import EditProductModal from "@/react-app/components/EditProductModal";
import ConfigurationModal from "@/react-app/components/ConfigurationModal";
import GtinHistoryModal from "@/react-app/components/GtinHistoryModal";

type ProductTypeFilter = "all" | "simple" | "variation" | "kit" | "dynamic";

export default function ProductsPage() {
  const navigate = useNavigate();
  const notification = useNotification();
  const errorTracking = useErrorTracking();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGtinModal, setShowGtinModal] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<"simple" | "variation" | "kit" | "dynamic">("simple");
  const [editingProductSku, setEditingProductSku] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [useAvailableStock, setUseAvailableStock] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [totalRowsToImport, setTotalRowsToImport] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>("all");
  const [expandedSpus, setExpandedSpus] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Get unique categories from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  
  // Calculate product type counts
  // "all" should exclude parent variation products (those with product_type="variation" but are just SPU holders)
  const allProducts = products.filter(p => {
    // Exclude parent variation products (product_type === "variation" but product_id is the SPU itself)
    if (p.product_type === "variation" && p.sku === p.spu) {
      return false;
    }
    return true;
  });
  
  const productTypeCounts = {
    all: allProducts.length,
    simple: products.filter(p => p.product_type === "simple" || (!p.spu && !p.product_type)).length,
    variation: new Set(products.filter(p => p.spu && (p.product_type === "simple" || !p.product_type)).map(p => p.spu)).size,
    kit: products.filter(p => p.product_type === "kit").length,
    dynamic: products.filter(p => p.product_type === "dynamic").length,
  };
  
  // Toggle SPU expansion
  const toggleSpu = (spu: string) => {
    const newExpanded = new Set(expandedSpus);
    if (newExpanded.has(spu)) {
      newExpanded.delete(spu);
    } else {
      newExpanded.add(spu);
    }
    setExpandedSpus(newExpanded);
  };
  
  // Filter products by type
  const typeFilteredProducts = products.filter(product => {
    if (productTypeFilter === "all") {
      // In "all" view, show individual products but NOT parent variation products
      // Exclude products that are variation parents (product_type="variation" and sku === spu)
      if (product.product_type === "variation" && product.sku === product.spu) {
        return false;
      }
      return true;
    }
    if (productTypeFilter === "simple") {
      // Simple products: no SPU and not kit/dynamic
      return product.product_type === "simple" || (!product.spu && !product.product_type);
    }
    if (productTypeFilter === "variation") {
      // Variation products: has SPU and is a child variant (product_type should be "simple" for variants)
      return !!product.spu && (product.product_type === "simple" || !product.product_type);
    }
    if (productTypeFilter === "kit") {
      return product.product_type === "kit";
    }
    if (productTypeFilter === "dynamic") {
      return product.product_type === "dynamic";
    }
    return true;
  });
  
  // Filter and sort products
  const filteredProducts = typeFilteredProducts.filter(product => {
    // Search filter with wildcard support
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (product.name || "").toLowerCase();
      const sku = (product.sku || "").toLowerCase();
      const spu = (product.spu || "").toLowerCase();
      
      // Check if query contains % wildcard
      if (query.includes("%")) {
        // Convert % wildcards to regex pattern
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regexPattern = "^" + escapedQuery.replace(/%/g, ".*") + "$";
        const regex = new RegExp(regexPattern);
        
        const matchesSearch = regex.test(name) || regex.test(sku) || regex.test(spu);
        if (!matchesSearch) return false;
      } else {
        // Normal search without wildcards
        const matchesSearch = name.includes(query) || sku.includes(query) || spu.includes(query);
        if (!matchesSearch) return false;
      }
    }
    
    // Category filter
    if (categoryFilter && product.category !== categoryFilter) {
      return false;
    }
    
    // Stock filter
    if (stockFilter) {
      if (stockFilter === "in-stock" && product.stock <= 0) return false;
      if (stockFilter === "low-stock" && (product.stock === 0 || product.stock > 10)) return false;
      if (stockFilter === "out-of-stock" && product.stock > 0) return false;
    }
    
    // Status filter
    if (statusFilter) {
      if (statusFilter === "active" && product.status !== "Ativo") return false;
      if (statusFilter === "inactive" && product.status !== "Inativo") return false;
    }
    
    return true;
  }).sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    // Handle numeric fields
    if (sortField === "sale_price" || sortField === "cost_price" || sortField === "stock") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    }
    
    // Handle string fields
    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
  
  // Group products by SPU when in variation filter mode
  const displayItems = productTypeFilter === "variation" 
    ? (() => {
        const grouped = new Map<string, any[]>();
        filteredProducts.forEach(product => {
          const spu = product.spu;
          if (!grouped.has(spu)) {
            grouped.set(spu, []);
          }
          grouped.get(spu)!.push(product);
        });
        
        const items: any[] = [];
        grouped.forEach((variants, spu) => {
          // Add group header
          items.push({
            type: "group",
            spu,
            variants,
            variantCount: variants.length,
          });
          
          // Add variants if expanded
          if (expandedSpus.has(spu)) {
            variants.forEach(variant => {
              items.push({
                type: "variant",
                ...variant,
              });
            });
          }
        });
        
        return items;
      })()
    : filteredProducts.map(p => ({ type: "product", ...p }));
  
  // Pagination
  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const paginatedItems = displayItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Calculate stats (exclude orphaned parent variation products)
  const totalProducts = allProducts.length;
  const totalStockQuantity = allProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockProducts = allProducts.filter(p => p.stock > 0 && p.stock <= 10).length;
  const totalValue = allProducts.reduce((sum, p) => {
    const costPrice = p.calculated_cost_price !== undefined ? p.calculated_cost_price : (p.cost_price || 0);
    const stock = p.calculated_stock !== undefined ? p.calculated_stock : (p.stock || 0);
    return sum + (costPrice * stock);
  }, 0);
  
  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedProducts(new Set()); // Clear selection when filters change
  }, [searchQuery, categoryFilter, stockFilter, statusFilter, productTypeFilter]);

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      errorTracking.addBreadcrumb("action", "Carregando lista de produtos");
      const data = await apiRequest("/api/products");
      setProducts(data.products || []);
      setSelectedProducts(new Set()); // Clear selection after reload
    } catch (error: any) {
      console.error("Error loading products:", error);
      notification.error("Erro ao carregar produtos", error.correlationId);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      notification.warning("Selecione pelo menos um produto para excluir");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedProducts.size} produto(s) selecionado(s)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      errorTracking.addBreadcrumb("action", `Excluindo ${selectedProducts.size} produtos em massa`);
      
      const response = await apiRequest("/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus: Array.from(selectedProducts) }),
      });

      if (response.errors && response.errors.length > 0) {
        // Show errors in a notification
        const errorMsg = response.errors.slice(0, 3).join("\n");
        notification.error(`Alguns produtos não puderam ser excluídos:\n${errorMsg}`);
      }

      if (response.deleted && response.deleted.length > 0) {
        notification.success(response.message);
        loadProducts();
      }
    } catch (error: any) {
      console.error("Error bulk deleting products:", error);
      notification.error("Erro ao excluir produtos", error.correlationId);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelectProduct = (sku: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === paginatedItems.length) {
      setSelectedProducts(new Set());
    } else {
      const allSkus = new Set<string>();
      paginatedItems.forEach(item => {
        if (item.type === "product" || item.type === "variant") {
          allSkus.add(item.sku);
        }
      });
      setSelectedProducts(allSkus);
    }
  };

  const toggleProductStatus = async (productId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Ativo" ? "Inativo" : "Ativo";
      
      errorTracking.addBreadcrumb("action", `Alterando status do produto ${productId} para ${newStatus}`);
      
      await apiRequest(`/api/products/${productId}/toggle-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      // Update local state
      setProducts(products.map(p => 
        p.id === productId ? { ...p, status: newStatus } : p
      ));
      notification.success("Status do produto atualizado com sucesso");
    } catch (error: any) {
      console.error("Error toggling product status:", error);
      notification.error("Erro ao atualizar status do produto", error.correlationId);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Read file to count rows
      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        
        // Count rows excluding header
        const rowCount = data.length > 0 ? data.length - 1 : 0;
        setTotalRowsToImport(rowCount);
      } catch (error) {
        console.error("Error reading file:", error);
        setTotalRowsToImport(0);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      notification.warning("Por favor, selecione um arquivo");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportStatus("Preparando importação...");

    try {
      errorTracking.addBreadcrumb("action", `Importando arquivo: ${selectedFile.name}`);
      
      // Simulate initial progress
      setImportProgress(10);
      setImportStatus(`Lendo planilha (${totalRowsToImport} produtos)...`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("useAvailableStock", useAvailableStock.toString());

      const correlationId = sessionStorage.getItem('correlation-id');
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };
      
      if (correlationId) {
        headers['X-Correlation-Id'] = correlationId;
      }

      // Start progress simulation
      setImportProgress(20);
      setImportStatus(`Importando produtos...`);
      
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) return 90;
          return prev + 5;
        });
      }, 200);

      const response = await fetch("/api/products/import", {
        method: "POST",
        headers,
        body: formData,
      });

      clearInterval(progressInterval);
      
      const data = await response.json();

      if (response.ok) {
        setImportProgress(100);
        setImportStatus(`Concluído! ${data.imported} novos, ${data.updated} atualizados`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        notification.success(data.message);
        setShowImportModal(false);
        setSelectedFile(null);
        setUseAvailableStock(false);
        setTotalRowsToImport(0);
        loadProducts();
      } else {
        const errorId = response.headers.get('X-Correlation-Id') || correlationId;
        notification.error(data.error || "Erro ao importar produtos", errorId || undefined);
      }
    } catch (error: any) {
      console.error("Error importing:", error);
      notification.error("Erro ao importar produtos", error.correlationId);
    } finally {
      setImporting(false);
      setImportProgress(0);
      setImportStatus("");
    }
  };

  const handleImageUpload = async (productId: number, file: File) => {
    setUploadingImageId(productId);
    
    try {
      errorTracking.addBreadcrumb("action", `Upload de imagem para produto ${productId}`);
      
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);

      const correlationId = sessionStorage.getItem('correlation-id');
      const headers: HeadersInit = {
        Authorization: `Bearer ${token}`,
      };
      
      if (correlationId) {
        headers['X-Correlation-Id'] = correlationId;
      }

      const response = await fetch(`/api/products/${productId}/image`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // Update product with new image URL
        setProducts(products.map(p => 
          p.id === productId ? { ...p, image_url: data.image_url } : p
        ));
        notification.success("Imagem atualizada com sucesso");
      } else {
        const errorId = response.headers.get('X-Correlation-Id') || correlationId;
        notification.error("Erro ao fazer upload da imagem", errorId || undefined);
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      notification.error("Erro ao fazer upload da imagem", error.correlationId);
    } finally {
      setUploadingImageId(null);
    }
  };

  const handleImageClick = (productId: number) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.productId = productId.toString();
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = e.target.dataset.productId;
    
    if (file && productId) {
      handleImageUpload(parseInt(productId), file);
    }
    
    // Reset input
    e.target.value = "";
  };

  return (
    <div className="p-4 lg:p-6 bg-[#f7f8fa] min-h-screen">
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Product Type Selection Menu */}
      <ProductTypeSelectionMenu
        isOpen={showTypeMenu}
        onClose={() => setShowTypeMenu(false)}
        onSelectType={(type) => {
          setSelectedProductType(type);
          setShowTypeMenu(false);
          setTimeout(() => {
            setShowCreateModal(true);
          }, 0);
        }}
      />

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadProducts}
        initialProductType={selectedProductType}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProductSku("");
        }}
        onSuccess={loadProducts}
        productSku={editingProductSku}
      />

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />

      {/* GTIN History Modal */}
      <GtinHistoryModal
        isOpen={showGtinModal}
        onClose={() => setShowGtinModal(false)}
      />
      
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">Importar Produtos</h5>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {importing ? (
                <div className="space-y-4 py-8">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
                    
                    <div className="w-full max-w-md space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {importStatus}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 font-mono">
                          {importProgress}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                      
                      {totalRowsToImport > 0 && (
                        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                          Processando {totalRowsToImport} linhas da planilha
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload XLSX File
                    </label>
                    <Input
                      type="file"
                      accept=".xlsx"
                      className="w-full"
                      onChange={handleFileChange}
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Faça upload de um arquivo XLSX começando com: Lista_de_Estoque_
                    </p>
                    {totalRowsToImport > 0 && (
                      <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                        ✓ Arquivo selecionado: {totalRowsToImport} produtos para importar
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <label htmlFor="available-stock-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                        Usar Estoque Disponível
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {useAvailableStock 
                          ? "Usando coluna I (Disponível)" 
                          : "Usando coluna J (Estoque Atual)"}
                      </p>
                    </div>
                    <Switch
                      id="available-stock-toggle"
                      checked={useAvailableStock}
                      onCheckedChange={setUseAvailableStock}
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex gap-2">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-semibold mb-1">Estrutura da Planilha (Linha 1):</p>
                        <ul className="space-y-1 text-xs">
                          <li>• <strong>A1:</strong> SKU</li>
                          <li>• <strong>B1:</strong> Título</li>
                          <li>• <strong>C1:</strong> Armazém</li>
                          <li>• <strong>D1:</strong> Estante</li>
                          <li>• <strong>E1:</strong> Estoque Baixo</li>
                          <li>• <strong>F1:</strong> Em Trânsito(Compra)</li>
                          <li>• <strong>G1:</strong> Em Trânsito(Transferência)</li>
                          <li>• <strong>H1:</strong> Ocupado</li>
                          <li className={useAvailableStock ? "text-blue-600 dark:text-blue-400 font-semibold" : ""}>
                            • <strong>I1:</strong> Disponível {useAvailableStock && "← Selecionado"}
                          </li>
                          <li className={!useAvailableStock ? "text-blue-600 dark:text-blue-400 font-semibold" : ""}>
                            • <strong>J1:</strong> Estoque Atual {!useAvailableStock && "← Selecionado"}
                          </li>
                          <li>• <strong>K1:</strong> Custo Médio</li>
                          <li>• <strong>L1:</strong> Subtotal</li>
                        </ul>
                        <p className="mt-2 text-xs">
                          <strong>Nota:</strong> Todos os produtos importados terão status "Ativo" e categoria "Sem Categoria"
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!importing && (
              <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleImport} disabled={!selectedFile}>
                  Importar Produtos
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Produtos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie seu catálogo de produtos</p>
          {selectedProducts.size > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {selectedProducts.size} produto(s) selecionado(s)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selectedProducts.size > 0 && (
            <Button 
              variant="outline" 
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Selecionados
                </>
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowGtinModal(true)}>
            <Barcode className="w-4 h-4 mr-2" />
            GTIN/EAN
          </Button>
          <Button variant="outline" onClick={() => setShowConfigModal(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Configuração
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setShowTypeMenu(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center mr-3">
                <Box className="w-6 h-6" />
              </div>
              <div>
                <h6 className="mb-0 text-sm text-gray-600 dark:text-gray-400">Total de Produtos</h6>
                <h3 className="mb-0 text-2xl font-bold text-gray-900 dark:text-white">{totalProducts}</h3>
                <small className="text-green-600 dark:text-green-400">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  +5% último mês
                </small>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center mr-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h6 className="mb-0 text-sm text-gray-600 dark:text-gray-400">Em Estoque</h6>
                <h3 className="mb-0 text-2xl font-bold text-gray-900 dark:text-white">{totalStockQuantity.toLocaleString()}</h3>
                <small className="text-green-600 dark:text-green-400">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  Bem estocado
                </small>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg flex items-center justify-center mr-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h6 className="mb-0 text-sm text-gray-600 dark:text-gray-400">Estoque Baixo</h6>
                <h3 className="mb-0 text-2xl font-bold text-gray-900 dark:text-white">{lowStockProducts}</h3>
                <small className="text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Requer atenção
                </small>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 lg:p-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 rounded-lg flex items-center justify-center mr-3">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h6 className="mb-0 text-sm text-gray-600 dark:text-gray-400">Valor Total</h6>
                <h3 className="mb-0 text-2xl font-bold text-gray-900 dark:text-white">R$ {totalValue.toLocaleString()}</h3>
                <small className="text-cyan-600 dark:text-cyan-400">
                  <Info className="w-3 h-3 inline mr-1" />
                  Valor do inventário
                </small>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card className="shadow-md">
        <CardHeader className="bg-transparent border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-4">
            {/* Product Type Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setProductTypeFilter("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  productTypeFilter === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Tudo <span className="ml-1 opacity-75">{productTypeCounts.all}</span>
              </button>
              <button
                onClick={() => setProductTypeFilter("simple")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  productTypeFilter === "simple"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Único <span className="ml-1 opacity-75">{productTypeCounts.simple}</span>
              </button>
              <button
                onClick={() => setProductTypeFilter("variation")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  productTypeFilter === "variation"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Multi-Variantes <span className="ml-1 opacity-75">{productTypeCounts.variation}</span>
              </button>
              <button
                onClick={() => setProductTypeFilter("kit")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  productTypeFilter === "kit"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                KIT <span className="ml-1 opacity-75">{productTypeCounts.kit}</span>
              </button>
              <button
                onClick={() => setProductTypeFilter("dynamic")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  productTypeFilter === "dynamic"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                Dinâmico <span className="ml-1 opacity-75">{productTypeCounts.dynamic}</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-3 pr-9 text-sm w-[200px] bg-white dark:bg-gray-800"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-[150px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
              >
                <option value="">Todas Categorias</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-[150px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
              >
                <option value="">Todos Estoques</option>
                <option value="in-stock">Em Estoque</option>
                <option value="low-stock">Estoque Baixo</option>
                <option value="out-of-stock">Sem Estoque</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm w-[150px] focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
              >
                <option value="">Todos Status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={paginatedItems.length > 0 && selectedProducts.size === paginatedItems.filter(i => i.type === "product" || i.type === "variant").length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {productTypeFilter === "variation" ? "SPU" : "SKU"}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Produto
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort("category")}
                  >
                    Categoria {sortField === "category" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Custo
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort("sale_price")}
                  >
                    Preço {sortField === "sale_price" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort("stock")}
                  >
                    Estoque {sortField === "stock" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Carregando produtos...
                    </td>
                  </tr>
                ) : displayItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Nenhum produto encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    if (item.type === "group") {
                      // Render SPU group header
                      const isExpanded = expandedSpus.has(item.spu);
                      // Get the base name from the first variant (removing color and size)
                      const firstVariant = item.variants[0];
                      let baseName = firstVariant?.name || item.spu;
                      
                      // Try to extract base name by removing color/size names if present
                      if (firstVariant) {
                        const variantData = products.find(p => p.id === firstVariant.id);
                        if (variantData) {
                          // Find variant info from product_variants table
                          baseName = variantData.name;
                          
                          // Remove color and size from name to get base
                          item.variants.forEach((v: any) => {
                            const vData = products.find(p => p.id === v.id);
                            if (vData?.name) {
                              // Extract common base name by finding the shortest common prefix
                              const words = vData.name.split(' ');
                              if (words.length >= 2) {
                                baseName = words.slice(0, -2).join(' ') || words[0];
                              }
                            }
                          });
                        }
                      }
                      
                      return (
                        <tr
                          key={`group-${item.spu}`}
                          className="bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20 cursor-pointer"
                          onClick={() => toggleSpu(item.spu)}
                        >
                          <td className="px-4 py-3">
                            {/* Empty cell for checkbox column in group header */}
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs text-blue-600 dark:text-blue-400 font-mono">{item.spu}</code>
                          </td>
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              )}
                              <span className="font-medium text-blue-900 dark:text-blue-100">
                                {baseName}
                              </span>
                              <Badge variant="secondary" className="bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100">
                                Variantes ({item.variantCount})
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    } else if (item.type === "variant") {
                      // Render variant row (indented)
                      return (
                        <tr key={`variant-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(item.sku)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectProduct(item.sku);
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 pl-12">
                            <div>
                              <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">{item.sku}</code>
                              {item.product_id && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                  ID: {item.product_id}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleImageClick(item.id)}
                                disabled={uploadingImageId === item.id}
                                className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden hover:opacity-80 transition-opacity relative group"
                                title="Clique para adicionar foto"
                              >
                                {uploadingImageId === item.id ? (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                                  </div>
                                ) : item.image_url ? (
                                  <>
                                    <img 
                                      src={item.image_url} 
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Upload className="w-4 h-4 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Image className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                                  </div>
                                )}
                              </button>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{item.category || "Sem Categoria"}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            R$ {Number(item.cost_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">
                            R$ {Number(item.sale_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900 dark:text-white">
                              {item.stock || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.status === "Ativo"}
                                onCheckedChange={() => toggleProductStatus(item.id, item.status)}
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {item.status === "Ativo" ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigate(`/produtos/${item.product_id}/editar`);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={async () => {
                                      if (!confirm(`Tem certeza que deseja excluir o produto ${item.sku}?`)) {
                                        return;
                                      }
                                      
                                      try {
                                        const response = await fetch(`/api/products/${item.sku}`, {
                                          method: "DELETE",
                                        });

                                        if (response.ok) {
                                          notification.success("Produto excluído com sucesso!");
                                          loadProducts();
                                        } else {
                                          const data = await response.json();
                                          notification.error(data.error || "Erro ao excluir produto");
                                        }
                                      } catch (error) {
                                        console.error("Error deleting product:", error);
                                        notification.error("Erro ao excluir produto");
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    } else {
                      // Render normal product row
                      const product = item;
                      return (
                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedProducts.has(product.sku)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectProduct(product.sku);
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">{product.sku}</code>
                              {product.product_id && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                                  ID: {product.product_id}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleImageClick(product.id)}
                                disabled={uploadingImageId === product.id}
                                className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden hover:opacity-80 transition-opacity relative group"
                                title="Clique para adicionar foto"
                              >
                                {uploadingImageId === product.id ? (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                                  </div>
                                ) : product.image_url ? (
                                  <>
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Upload className="w-4 h-4 text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Image className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                                  </div>
                                )}
                              </button>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{product.category || "Sem Categoria"}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                            <div>
                              <span className="text-sm">
                                R$ {Number(product.calculated_cost_price !== undefined ? product.calculated_cost_price : product.cost_price).toFixed(2)}
                              </span>
                              {(product.product_type === "kit" || product.product_type === "dynamic") && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {product.product_type === "kit" ? "Calculado" : "Média"}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-900 dark:text-white">
                            R$ {Number(product.sale_price || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-900 dark:text-white">
                              {product.calculated_stock !== undefined ? product.calculated_stock : (product.stock || 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={product.status === "Ativo"}
                                onCheckedChange={() => toggleProductStatus(product.id, product.status)}
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {product.status === "Ativo" ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigate(`/produtos/${product.product_id}/editar`);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Duplicar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={async () => {
                                      if (!confirm(`Tem certeza que deseja excluir o produto ${product.sku}?`)) {
                                        return;
                                      }
                                      
                                      try {
                                        const response = await fetch(`/api/products/${product.sku}`, {
                                          method: "DELETE",
                                        });

                                        if (response.ok) {
                                          notification.success("Produto excluído com sucesso!");
                                          loadProducts();
                                        } else {
                                          const data = await response.json();
                                          notification.error(data.error || "Erro ao excluir produto");
                                        }
                                      } catch (error) {
                                        console.error("Error deleting product:", error);
                                        notification.error("Erro ao excluir produto");
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {displayItems.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={300}>300</option>
                  <option value={500}>500</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, displayItems.length)} de {displayItems.length} resultados
              </div>
              
              <nav>
                <ul className="flex gap-1">
                  <li>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                  </li>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <li key={i}>
                        <Button
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      </li>
                    );
                  })}
                  
                  <li>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                    </Button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
