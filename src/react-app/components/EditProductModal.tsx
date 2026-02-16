import { useState, useEffect, useRef } from "react";
import { X, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Switch } from "@/react-app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Textarea } from "@/react-app/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productSku: string;
}

interface KitItem {
  component_sku: string;
  quantity: number;
  name?: string;
  cost_price?: number;
}

interface DynamicItem {
  component_sku: string;
  quantity: number;
  name?: string;
  cost_price?: number;
  stock?: number;
}

export default function EditProductModal({ isOpen, onClose, onSuccess, productSku }: EditProductModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Product data
  const [productType, setProductType] = useState("");
  const [name, setName] = useState("");
  const [aliasName, setAliasName] = useState("");
  const [useAliasInNfe, setUseAliasInNfe] = useState(false);
  const [category, setCategory] = useState("");
  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [mpns, setMpns] = useState<string[]>([]);
  const [mpnInput, setMpnInput] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [weight, setWeight] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [unit, setUnit] = useState("UN");
  const [origin, setOrigin] = useState("0");
  const [stock, setStock] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Kit/Dynamic items
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [dynamicItems, setDynamicItems] = useState<DynamicItem[]>([]);
  
  // Available products for dropdown
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && productSku) {
      loadProduct();
      loadAvailableProducts();
    }
  }, [isOpen, productSku]);

  const loadAvailableProducts = async () => {
    try {
      const response = await fetch("/api/products");
      const data = await response.json();
      if (response.ok && data.products) {
        // Filter out the current product and only show simple products
        setAvailableProducts(
          data.products.filter(
            (p: any) => p.sku !== productSku && p.product_type === "simple"
          )
        );
      }
    } catch (error) {
      console.error("Error loading available products:", error);
    }
  };

  const loadProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productSku}`);
      const data = await response.json();
      
      if (response.ok && data.product) {
        const p = data.product;
        setProductType(p.product_type || "simple");
        setName(p.name || "");
        setAliasName(p.alias_name || "");
        setUseAliasInNfe(p.use_alias_in_nfe === 1);
        setCategory(p.category || "");
        
        // Parse barcodes and MPNs from comma-separated strings
        setBarcodes(p.barcode ? p.barcode.split(",").filter(Boolean) : []);
        setMpns(p.mpn ? p.mpn.split(",").filter(Boolean) : []);
        
        setIsActive(p.is_active === 1);
        setSalePrice(p.sale_price?.toString() || "");
        setCostPrice(p.cost_price?.toString() || "");
        setDescription(p.description || "");
        setBrand(p.brand || "");
        setWeight(p.weight?.toString() || "");
        setLengthCm(p.length_cm?.toString() || "");
        setWidthCm(p.width_cm?.toString() || "");
        setHeightCm(p.height_cm?.toString() || "");
        setNcm(p.ncm || "");
        setCest(p.cest || "");
        setUnit(p.unit || "UN");
        setOrigin(p.origin || "0");
        setStock(p.stock?.toString() || "0");
        
        if (data.media && Array.isArray(data.media)) {
          setMediaUrls(data.media.map((m: any) => m.media_url));
        }
        
        // Load kit items with cost_price
        if (p.product_type === "kit" && data.items) {
          setKitItems(
            data.items.map((item: any) => ({
              component_sku: item.component_sku,
              quantity: item.quantity,
              name: item.name,
              cost_price: item.cost_price,
            }))
          );
        }
        
        // Load dynamic items with cost_price and stock
        if (p.product_type === "dynamic" && data.items) {
          setDynamicItems(
            data.items.map((item: any) => ({
              component_sku: item.component_sku,
              quantity: item.quantity,
              name: item.name,
              cost_price: item.cost_price,
              stock: item.stock,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      alert("Erro ao carregar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleImageUpload = async (files: FileList) => {
    if (mediaUrls.length + files.length > 5) {
      alert("Máximo de 5 fotos permitido");
      return;
    }

    setUploadingImages(true);
    const newUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("image", file);

      try {
        const response = await fetch(`/api/products/${productSku}/image`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newUrls.push(data.image_url);
        }
      } catch (error) {
        console.error("Error uploading image:", error);
      }
    }

    setMediaUrls([...mediaUrls, ...newUrls]);
    setUploadingImages(false);
  };

  const addBarcode = () => {
    const trimmed = barcodeInput.trim();
    if (!trimmed) return;
    
    if (barcodes.includes(trimmed)) {
      alert("Este código de barras já foi adicionado");
      return;
    }
    
    setBarcodes([...barcodes, trimmed]);
    setBarcodeInput("");
  };

  const removeBarcode = (index: number) => {
    setBarcodes(barcodes.filter((_, i) => i !== index));
  };

  const addMpn = () => {
    const trimmed = mpnInput.trim();
    if (!trimmed) return;
    
    if (mpns.includes(trimmed)) {
      alert("Este MPN já foi adicionado");
      return;
    }
    
    setMpns([...mpns, trimmed]);
    setMpnInput("");
  };

  const removeMpn = (index: number) => {
    setMpns(mpns.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: any = {
        name,
        alias_name: aliasName,
        use_alias_in_nfe: useAliasInNfe,
        category,
        barcode: barcodes.join(","),
        mpn: mpns.join(","),
        is_active: isActive,
        sale_price: parseFloat(salePrice) || 0,
        cost_price: parseFloat(costPrice) || 0,
        description,
        brand,
        weight: parseFloat(weight) || null,
        length_cm: parseFloat(lengthCm) || null,
        width_cm: parseFloat(widthCm) || null,
        height_cm: parseFloat(heightCm) || null,
        ncm,
        cest,
        unit,
        origin,
        stock: parseInt(stock) || 0,
        media: mediaUrls.map(url => ({ url, type: "image" })),
      };
      
      // Add kit items if applicable
      if (productType === "kit") {
        payload.kit_items = kitItems.map(item => ({
          sku: item.component_sku,
          quantity: item.quantity,
        }));
      }
      
      // Add dynamic items if applicable
      if (productType === "dynamic") {
        payload.dynamic_items = dynamicItems.map(item => ({
          sku: item.component_sku,
          quantity: item.quantity,
        }));
      }

      const response = await fetch(`/api/products/${productSku}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Produto atualizado com sucesso!");
        handleClose();
        onSuccess();
      } else {
        alert(data.error || "Erro ao atualizar produto");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Erro ao atualizar produto");
    } finally {
      setSaving(false);
    }
  };

  const addKitItem = () => {
    setKitItems([...kitItems, { component_sku: "", quantity: 1 }]);
  };

  const removeKitItem = (index: number) => {
    setKitItems(kitItems.filter((_, i) => i !== index));
  };

  const updateKitItem = (index: number, field: keyof KitItem, value: any) => {
    const updated = [...kitItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // When SKU changes, update name and cost_price from available products
    if (field === "component_sku") {
      const product = availableProducts.find(p => p.sku === value);
      if (product) {
        updated[index].name = product.name;
        updated[index].cost_price = product.cost_price || 0;
      }
    }
    
    setKitItems(updated);
  };

  const addDynamicItem = () => {
    setDynamicItems([...dynamicItems, { component_sku: "", quantity: 1 }]);
  };

  const removeDynamicItem = (index: number) => {
    setDynamicItems(dynamicItems.filter((_, i) => i !== index));
  };

  const updateDynamicItem = (index: number, field: keyof DynamicItem, value: any) => {
    const updated = [...dynamicItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // When SKU changes, update name, cost_price, and stock from available products
    if (field === "component_sku") {
      const product = availableProducts.find(p => p.sku === value);
      if (product) {
        updated[index].name = product.name;
        updated[index].cost_price = product.cost_price || 0;
        updated[index].stock = product.stock || 0;
      }
    }
    
    setDynamicItems(updated);
  };

  // Calculate dynamic totals
  const calculateDynamicTotals = () => {
    let totalStock = 0;
    let totalValue = 0;
    let totalItems = 0;

    dynamicItems.forEach(item => {
      const stock = item.stock || 0;
      const cost = item.cost_price || 0;
      totalStock += stock;
      totalValue += cost * stock;
      totalItems++;
    });

    const avgCost = totalStock > 0 ? totalValue / totalStock : 0;

    return { totalStock, avgCost, totalItems };
  };

  // Calculate kit totals
  const calculateKitTotals = () => {
    let totalCost = 0;
    let totalItems = 0;

    kitItems.forEach(item => {
      const cost = item.cost_price || 0;
      const qty = item.quantity || 1;
      totalCost += cost * qty;
      totalItems++;
    });

    return { totalCost, totalItems };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Editar Produto: {productSku}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Form Content */}
            <div className="p-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
              {/* Card 1: Informação Básica */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Informação Básica</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>SKU</Label>
                      <Input value={productSku} disabled className="bg-gray-100 dark:bg-gray-700" />
                    </div>
                    <div>
                      <Label>Nome *</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <Label>Apelido</Label>
                    <Input value={aliasName} onChange={(e) => setAliasName(e.target.value)} />
                    <div className="flex items-center gap-2 mt-2">
                      <Switch checked={useAliasInNfe} onCheckedChange={setUseAliasInNfe} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Substituir o título do produto ao emitir a NF-e
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Categoria</Label>
                      <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <Switch checked={isActive} onCheckedChange={setIsActive} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Barcodes with tags */}
                  <div>
                    <Label>Código de Barras</Label>
                    <div className="flex gap-2">
                      <Input
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addBarcode();
                          }
                        }}
                        placeholder="Digite e pressione Enter"
                      />
                      <Button type="button" onClick={addBarcode} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {barcodes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {barcodes.map((barcode, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm"
                          >
                            <span>{barcode}</span>
                            <button
                              type="button"
                              onClick={() => removeBarcode(index)}
                              className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MPNs with tags */}
                  <div>
                    <Label>MPN</Label>
                    <div className="flex gap-2">
                      <Input
                        value={mpnInput}
                        onChange={(e) => setMpnInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addMpn();
                          }
                        }}
                        placeholder="Digite e pressione Enter"
                      />
                      <Button type="button" onClick={addMpn} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {mpns.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {mpns.map((mpn, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm"
                          >
                            <span>{mpn}</span>
                            <button
                              type="button"
                              onClick={() => removeMpn(index)}
                              className="hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Kit Items */}
              {productType === "kit" && (
                <Card className="rounded-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Itens do Kit</CardTitle>
                      <Button type="button" onClick={addKitItem} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {kitItems.map((item, index) => {
                        return (
                          <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                            <div className="flex gap-3 items-start">
                              <div className="flex-1">
                                <Label className="text-xs mb-1">Produto</Label>
                                <Select
                                  value={item.component_sku}
                                  onValueChange={(value) => updateKitItem(index, "component_sku", value)}
                                >
                                  <SelectTrigger className="rounded-lg">
                                    <SelectValue placeholder="Selecione um produto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableProducts.map((p) => (
                                      <SelectItem key={p.sku} value={p.sku}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {item.name && (
                                  <p className="text-xs text-gray-500 mt-1">{item.component_sku}</p>
                                )}
                              </div>
                              <div className="w-28">
                                <Label className="text-xs mb-1">Custo Unit.</Label>
                                <Input
                                  value={`R$ ${(item.cost_price || 0).toFixed(2)}`}
                                  disabled
                                  className="bg-gray-100 dark:bg-gray-800 text-sm rounded-lg"
                                />
                              </div>
                              <div className="w-24">
                                <Label className="text-xs mb-1">Quantidade</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateKitItem(index, "quantity", parseInt(e.target.value))}
                                  className="rounded-lg"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeKitItem(index)}
                                className="mt-5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {kitItems.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                        </p>
                      )}
                      {kitItems.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mt-3 border border-blue-200 dark:border-blue-800">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Total ({calculateKitTotals().totalItems} {calculateKitTotals().totalItems === 1 ? "item" : "itens"})
                            </span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              R$ {calculateKitTotals().totalCost.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dynamic Items */}
              {productType === "dynamic" && (
                <Card className="rounded-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Itens Dinâmicos</CardTitle>
                      <Button type="button" onClick={addDynamicItem} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dynamicItems.map((item, index) => {
                        return (
                          <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                            <div className="flex gap-3 items-start">
                              <div className="flex-1">
                                <Label className="text-xs mb-1">Produto</Label>
                                <Select
                                  value={item.component_sku}
                                  onValueChange={(value) => updateDynamicItem(index, "component_sku", value)}
                                >
                                  <SelectTrigger className="rounded-lg">
                                    <SelectValue placeholder="Selecione um produto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableProducts.map((p) => (
                                      <SelectItem key={p.sku} value={p.sku}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {item.name && (
                                  <p className="text-xs text-gray-500 mt-1">{item.component_sku}</p>
                                )}
                              </div>
                              <div className="w-28">
                                <Label className="text-xs mb-1">Custo Unit.</Label>
                                <Input
                                  value={`R$ ${(item.cost_price || 0).toFixed(2)}`}
                                  disabled
                                  className="bg-gray-100 dark:bg-gray-800 text-sm rounded-lg"
                                />
                              </div>
                              <div className="w-24">
                                <Label className="text-xs mb-1">Estoque</Label>
                                <Input
                                  value={item.stock || 0}
                                  disabled
                                  className="bg-gray-100 dark:bg-gray-800 text-sm rounded-lg"
                                />
                              </div>
                              <div className="w-24">
                                <Label className="text-xs mb-1">Quantidade</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateDynamicItem(index, "quantity", parseInt(e.target.value))}
                                  className="rounded-lg"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeDynamicItem(index)}
                                className="mt-5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      {dynamicItems.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                        </p>
                      )}
                      {dynamicItems.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 mt-3 border border-blue-200 dark:border-blue-800">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Total de Itens
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {calculateDynamicTotals().totalItems} {calculateDynamicTotals().totalItems === 1 ? "item" : "itens"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Estoque Total
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {calculateDynamicTotals().totalStock} un
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Custo Médio Ponderado
                              </span>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                R$ {calculateDynamicTotals().avgCost.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card 2: Info de Venda e Atributos */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Info. de Venda e Atributos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label>Preço Venda (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Preço Custo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={costPrice}
                        onChange={(e) => setCostPrice(e.target.value)}
                        disabled={productType === "kit" || productType === "dynamic"}
                        className={productType === "kit" || productType === "dynamic" ? "bg-gray-100 dark:bg-gray-700" : ""}
                      />
                      {(productType === "kit" || productType === "dynamic") && (
                        <p className="text-xs text-gray-500 mt-1">Calculado automaticamente</p>
                      )}
                    </div>
                    <div>
                      <Label>Estoque</Label>
                      <Input
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        disabled={productType === "kit" || productType === "dynamic"}
                        className={productType === "kit" || productType === "dynamic" ? "bg-gray-100 dark:bg-gray-700" : ""}
                      />
                      {(productType === "kit" || productType === "dynamic") && (
                        <p className="text-xs text-gray-500 mt-1">Calculado automaticamente</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Marca</Label>
                      <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
                    </div>
                    <div>
                      <Label>Peso (kg)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Comprimento (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={lengthCm}
                        onChange={(e) => setLengthCm(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Largura (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={widthCm}
                        onChange={(e) => setWidthCm(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Altura (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Mídia */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Mídia (Máx. 5 fotos)</CardTitle>
                </CardHeader>
                <CardContent>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageUpload(e.target.files);
                        e.target.value = "";
                      }
                    }}
                  />
                  
                  <div className="grid grid-cols-5 gap-3">
                    {mediaUrls.map((url, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700" />
                        <button
                          type="button"
                          onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    
                    {mediaUrls.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImages}
                        className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                      >
                        {uploadingImages ? (
                          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Upload</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Informação da Taxação */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Informação da Taxação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>NCM</Label>
                      <Input value={ncm} onChange={(e) => setNcm(e.target.value)} />
                    </div>
                    <div>
                      <Label>CEST</Label>
                      <Input value={cest} onChange={(e) => setCest(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Unidade</Label>
                      <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UN">UN</SelectItem>
                          <SelectItem value="PC">PC</SelectItem>
                          <SelectItem value="KT">KT</SelectItem>
                          <SelectItem value="JG">JG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Origem</Label>
                      <Select value={origin} onValueChange={setOrigin}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 - Nacional</SelectItem>
                          <SelectItem value="1">1 - Estrangeira - Importação direta</SelectItem>
                          <SelectItem value="2">2 - Estrangeira - Mercado interno</SelectItem>
                          <SelectItem value="3">3 - Nacional, conteúdo importação &gt; 40% e ≤ 70%</SelectItem>
                          <SelectItem value="4">4 - Nacional, processos produtivos básicos</SelectItem>
                          <SelectItem value="5">5 - Nacional, conteúdo importação ≤ 40%</SelectItem>
                          <SelectItem value="6">6 - Estrangeira - Importação direta, sem similar</SelectItem>
                          <SelectItem value="7">7 - Estrangeira - Mercado interno, sem similar</SelectItem>
                          <SelectItem value="8">8 - Nacional, conteúdo importação &gt; 70%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-2xl">
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
