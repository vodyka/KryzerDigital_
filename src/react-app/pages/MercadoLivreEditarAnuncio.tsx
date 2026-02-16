import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Save, Loader2, AlertCircle, X, Plus } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Textarea } from "@/react-app/components/ui/textarea";
import { Switch } from "@/react-app/components/ui/switch";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { useNotification } from "@/react-app/contexts/NotificationContext";

interface MLItem {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  status: string;
  category_id: string;
  listing_type_id: string;
  pictures: Array<{ url: string; id: string }>;
  variations?: Array<{
    id: number;
    price: number;
    available_quantity: number;
    attribute_combinations: Array<{ id: string; name: string; value_name: string }>;
    seller_custom_field?: string;
  }>;
  attributes?: Array<{ id: string; name: string; value_name: string }>;
}

interface MLDescription {
  plain_text: string;
}

export default function MercadoLivreEditarAnuncio() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useAuth();
  const { success, error: showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<MLItem | null>(null);
  const [description, setDescription] = useState<MLDescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [integrationExpired, setIntegrationExpired] = useState(false);

  // Formulário
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [plainText, setPlainText] = useState("");
  const [variations, setVariations] = useState<
    Array<{
      id: number;
      price: string;
      quantity: string;
      attributes: string;
      sku?: string;
    }>
  >([]);
  const [attributes, setAttributes] = useState<Array<{ id: string; name: string; value_name: string }>>([]);
  const [pictures, setPictures] = useState<Array<{ url: string; id: string }>>([]);
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");

  useEffect(() => {
    loadItemData();
    checkIntegrationExpired();
  }, [itemId, selectedCompany]);

  const checkIntegrationExpired = async () => {
    if (!selectedCompany) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/integrations/mercadolivre/list?companyId=${selectedCompany.id}`,
        {
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      const now = new Date();

      const hasExpired = (data.integrations || []).some((integration: any) => {
        const expiresAt = new Date(integration.expires_at);
        return expiresAt < now;
      });

      setIntegrationExpired(hasExpired);
    } catch (err) {
      console.error("Erro ao verificar integrações expiradas:", err);
    }
  };

  const loadItemData = async () => {
    if (!itemId || !selectedCompany) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      // Buscar item
      const itemResponse = await fetch(`/api/mercadolivre/items/${itemId}?companyId=${selectedCompany.id}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!itemResponse.ok) {
        const errorData = await itemResponse.json().catch(() => ({ error: "Erro ao carregar anúncio" }));
        throw new Error(errorData.error || "Erro ao carregar anúncio");
      }

      const itemData = await itemResponse.json();
      setItem(itemData);
      setTitle(itemData.title || "");
      setPrice(String(itemData.price || 0));
      setQuantity(String(itemData.available_quantity || 0));
      setStatus(itemData.status === "paused" ? "paused" : "active");
      setPictures(itemData.pictures || []);
      setAttributes(itemData.attributes || []);

      // Se tiver variações
      if (itemData.variations && itemData.variations.length > 0) {
        setVariations(
          itemData.variations.map((v: any) => ({
            id: v.id,
            price: String(v.price || 0),
            quantity: String(v.available_quantity || 0),
            attributes: v.attribute_combinations
              .map((attr: any) => `${attr.name}: ${attr.value_name}`)
              .join(", "),
            sku: v.seller_custom_field || undefined,
          }))
        );
      }

      // Buscar descrição
      try {
        const descResponse = await fetch(
          `/api/mercadolivre/items/${itemId}/description?companyId=${selectedCompany.id}`,
          {
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (descResponse.ok) {
          const descData = await descResponse.json();
          setDescription(descData);
          setPlainText(descData.plain_text || "");
        }
      } catch (err) {
        console.log("Descrição não disponível");
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar anúncio");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!itemId || !selectedCompany || !item) return;

    // Verifica se integração está expirada
    if (integrationExpired) {
      showError("Conta expirada. Por favor, reconecte sua conta do Mercado Livre em Configurações → Integrações");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // Adicionar novas imagens se houver
      if (newImageUrls.length > 0) {
        const picturesBody = {
          pictures: newImageUrls.map(url => ({ source: url }))
        };
        
        const picturesResponse = await fetch(`/api/mercadolivre/items/${itemId}?companyId=${selectedCompany.id}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(picturesBody),
        });

        if (!picturesResponse.ok) {
          console.warn("Erro ao adicionar imagens");
        }
      }

      // Se NÃO tiver variações, atualiza item direto
      if (!item.variations || item.variations.length === 0) {
        const body: any = {};
        if (title !== item.title) body.title = title;
        if (Number(price) !== item.price) body.price = Number(price);
        if (Number(quantity) !== item.available_quantity) body.available_quantity = Number(quantity);
        if (status !== item.status) body.status = status;
        
        // Verificar se atributos mudaram
        const attributesChanged = JSON.stringify(attributes) !== JSON.stringify(item.attributes);
        if (attributesChanged) {
          body.attributes = attributes.map(attr => ({
            id: attr.id,
            value_name: attr.value_name
          }));
        }

        if (Object.keys(body).length > 0) {
          const response = await fetch(`/api/mercadolivre/items/${itemId}?companyId=${selectedCompany.id}`, {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Erro ao salvar" }));
            throw new Error(errorData.detail?.message || errorData.error || "Erro ao salvar anúncio");
          }
        }
      } else {
        // Se tiver variações, atualiza cada variação modificada
        for (let i = 0; i < variations.length; i++) {
          const variation = variations[i];
          const originalVariation = item.variations[i];

          const body: any = {};
          if (Number(variation.price) !== originalVariation.price) body.price = Number(variation.price);
          if (Number(variation.quantity) !== originalVariation.available_quantity)
            body.available_quantity = Number(variation.quantity);

          if (Object.keys(body).length > 0) {
            const response = await fetch(
              `/api/mercadolivre/items/${itemId}/variations/${variation.id}?companyId=${selectedCompany.id}`,
              {
                method: "PUT",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: "Erro ao salvar variação" }));
              throw new Error(
                errorData.detail?.message || errorData.error || `Erro ao salvar variação ${variation.id}`
              );
            }
          }
        }

        // Atualiza status e título se mudou (no item principal)
        const itemBody: any = {};
        if (title !== item.title) itemBody.title = title;
        if (status !== item.status) itemBody.status = status;
        
        // Verificar se atributos mudaram
        const attributesChanged = JSON.stringify(attributes) !== JSON.stringify(item.attributes);
        if (attributesChanged) {
          itemBody.attributes = attributes.map(attr => ({
            id: attr.id,
            value_name: attr.value_name
          }));
        }

        if (Object.keys(itemBody).length > 0) {
          const response = await fetch(`/api/mercadolivre/items/${itemId}?companyId=${selectedCompany.id}`, {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(itemBody),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Erro ao salvar" }));
            throw new Error(errorData.detail?.message || errorData.error || "Erro ao salvar anúncio");
          }
        }
      }

      // Atualizar descrição se mudou
      if (description && plainText !== description.plain_text) {
        const response = await fetch(
          `/api/mercadolivre/items/${itemId}/description?companyId=${selectedCompany.id}`,
          {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ plain_text: plainText }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Erro ao salvar descrição" }));
          console.warn("Erro ao salvar descrição:", errorData);
        }
      }

      success("Anúncio atualizado com sucesso");

      // Recarregar dados
      await loadItemData();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      showError(err instanceof Error ? err.message : "Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
          <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const hasVariations = item.variations && item.variations.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Editar Anúncio</h1>
          </div>
          <Button onClick={handleSave} disabled={saving || integrationExpired}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        {/* Alerta de conta expirada */}
        {integrationExpired && (
          <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Conta Expirada
                </h3>
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                  Sua conta do Mercado Livre expirou. Por favor, reconecte sua conta para continuar editando anúncios.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-500/20"
                  onClick={() => navigate("/configuracoes/integracoes")}
                >
                  Reconectar Conta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Card Principal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {/* Imagens */}
          <div className="mb-6">
            <Label className="mb-2 block">Imagens do Anúncio</Label>
            <div className="space-y-3">
              {/* Imagens atuais */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pictures.map((pic) => (
                  <div key={pic.id} className="relative flex-shrink-0">
                    <img
                      src={pic.url}
                      alt="Produto"
                      className="w-20 h-20 rounded object-cover border border-gray-200 dark:border-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setPictures(pictures.filter(p => p.id !== pic.id))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Adicionar novas imagens por URL */}
              <div className="flex gap-2">
                <Input
                  placeholder="URL da imagem (https://...)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (imageUrlInput.trim()) {
                      setNewImageUrls([...newImageUrls, imageUrlInput.trim()]);
                      setPictures([...pictures, { id: `new-${Date.now()}`, url: imageUrlInput.trim() }]);
                      setImageUrlInput("");
                    }
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Cole a URL de uma imagem hospedada online. O Mercado Livre aceita imagens de até 10MB.
              </p>
            </div>
          </div>

          {/* Título */}
          <div className="mb-4">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div>
              <Label>Status do Anúncio</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {status === "active" ? "Ativo" : "Pausado"}
              </p>
            </div>
            <Switch checked={status === "active"} onCheckedChange={(checked) => setStatus(checked ? "active" : "paused")} />
          </div>

          {/* Categoria e Tipo (readonly) */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Categoria</Label>
              <Input value={item.category_id} readOnly disabled className="mt-1" />
            </div>
            <div>
              <Label>Tipo de Anúncio</Label>
              <Input value={item.listing_type_id} readOnly disabled className="mt-1" />
            </div>
          </div>

          {/* Se NÃO tiver variações: mostrar preço e quantidade */}
          {!hasVariations && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantidade Disponível</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Descrição */}
          {description && (
            <div className="mb-4">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>
          )}

          {/* Ficha Técnica (Attributes) */}
          {attributes.length > 0 && (
            <div className="mb-4">
              <Label className="mb-2 block">Ficha Técnica</Label>
              <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {attributes.map((attr) => (
                  <div key={attr.id} className="grid grid-cols-2 gap-4 text-sm">
                    <div className="font-medium text-gray-700 dark:text-gray-300">{attr.name}:</div>
                    <div className="text-gray-900 dark:text-white">
                      <Input
                        value={attr.value_name}
                        onChange={(e) => {
                          const newAttrs = attributes.map(a => 
                            a.id === attr.id ? { ...a, value_name: e.target.value } : a
                          );
                          setAttributes(newAttrs);
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Nota: Alguns atributos são obrigatórios e outros são apenas leitura no Mercado Livre.
              </p>
            </div>
          )}
        </div>

        {/* Variações (se existir) */}
        {hasVariations && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Variações</h2>
            <div className="space-y-4">
              {variations.map((variation, index) => (
                <div
                  key={variation.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900"
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {variation.attributes}
                  </div>
                  {variation.sku && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">SKU: {variation.sku}</div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`variation-price-${variation.id}`}>Preço (R$)</Label>
                      <Input
                        id={`variation-price-${variation.id}`}
                        type="number"
                        step="0.01"
                        value={variation.price}
                        onChange={(e) => {
                          const newVariations = [...variations];
                          newVariations[index].price = e.target.value;
                          setVariations(newVariations);
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`variation-quantity-${variation.id}`}>Quantidade</Label>
                      <Input
                        id={`variation-quantity-${variation.id}`}
                        type="number"
                        value={variation.quantity}
                        onChange={(e) => {
                          const newVariations = [...variations];
                          newVariations[index].quantity = e.target.value;
                          setVariations(newVariations);
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
