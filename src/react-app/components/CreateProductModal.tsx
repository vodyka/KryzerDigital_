import { useState, useEffect } from "react";
import { X, Plus, Trash2, Loader2, Settings, ChevronDown, Pencil } from "lucide-react";
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

type ProductType = "simple" | "variation" | "kit" | "dynamic";

interface ColorOption {
  id?: number;
  name: string;
  code: string;
  image_url?: string | null;
  selected: boolean;
}

interface SizeOption {
  id?: number;
  name: string;
  code: string;
  selected: boolean;
}

interface VariantRow {
  color?: { code: string; name: string };
  size?: { code: string; name: string };
  sku: string;
  barcode?: string;
  sale_price: string;
  cost_price: string;
  ncm?: string;
  cest?: string;
  unit?: string;
  origin?: string;
}

interface KitItem {
  sku: string;
  name?: string;
  cost_price?: number;
  quantity: number;
}

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProductType: ProductType;
}

export default function CreateProductModal({ isOpen, onClose, onSuccess, initialProductType }: CreateProductModalProps) {
  const [productType, setProductType] = useState<ProductType>(initialProductType);
  const [loading, setLoading] = useState(false);

  // Sync productType when initialProductType changes
  useEffect(() => {
    setProductType(initialProductType);
  }, [initialProductType]);
  
  // Common fields
  const [sku, setSku] = useState("");
  const [spu, setSpu] = useState("");
  const [name, setName] = useState("");
  const [aliasName, setAliasName] = useState("");
  const [useAliasInNfe, setUseAliasInNfe] = useState(false);
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Simple product fields
  const [barcode, setBarcode] = useState("");
  const [mpn, setMpn] = useState("");
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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  // Variation fields - NEW STRUCTURE
  const [showColorCard, setShowColorCard] = useState(false);
  const [showSizeCard, setShowSizeCard] = useState(false);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [customVariantTypes, setCustomVariantTypes] = useState<string[]>([]);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [separadorSpu, setSeparadorSpu] = useState("");
  const [separadorTamanho, setSeparadorTamanho] = useState("");
  const [eanConfig, setEanConfig] = useState<{ prefix_ean: string; cnpj_5: string }>({ 
    prefix_ean: "789", 
    cnpj_5: "" 
  });
  const [nextEanSequence, setNextEanSequence] = useState(1);

  // Kit fields
  const [kitItems, setKitItems] = useState<KitItem[]>([]);
  const [searchSku, setSearchSku] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Dynamic fields
  const [dynamicItems, setDynamicItems] = useState<KitItem[]>([]);

  // Load EAN config when modal opens
  useEffect(() => {
    if (isOpen && productType === "variation") {
      loadSystemConfig();
    }
  }, [isOpen, productType]);
  
  // Auto-generate variants when colors, sizes, SPU, or separators change
  useEffect(() => {
    if (productType === "variation" && (colorOptions.length > 0 || sizeOptions.length > 0)) {
      autoGenerateVariants(colorOptions, sizeOptions);
    }
  }, [spu, separadorSpu, separadorTamanho]);

  if (!isOpen) return null;

  const resetForm = () => {
    setProductType(initialProductType);
    setSku("");
    setSpu("");
    setName("");
    setAliasName("");
    setUseAliasInNfe(false);
    setCategory("");
    setIsActive(true);
    setBarcode("");
    setMpn("");
    setSalePrice("");
    setCostPrice("");
    setDescription("");
    setBrand("");
    setWeight("");
    setLengthCm("");
    setWidthCm("");
    setHeightCm("");
    setNcm("");
    setCest("");
    setUnit("UN");
    setOrigin("0");
    setMediaUrls([]);
    setShowColorCard(false);
    setShowSizeCard(false);
    setColorOptions([]);
    setSizeOptions([]);
    setCustomVariantTypes([]);
    setVariantRows([]);
    setSeparadorSpu("");
    setSeparadorTamanho("");
    setKitItems([]);
    setDynamicItems([]);
    setNextEanSequence(1);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const loadSystemConfig = async () => {
    try {
      const response = await fetch("/api/variation-config");
      if (response.ok) {
        const data = await response.json();
        
        const colors = (data.colors || [])
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            image_url: c.image_url,
            selected: false,
          }));
        
        const sizes = (data.sizes || [])
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            selected: false,
          }));
        
        setColorOptions(colors);
        setSizeOptions(sizes);
        
        if (data.ean_config) {
          setEanConfig({
            prefix_ean: data.ean_config.prefix_ean || "789",
            cnpj_5: data.ean_config.cnpj_5 || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading system config:", error);
    }
  };
  
  const calculateEan13CheckDigit = (ean12: string): string => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(ean12[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  };
  
  const generateEan13 = (): string => {
    if (!eanConfig.cnpj_5 || eanConfig.cnpj_5.length !== 5) {
      alert("Configure os 5 primeiros dígitos do CNPJ em Configuração → EAN/GTIN");
      return "";
    }
    
    const sequence = nextEanSequence.toString().padStart(4, "0");
    const ean12 = eanConfig.prefix_ean + eanConfig.cnpj_5 + sequence;
    const checkDigit = calculateEan13CheckDigit(ean12);
    const ean13 = ean12 + checkDigit;
    
    setNextEanSequence(nextEanSequence + 1);
    
    return ean13;
  };
  
  const generateBarcodeForVariant = (index: number) => {
    const ean13 = generateEan13();
    if (ean13) {
      updateVariantRow(index, "barcode", ean13);
    }
  };
  
  const generateAllBarcodes = () => {
    if (!eanConfig.cnpj_5 || eanConfig.cnpj_5.length !== 5) {
      alert("Configure os 5 primeiros dígitos do CNPJ em Configuração → EAN/GTIN");
      return;
    }
    
    const newRows = variantRows.map(row => {
      if (!row.barcode) {
        const sequence = nextEanSequence.toString().padStart(4, "0");
        const ean12 = eanConfig.prefix_ean + eanConfig.cnpj_5 + sequence;
        const checkDigit = calculateEan13CheckDigit(ean12);
        const ean13 = ean12 + checkDigit;
        setNextEanSequence(prev => prev + 1);
        return { ...row, barcode: ean13 };
      }
      return row;
    });
    
    setVariantRows(newRows);
  };

  const toggleColorOption = (index: number) => {
    const newOptions = [...colorOptions];
    newOptions[index].selected = !newOptions[index].selected;
    setColorOptions(newOptions);
    
    // Trigger automatic variant generation
    setTimeout(() => autoGenerateVariants(newOptions, sizeOptions), 0);
  };

  const toggleSizeOption = (index: number) => {
    const newOptions = [...sizeOptions];
    newOptions[index].selected = !newOptions[index].selected;
    setSizeOptions(newOptions);
    
    // Trigger automatic variant generation
    setTimeout(() => autoGenerateVariants(colorOptions, newOptions), 0);
  };

  const addNewColorOption = () => {
    const name = prompt("Nome da cor:");
    if (!name) return;
    
    const code = prompt("Sigla da cor (ex: VM para Vermelho):");
    if (!code) return;
    
    // Check for duplicates
    const duplicate = colorOptions.find(
      c => c.name.toLowerCase() === name.toLowerCase() || c.code.toUpperCase() === code.toUpperCase()
    );
    
    if (duplicate) {
      alert(`Já existe uma cor com este nome ou sigla`);
      return;
    }
    
    const newOptions = [...colorOptions, {
      name,
      code: code.toUpperCase(),
      selected: true,
    }];
    setColorOptions(newOptions);
    
    // Trigger automatic variant generation
    setTimeout(() => autoGenerateVariants(newOptions, sizeOptions), 0);
  };

  const addNewSizeOption = () => {
    const name = prompt("Nome do tamanho:");
    if (!name) return;
    
    const code = prompt("Sigla do tamanho (ex: 02 para P):");
    if (!code) return;
    
    // Check for duplicates
    const duplicate = sizeOptions.find(
      s => s.name.toLowerCase() === name.toLowerCase() || s.code.toUpperCase() === code.toUpperCase()
    );
    
    if (duplicate) {
      alert(`Já existe um tamanho com este nome ou sigla`);
      return;
    }
    
    const newOptions = [...sizeOptions, {
      name,
      code: code.toUpperCase(),
      selected: true,
    }];
    setSizeOptions(newOptions);
    
    // Trigger automatic variant generation
    setTimeout(() => autoGenerateVariants(colorOptions, newOptions), 0);
  };

  // Auto-generate variants without needing to click button
  const autoGenerateVariants = (currentColors: ColorOption[], currentSizes: SizeOption[]) => {
    if (!spu) return;
    
    const selectedColors = currentColors.filter(c => c.selected);
    const selectedSizes = currentSizes.filter(s => s.selected);
    
    if (selectedColors.length === 0 && selectedSizes.length === 0) {
      setVariantRows([]);
      return;
    }
    
    const rows: VariantRow[] = [];
    
    if (selectedColors.length > 0 && selectedSizes.length > 0) {
      // Cor x Tamanho combinations
      for (const color of selectedColors) {
        for (const size of selectedSizes) {
          let generatedSku = spu;
          if (separadorSpu) generatedSku += separadorSpu;
          generatedSku += color.code;
          if (separadorTamanho) generatedSku += separadorTamanho;
          generatedSku += size.code;
          
          // Try to preserve existing values for this variant
          const existing = variantRows.find(
            r => r.color?.code === color.code && r.size?.code === size.code
          );
          
          rows.push({
            color: { code: color.code, name: color.name },
            size: { code: size.code, name: size.name },
            sku: generatedSku,
            barcode: existing?.barcode || "",
            sale_price: existing?.sale_price || "",
            cost_price: existing?.cost_price || "",
            ncm: existing?.ncm || "",
            cest: existing?.cest || "",
            unit: existing?.unit || "UN",
            origin: existing?.origin || "0",
          });
        }
      }
    } else if (selectedColors.length > 0) {
      // Only colors
      for (const color of selectedColors) {
        let generatedSku = spu;
        if (separadorSpu) generatedSku += separadorSpu;
        generatedSku += color.code;
        
        const existing = variantRows.find(r => r.color?.code === color.code && !r.size);
        
        rows.push({
          color: { code: color.code, name: color.name },
          sku: generatedSku,
          barcode: existing?.barcode || "",
          sale_price: existing?.sale_price || "",
          cost_price: existing?.cost_price || "",
          ncm: existing?.ncm || "",
          cest: existing?.cest || "",
          unit: existing?.unit || "UN",
          origin: existing?.origin || "0",
        });
      }
    } else if (selectedSizes.length > 0) {
      // Only sizes
      for (const size of selectedSizes) {
        let generatedSku = spu;
        if (separadorSpu) generatedSku += separadorSpu;
        generatedSku += size.code;
        
        const existing = variantRows.find(r => r.size?.code === size.code && !r.color);
        
        rows.push({
          size: { code: size.code, name: size.name },
          sku: generatedSku,
          barcode: existing?.barcode || "",
          sale_price: existing?.sale_price || "",
          cost_price: existing?.cost_price || "",
          ncm: existing?.ncm || "",
          cest: existing?.cest || "",
          unit: existing?.unit || "UN",
          origin: existing?.origin || "0",
        });
      }
    }
    
    setVariantRows(rows);
  };

  const updateVariantRow = (index: number, field: keyof VariantRow, value: string) => {
    const newRows = [...variantRows];
    (newRows[index] as any)[field] = value;
    setVariantRows(newRows);
  };

  const fillAllVariantField = (field: keyof VariantRow, value: string) => {
    const newRows = variantRows.map(row => ({ ...row, [field]: value }));
    setVariantRows(newRows);
  };

  const searchProduct = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/products`);
      const data = await response.json();
      
      const filtered = (data.products || []).filter((p: any) => 
        p.sku.toLowerCase().includes(query.toLowerCase()) ||
        p.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching products:", error);
    }
  };

  const addKitItem = (product: any) => {
    const exists = kitItems.find(item => item.sku === product.sku);
    if (exists) {
      alert("Este produto já foi adicionado ao kit");
      return;
    }

    setKitItems([...kitItems, {
      sku: product.sku,
      name: product.name,
      cost_price: product.cost_price || 0,
      quantity: 1,
    }]);
    setSearchSku("");
    setSearchResults([]);
  };

  const addDynamicItem = (product: any) => {
    const exists = dynamicItems.find(item => item.sku === product.sku);
    if (exists) {
      alert("Este produto já foi adicionado");
      return;
    }

    setDynamicItems([...dynamicItems, {
      sku: product.sku,
      name: product.name,
      cost_price: product.cost_price || 0,
      quantity: 1,
    }]);
    setSearchSku("");
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        product_type: productType,
        name,
        alias_name: aliasName,
        use_alias_in_nfe: useAliasInNfe,
        category,
        is_active: isActive,
      };

      if (productType === "simple") {
        payload.sku = sku;
        payload.barcode = barcode;
        payload.mpn = mpn;
        payload.sale_price = parseFloat(salePrice) || 0;
        payload.cost_price = parseFloat(costPrice) || 0;
        payload.description = description;
        payload.brand = brand;
        payload.weight = parseFloat(weight) || null;
        payload.length_cm = parseFloat(lengthCm) || null;
        payload.width_cm = parseFloat(widthCm) || null;
        payload.height_cm = parseFloat(heightCm) || null;
        payload.ncm = ncm;
        payload.cest = cest;
        payload.unit = unit;
        payload.origin = origin;
        payload.media = mediaUrls.map(url => ({ url, type: "image" }));
      } else if (productType === "variation") {
        if (variantRows.length === 0) {
          alert("Gere as variantes antes de salvar");
          setLoading(false);
          return;
        }
        
        payload.spu = spu;
        payload.description = description;
        payload.brand = brand;
        payload.variants = variantRows.map(row => ({
          sku: row.sku,
          color_name: row.color?.name,
          color_code: row.color?.code,
          size_name: row.size?.name,
          size_code: row.size?.code,
          barcode: row.barcode,
          sale_price: parseFloat(row.sale_price) || 0,
          cost_price: parseFloat(row.cost_price) || 0,
          ncm: row.ncm,
          cest: row.cest,
          unit: row.unit || "UN",
          origin: row.origin || "0",
        }));
        payload.media = mediaUrls.map(url => ({ url, type: "image" }));
      } else if (productType === "kit") {
        payload.spu = spu;
        payload.sku = spu;
        payload.kit_items = kitItems;
        payload.media = mediaUrls.map(url => ({ url, type: "image" }));
      } else if (productType === "dynamic") {
        payload.spu = spu;
        payload.sku = spu;
        payload.dynamic_items = dynamicItems;
        payload.media = mediaUrls.map(url => ({ url, type: "image" }));
      }

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Produto criado com sucesso!");
        handleClose();
        onSuccess();
      } else {
        alert(data.error || "Erro ao criar produto");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Erro ao criar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Criar Novo Produto</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Product Type Display */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Label className="mb-2 block">Tipo de Produto</Label>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {productType === "simple" && "Produto Simples"}
              {productType === "variation" && "Produto com Variação"}
              {productType === "kit" && "Composição (Kit)"}
              {productType === "dynamic" && "Produto Dinâmico"}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
            {/* SIMPLE PRODUCT */}
            {productType === "simple" && (
              <>
                {/* Card 1: Informação Básica */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informação Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>SKU *</Label>
                        <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
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
                      <div>
                        <Label>Código de Barras</Label>
                        <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>MPN</Label>
                        <Input value={mpn} onChange={(e) => setMpn(e.target.value)} />
                      </div>
                      <div className="flex items-center gap-2 mt-6">
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {isActive ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Info de Venda e Atributos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Info. de Venda e Atributos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        />
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
                <Card>
                  <CardHeader>
                    <CardTitle>Mídia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>URL da Foto</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const input = e.currentTarget;
                              if (input.value) {
                                setMediaUrls([...mediaUrls, input.value]);
                                input.value = "";
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input.value) {
                              setMediaUrls([...mediaUrls, input.value]);
                              input.value = "";
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {mediaUrls.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {mediaUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img src={url} alt="" className="w-full h-20 object-cover rounded" />
                              <button
                                type="button"
                                onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== index))}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100"
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

                {/* Card 4: Informação da Taxação */}
                <Card>
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
                          <SelectTrigger>
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
                          <SelectTrigger>
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
              </>
            )}

            {/* VARIATION PRODUCT */}
            {productType === "variation" && (
              <>
                {/* Card 1: Informação Básica */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informação Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>SPU *</Label>
                        <Input value={spu} onChange={(e) => setSpu(e.target.value)} required />
                      </div>
                      <div>
                        <Label>Nome Base *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>
                    </div>
                    <div>
                      <Label>Apelido</Label>
                      <Input value={aliasName} onChange={(e) => setAliasName(e.target.value)} />
                      <div className="flex items-center gap-2 mt-2">
                        <Switch checked={useAliasInNfe} onCheckedChange={setUseAliasInNfe} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Substituir o título ao emitir NF-e
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Separador SPU</Label>
                        <Input 
                          value={separadorSpu} 
                          onChange={(e) => setSeparadorSpu(e.target.value)}
                          placeholder="-"
                        />
                      </div>
                      <div>
                        <Label>Separador Tamanho</Label>
                        <Input 
                          value={separadorTamanho} 
                          onChange={(e) => setSeparadorTamanho(e.target.value)}
                          placeholder=""
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Informações de Venda */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informações de Venda</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Descrição</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                    </div>
                    <div>
                      <Label>Marca</Label>
                      <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 3: Informação de Variações */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Informação de Variações</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadSystemConfig}
                        title="Carregar configuração do sistema"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Variantes</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowColorCard(!showColorCard);
                          if (!showColorCard && colorOptions.length === 0) {
                            loadSystemConfig();
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Cor
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSizeCard(!showSizeCard);
                          if (!showSizeCard && sizeOptions.length === 0) {
                            loadSystemConfig();
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Tamanho
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const variantName = prompt("Nome da variante (ex: Estampa):");
                          if (variantName && !customVariantTypes.includes(variantName)) {
                            setCustomVariantTypes([...customVariantTypes, variantName]);
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Adicionar Variantes
                      </button>
                    </div>

                    {/* Color Card */}
                    {showColorCard && (
                      <Card className="border-2 border-blue-200 dark:border-blue-800">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowColorCard(false)}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <span className="font-medium">Cor</span>
                              <button type="button">
                                <Pencil className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowColorCard(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {colorOptions.map((color, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={color.selected}
                                  onChange={() => toggleColorOption(index)}
                                  className="rounded"
                                />
                                <span className="text-sm">{color.name}</span>
                                <button type="button" className="ml-auto">
                                  <Pencil className="w-3 h-3 text-gray-400" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={addNewColorOption}
                            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar Opções
                          </button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Size Card */}
                    {showSizeCard && (
                      <Card className="border-2 border-blue-200 dark:border-blue-800">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowSizeCard(false)}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <span className="font-medium">Tamanho</span>
                              <button type="button">
                                <Pencil className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowSizeCard(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {sizeOptions.map((size, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={size.selected}
                                  onChange={() => toggleSizeOption(index)}
                                  className="rounded"
                                />
                                <span className="text-sm">{size.name}</span>
                                <button type="button" className="ml-auto">
                                  <Pencil className="w-3 h-3 text-gray-400" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={addNewSizeOption}
                            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Adicionar Opções
                          </button>
                        </CardContent>
                      </Card>
                    )}

                    {/* Lista de Variantes */}
                    {variantRows.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Lista de Variantes ({variantRows.length})</h4>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-3 py-2 text-left">Cor</th>
                                <th className="px-3 py-2 text-left">Tamanho</th>
                                <th className="px-3 py-2 text-left">SKU</th>
                                <th className="px-3 py-2 text-left">
                                  Código de Barras
                                  <button
                                    type="button"
                                    onClick={generateAllBarcodes}
                                    className="ml-1 text-blue-600 dark:text-blue-400 text-xs hover:underline"
                                  >
                                    Gerar Todos
                                  </button>
                                </th>
                                <th className="px-3 py-2 text-left">
                                  Preço de varejo(R$)
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const value = prompt("Preencher todos com o valor:");
                                      if (value) fillAllVariantField("sale_price", value);
                                    }}
                                    className="ml-1 text-blue-600 dark:text-blue-400 text-xs hover:underline"
                                  >
                                    Editar em Massa
                                  </button>
                                </th>
                                <th className="px-3 py-2 text-left">
                                  Custo de Compra(R$)
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const value = prompt("Preencher todos com o valor:");
                                      if (value) fillAllVariantField("cost_price", value);
                                    }}
                                    className="ml-1 text-blue-600 dark:text-blue-400 text-xs hover:underline"
                                  >
                                    Editar em Massa
                                  </button>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {variantRows.map((row, index) => (
                                <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                  <td className="px-3 py-2">{row.color?.name || "-"}</td>
                                  <td className="px-3 py-2">{row.size?.name || "-"}</td>
                                  <td className="px-3 py-2">
                                    <Input
                                      value={row.sku}
                                      onChange={(e) => updateVariantRow(index, "sku", e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex gap-1">
                                      <Input
                                        value={row.barcode}
                                        onChange={(e) => updateVariantRow(index, "barcode", e.target.value)}
                                        placeholder="EAN,UPC,G1"
                                        className="h-8 text-sm flex-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generateBarcodeForVariant(index)}
                                        className="h-8 px-2"
                                        title="Gerar EAN-13"
                                      >
                                        Gerar
                                      </Button>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={row.sale_price}
                                      onChange={(e) => updateVariantRow(index, "sale_price", e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={row.cost_price}
                                      onChange={(e) => updateVariantRow(index, "cost_price", e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Card 4: Informação da Taxação */}
                {variantRows.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Informação da Taxação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-3 py-2 text-left">Cor</th>
                              <th className="px-3 py-2 text-left">Tamanho</th>
                              <th className="px-3 py-2 text-left">
                                NCM
                                <button
                                  type="button"
                                  onClick={() => {
                                    const value = prompt("Preencher todos com o valor:");
                                    if (value) fillAllVariantField("ncm", value);
                                  }}
                                  className="ml-1 text-blue-600 dark:text-blue-400 text-xs hover:underline"
                                >
                                  Preencher em massa
                                </button>
                              </th>
                              <th className="px-3 py-2 text-left">
                                CEST
                                <button
                                  type="button"
                                  onClick={() => {
                                    const value = prompt("Preencher todos com o valor:");
                                    if (value) fillAllVariantField("cest", value);
                                  }}
                                  className="ml-1 text-blue-600 dark:text-blue-400 text-xs hover:underline"
                                >
                                  Preencher em massa
                                </button>
                              </th>
                              <th className="px-3 py-2 text-left">
                                Unidade
                                <button
                                  type="button"
                                  onClick={() => {
                                    const value = prompt("Preencher todos com o valor:");
                                    if (value) fillAllVariantField("unit", value);
                                  }}
                                  className="ml-1 text-blue-600 dark:text-blue-400 text-xs hover:underline"
                                >
                                  Preencher em massa
                                </button>
                              </th>
                              <th className="px-3 py-2 text-left">
                                Origem
                                <button
                                  type="button"
                                  onClick={() => {
                                    const value = prompt("Preencher todos com o valor:");
                                    if (value) fillAllVariantField("origin", value);
                                  }}
                                  className="ml-1 text-blue-600 dark:text-blue-400 text-xs hover:underline"
                                >
                                  Preencher em massa
                                </button>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {variantRows.map((row, index) => (
                              <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-3 py-2">{row.color?.name || "-"}</td>
                                <td className="px-3 py-2">{row.size?.name || "-"}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    value={row.ncm}
                                    onChange={(e) => updateVariantRow(index, "ncm", e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    value={row.cest}
                                    onChange={(e) => updateVariantRow(index, "cest", e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={row.unit}
                                    onValueChange={(value) => updateVariantRow(index, "unit", value)}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="UN">UN</SelectItem>
                                      <SelectItem value="PC">PC</SelectItem>
                                      <SelectItem value="KT">KT</SelectItem>
                                      <SelectItem value="JG">JG</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={row.origin}
                                    onValueChange={(value) => updateVariantRow(index, "origin", value)}
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">0 - Nacional</SelectItem>
                                      <SelectItem value="1">1 - Estrangeira - Importação direta</SelectItem>
                                      <SelectItem value="2">2 - Estrangeira - Mercado interno</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Card 5: Mídia */}
                <Card>
                  <CardHeader>
                    <CardTitle>Mídia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label>URL da Imagem</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://..."
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const input = e.currentTarget;
                              if (input.value) {
                                setMediaUrls([...mediaUrls, input.value]);
                                input.value = "";
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input.value) {
                              setMediaUrls([...mediaUrls, input.value]);
                              input.value = "";
                            }
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {mediaUrls.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {mediaUrls.map((url, index) => (
                            <div key={index} className="relative group">
                              <img src={url} alt="" className="w-full h-20 object-cover rounded" />
                              <button
                                type="button"
                                onClick={() => setMediaUrls(mediaUrls.filter((_, i) => i !== index))}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100"
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
              </>
            )}

            {/* KIT PRODUCT */}
            {productType === "kit" && (
              <>
                {/* Card 1: Informação Básica */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informação Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>SPU *</Label>
                        <Input value={spu} onChange={(e) => setSpu(e.target.value)} required />
                      </div>
                      <div>
                        <Label>Nome do Produto *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>
                    </div>
                    <div>
                      <Label>Apelido</Label>
                      <Input value={aliasName} onChange={(e) => setAliasName(e.target.value)} />
                      <div className="flex items-center gap-2 mt-2">
                        <Switch checked={useAliasInNfe} onCheckedChange={setUseAliasInNfe} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Substituir o título ao emitir NF-e
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
                    <div>
                      <Label>URL da Imagem</Label>
                      <Input
                        placeholder="https://..."
                        onBlur={(e) => {
                          if (e.target.value) {
                            setMediaUrls([e.target.value]);
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Informação do KIT */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informação do KIT</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Buscar Produto por SKU</Label>
                      <div className="relative">
                        <Input
                          value={searchSku}
                          onChange={(e) => {
                            setSearchSku(e.target.value);
                            searchProduct(e.target.value);
                          }}
                          placeholder="Digite SKU ou nome do produto"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                            {searchResults.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => addKitItem(product)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between"
                              >
                                <span>{product.sku} - {product.name}</span>
                                <span className="text-gray-500">R$ {product.cost_price?.toFixed(2) || "0.00"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {kitItems.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-3 py-2 text-left text-sm">SKU/Nome</th>
                              <th className="px-3 py-2 text-left text-sm">Custo (R$)</th>
                              <th className="px-3 py-2 text-left text-sm">Quantidade</th>
                              <th className="px-3 py-2 text-right text-sm">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kitItems.map((item, index) => (
                              <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-3 py-2 text-sm">
                                  <div>{item.sku}</div>
                                  <div className="text-gray-500 text-xs">{item.name}</div>
                                </td>
                                <td className="px-3 py-2 text-sm">{item.cost_price?.toFixed(2)}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newItems = [...kitItems];
                                      newItems[index].quantity = parseInt(e.target.value) || 1;
                                      setKitItems(newItems);
                                    }}
                                    className="w-20 h-8"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setKitItems(kitItems.filter((_, i) => i !== index))}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* DYNAMIC PRODUCT */}
            {productType === "dynamic" && (
              <>
                {/* Card 1: Informação Básica */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informação Básica</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>SPU *</Label>
                        <Input value={spu} onChange={(e) => setSpu(e.target.value)} required />
                      </div>
                      <div>
                        <Label>Nome do Produto *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} required />
                      </div>
                    </div>
                    <div>
                      <Label>Apelido</Label>
                      <Input value={aliasName} onChange={(e) => setAliasName(e.target.value)} />
                      <div className="flex items-center gap-2 mt-2">
                        <Switch checked={useAliasInNfe} onCheckedChange={setUseAliasInNfe} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Substituir o título ao emitir NF-e
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
                    <div>
                      <Label>URL da Imagem</Label>
                      <Input
                        placeholder="https://..."
                        onBlur={(e) => {
                          if (e.target.value) {
                            setMediaUrls([e.target.value]);
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Informação do Conjunto */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informação do Conjunto</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm">
                      <p className="text-blue-800 dark:text-blue-200">
                        <strong>Produto Dinâmico:</strong> Ao vender este produto, o sistema escolherá aleatoriamente 
                        um dos produtos componentes do conjunto. O estoque total será a soma de todos os componentes, 
                        e o custo será calculado como a média ponderada.
                      </p>
                    </div>

                    <div>
                      <Label>Buscar Produto por SKU</Label>
                      <div className="relative">
                        <Input
                          value={searchSku}
                          onChange={(e) => {
                            setSearchSku(e.target.value);
                            searchProduct(e.target.value);
                          }}
                          placeholder="Digite SKU ou nome do produto"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto">
                            {searchResults.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => addDynamicItem(product)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between"
                              >
                                <span>{product.sku} - {product.name}</span>
                                <span className="text-gray-500">
                                  R$ {product.cost_price?.toFixed(2) || "0.00"} | Estoque: {product.stock || 0}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {dynamicItems.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-3 py-2 text-left text-sm">SKU/Nome</th>
                              <th className="px-3 py-2 text-left text-sm">Custo (R$)</th>
                              <th className="px-3 py-2 text-left text-sm">Quantidade</th>
                              <th className="px-3 py-2 text-right text-sm">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dynamicItems.map((item, index) => (
                              <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-3 py-2 text-sm">
                                  <div>{item.sku}</div>
                                  <div className="text-gray-500 text-xs">{item.name}</div>
                                </td>
                                <td className="px-3 py-2 text-sm">{item.cost_price?.toFixed(2)}</td>
                                <td className="px-3 py-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newItems = [...dynamicItems];
                                      newItems[index].quantity = parseInt(e.target.value) || 1;
                                      setDynamicItems(newItems);
                                    }}
                                    className="w-20 h-8"
                                  />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDynamicItems(dynamicItems.filter((_, i) => i !== index))}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Produto"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
