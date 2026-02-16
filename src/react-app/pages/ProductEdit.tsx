import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useNotification } from "@/react-app/contexts/NotificationContext";
import { apiRequest } from "@/react-app/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Textarea } from "@/react-app/components/ui/textarea";
import { Switch } from "@/react-app/components/ui/switch";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Loader2,
  Package,
  ShoppingBag,
  Info
} from "lucide-react";
import MapMLListingModal from "@/react-app/components/MapMLListingModal";

interface Product {
  id: number;
  sku: string;
  name: string;
  alias_name?: string;
  use_alias_in_nfe?: boolean;
  category?: string;
  barcode?: string;
  mpn?: string;
  is_active?: boolean;
  sale_price?: number;
  cost_price?: number;
  description?: string;
  brand?: string;
  weight?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  ncm?: string;
  cest?: string;
  unit?: string;
  origin?: string;
  stock?: number;
}

interface MLMapping {
  id: number;
  ml_listing_id: string;
  ml_variation_id?: string;
  ml_title: string;
  ml_thumbnail?: string;
  ml_store_name: string;
  created_at: string;
}

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notification = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [mappings, setMappings] = useState<MLMapping[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [deletingMapping, setDeletingMapping] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchProductData();
    }
  }, [id]);

  const fetchProductData = async () => {
    setLoading(true);
    try {
      // Fetch product by ID - apiRequest already returns parsed JSON
      console.log('[ProductEdit] Fetching product by ID:', id);
      const productData = await apiRequest(`/api/products/by-id/${id}`);
      console.log('[ProductEdit] Product loaded successfully');
      setProduct(productData.product);

      // Fetch ML mappings (optional - don't fail if it errors)
      try {
        console.log('[ProductEdit] Fetching ML mappings for SKU:', productData.product.sku);
        const mappingsData = await apiRequest(`/api/product-ml-mapping/${productData.product.sku}`);
        console.log('[ProductEdit] ML mappings loaded:', mappingsData.mappings?.length || 0);
        setMappings(mappingsData.mappings || []);
      } catch (mappingError) {
        console.log('[ProductEdit] ML mappings fetch failed (non-critical):', mappingError);
        setMappings([]);
      }
    } catch (error: any) {
      console.error('[ProductEdit] Critical error:', error);
      notification.showNotification(error.message || "Erro ao carregar produto", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!product) return;

    setSaving(true);
    try {
      await apiRequest(`/api/products/${product.sku}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });

      notification.showNotification("Produto atualizado com sucesso", "success");
    } catch (error: any) {
      notification.showNotification(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (mappingId: number) => {
    setDeletingMapping(mappingId);
    try {
      await apiRequest(`/api/product-ml-mapping/${mappingId}`, {
        method: "DELETE",
      });

      notification.showNotification("Mapeamento removido com sucesso", "success");
      setMappings(mappings.filter(m => m.id !== mappingId));
    } catch (error) {
      notification.showNotification("Erro ao remover mapeamento", "error");
    } finally {
      setDeletingMapping(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Produto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/produtos")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">Editar Produto</h1>
                <p className="text-sm text-muted-foreground">
                  SKU: {product.sku}
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  id="name"
                  value={product.name || ""}
                  onChange={(e) =>
                    setProduct({ ...product, name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="alias_name">Nome Alternativo</Label>
                <Input
                  id="alias_name"
                  value={product.alias_name || ""}
                  onChange={(e) =>
                    setProduct({ ...product, alias_name: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="use_alias_in_nfe">
                  Usar nome alternativo na NF-e
                </Label>
                <Switch
                  id="use_alias_in_nfe"
                  checked={product.use_alias_in_nfe || false}
                  onCheckedChange={(checked) =>
                    setProduct({ ...product, use_alias_in_nfe: checked })
                  }
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={product.category || ""}
                  onChange={(e) =>
                    setProduct({ ...product, category: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  value={product.brand || ""}
                  onChange={(e) =>
                    setProduct({ ...product, brand: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={product.description || ""}
                  onChange={(e) =>
                    setProduct({ ...product, description: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={product.barcode || ""}
                    onChange={(e) =>
                      setProduct({ ...product, barcode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="mpn">MPN</Label>
                  <Input
                    id="mpn"
                    value={product.mpn || ""}
                    onChange={(e) =>
                      setProduct({ ...product, mpn: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sale_price">Preço de Venda</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    value={product.sale_price || ""}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        sale_price: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cost_price">Preço de Custo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={product.cost_price || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Controlado pela Lista de Estoque
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Produto Ativo</Label>
                <Switch
                  id="is_active"
                  checked={product.is_active || false}
                  onCheckedChange={(checked) =>
                    setProduct({ ...product, is_active: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* ML Mapping Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Mapeamento Mercado Livre
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowMapModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mapear
                </Button>
              </div>
              <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Controle de estoque ao mapear o SKU do anúncio para o SKU do produto
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nenhum anúncio mapeado
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowMapModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Mapear Anúncio
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/30 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium w-[240px]">
                          Mapeado SKU do Anúncio
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium">
                          Variante
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium">
                          ID do Anúncio
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium w-[240px]">
                          Nome da Loja
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium w-[150px]">
                          Tempo Mapeado
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium w-[120px]">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((mapping) => (
                        <tr
                          key={mapping.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 w-[240px]">
                            <div className="truncate text-sm" title={product?.sku}>
                              {product?.sku}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              {mapping.ml_variation_id || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-mono">
                              {mapping.ml_listing_id}
                            </div>
                          </td>
                          <td className="px-4 py-3 w-[240px]">
                            <div className="truncate text-sm" title={mapping.ml_store_name}>
                              {mapping.ml_store_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Mercado Libre
                            </div>
                          </td>
                          <td className="px-4 py-3 w-[150px]">
                            <div className="text-sm">
                              {new Date(mapping.created_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 w-[120px]">
                            <button
                              onClick={() => handleDeleteMapping(mapping.id)}
                              disabled={deletingMapping === mapping.id}
                              className="text-sm text-muted-foreground hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {deletingMapping === mapping.id ? (
                                <Loader2 className="h-4 w-4 animate-spin inline" />
                              ) : (
                                "Remover"
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Map ML Listing Modal */}
      {showMapModal && (
        <MapMLListingModal
          productSku={product.sku}
          onClose={() => setShowMapModal(false)}
          onMapped={() => {
            setShowMapModal(false);
            fetchProductData();
          }}
        />
      )}
    </div>
  );
}
