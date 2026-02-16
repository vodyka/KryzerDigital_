import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Settings,
  FileSpreadsheet,
  AlertTriangle,
  Check,
  Download,
  Palette,
  Upload,
  FileCheck,
  X,
  Package,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
} from "lucide-react";
import * as ExcelJS from "exceljs";

interface Size {
  id?: number;
  name: string;
  code: string;
  sort_order: number;
}

interface SPUProduct {
  id?: number;
  spu: string;
  product_name: string;
}

interface SPUSuffix {
  id?: number;
  spu: string;
  keyword: string;
  suffix: string;
}

interface KitGroup {
  kitLabel: string;
  variations: string[];
  spus: string[];
  quantity: number;
}

interface FormData {
  kitName: string;
  kitGroups: KitGroup[];
  useSystemSequence: boolean;
  customSequenceFormat: string;
}

interface PreviewRow {
  kitSku: string;
  titulo: string;
  skuProduto: string;
  quantidade: number;
}

const KIT_TEMPLATE_HEADERS = [
  "Kit SKU*",
  "Título*",
  "Imagem",
  "SKU*",
  "SKU Qnt.*",
];

export default function CriarComposicaoPage() {
  const [activeTab, setActiveTab] = useState<"gerar" | "config">("gerar");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Configuração compartilhada
  const [sizes, setSizes] = useState<Size[]>([]);

  // Configuração específica de Kit
  const [spuProducts, setSpuProducts] = useState<SPUProduct[]>([]);
  const [spuSuffixes, setSpuSuffixes] = useState<SPUSuffix[]>([]);
  const [lastKNumber, setLastKNumber] = useState(0);

  // Template
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [systemTemplateUrl, setSystemTemplateUrl] = useState<string | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [restoringTemplate, setRestoringTemplate] = useState(false);

  // Formulário Gerar
  const [formData, setFormData] = useState<FormData>({
    kitName: "",
    kitGroups: [
      { kitLabel: "Kit 1", variations: [], spus: [], quantity: 3 },
    ],
    useSystemSequence: true,
    customSequenceFormat: "K{NN}.P{QQ}.T{TT}.S{SS}",
  });

  const [selectedSizes, setSelectedSizes] = useState<Set<number>>(new Set());
  const [sizeSearch, setSizeSearch] = useState("");
  const [variationSearch, setVariationSearch] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [expandedKitId, setExpandedKitId] = useState<number>(0);

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper para sincronizar SPUs com variações
  const syncGroupSpusLength = (group: KitGroup): KitGroup => {
    const n = group.variations.length;
    const spus = group.spus || [];
    if (spus.length === n) return group;
    return { ...group, spus: [...spus.slice(0, n), ...new Array(Math.max(0, n - spus.length)).fill("")] };
  };

  const addKitGroup = () => {
    const newIndex = formData.kitGroups.length;
    setFormData((prev) => ({
      ...prev,
      kitGroups: [
        ...prev.kitGroups,
        { kitLabel: `Kit ${prev.kitGroups.length + 1}`, variations: [], spus: [], quantity: 3 },
      ],
    }));
    setExpandedKitId(newIndex);
  };

  const removeKitGroup = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      kitGroups: prev.kitGroups.filter((_, i) => i !== index),
    }));
  };

  const fetchConfig = async () => {
    try {
      // Always fetch system template first (public route)
      const systemTemplateRes = await fetch("/api/kit-template/system");
      if (systemTemplateRes.ok) {
        const systemTemplateData = await systemTemplateRes.json();
        setSystemTemplateUrl(systemTemplateData.template_url || null);
        console.log("System template loaded:", systemTemplateData.template_url);
      } else {
        console.log("No system template configured");
      }

      // Then fetch user-specific data
      const [configRes, spuProductsRes, spuSuffixesRes, templateRes, sequenceRes] = await Promise.all([
        fetch("/api/variation-config"),
        fetch("/api/kit/spu-products"),
        fetch("/api/kit/spu-suffixes"),
        fetch("/api/kit-template"),
        fetch("/api/kit/sequence"),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        const sortedSizes = (data.sizes || []).sort(
          (a: Size, b: Size) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setSizes(sortedSizes);
      }

      if (spuProductsRes.ok) {
        const data = await spuProductsRes.json();
        setSpuProducts(data.products || []);
      }

      if (spuSuffixesRes.ok) {
        const data = await spuSuffixesRes.json();
        setSpuSuffixes(data.suffixes || []);
      }

      if (templateRes.ok) {
        const templateData = await templateRes.json();
        setTemplateUrl(templateData.template_url || null);
        console.log("User template loaded:", templateData.template_url);
      } else if (templateRes.status !== 401) {
        // Log only if it's not an auth error
        console.log("No user template configured");
      }

      if (sequenceRes.ok) {
        const sequenceData = await sequenceRes.json();
        setLastKNumber(sequenceData.last_k_number || 0);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/kit/spu-products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: spuProducts }),
        }),
        fetch("/api/kit/spu-suffixes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suffixes: spuSuffixes }),
        }),
      ]);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Apenas arquivos XLSX são aceitos");
      return;
    }

    setUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/kit-template", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setTemplateUrl(data.url);
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao fazer upload do template");
      }
    } catch (error) {
      console.error("Failed to upload template:", error);
      alert("Erro ao fazer upload do template");
    } finally {
      setUploadingTemplate(false);
      e.target.value = "";
    }
  };

  const handleDeleteTemplate = async () => {
    const message = systemTemplateUrl
      ? "Remover seu template personalizado? Você voltará a usar o template do sistema."
      : "Remover o template? Você voltará a usar os headers padrão.";
    if (!confirm(message)) return;

    try {
      const response = await fetch("/api/kit-template", { method: "DELETE" });
      if (response.ok) {
        setTemplateUrl(null);
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleRestoreSystemTemplate = async () => {
    if (!systemTemplateUrl) return;
    if (!confirm("Restaurar para o template do sistema? Seu template personalizado será removido.")) return;

    setRestoringTemplate(true);
    try {
      await fetch("/api/kit-template", { method: "DELETE" });
      setTemplateUrl(null);
    } catch (error) {
      console.error("Failed to restore system template:", error);
    } finally {
      setRestoringTemplate(false);
    }
  };

  // Get available variation names from suffixes
  const availableVariations = useMemo(() => {
    const variations = new Set<string>();
    spuSuffixes.forEach((s) => variations.add(s.keyword));
    return Array.from(variations).sort();
  }, [spuSuffixes]);

  // Get available SPUs from products
  const availableSpus = useMemo(() => {
    return spuProducts.map((p) => p.spu).sort();
  }, [spuProducts]);

  const toggleSize = (sizeId: number) => {
    const newSelected = new Set(selectedSizes);
    if (newSelected.has(sizeId)) newSelected.delete(sizeId);
    else newSelected.add(sizeId);
    setSelectedSizes(newSelected);
  };

  // Filtered variations based on search
  const filteredVariations = useMemo(() => {
    if (!variationSearch.trim()) return availableVariations;
    const search = variationSearch.toLowerCase();
    return availableVariations.filter(v => v.toLowerCase().includes(search));
  }, [availableVariations, variationSearch]);

  // Filtered sizes based on search
  const filteredSizes = useMemo(() => {
    if (!sizeSearch.trim()) return sizes;
    const search = sizeSearch.toLowerCase();
    return sizes.filter(s => 
      s.name.toLowerCase().includes(search) || 
      s.code.toLowerCase().includes(search)
    );
  }, [sizes, sizeSearch]);

  // Função para encontrar sufixo baseado no map_modelos
  const findSuffix = (spu: string, variation: string): string => {
    const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanVar = clean(variation);

    // Tentar match exato com SPU específico
    let match = spuSuffixes.find(
      (s) => s.spu === spu && clean(s.keyword) === cleanVar
    );
    if (match) return match.suffix;

    // Tentar match parcial (palavra contém)
    match = spuSuffixes.find(
      (s) => s.spu === spu && (cleanVar.includes(clean(s.keyword)) || clean(s.keyword).includes(cleanVar))
    );
    if (match) return match.suffix;

    // Tentar match com SPU = "*" (wildcard)
    match = spuSuffixes.find(
      (s) => s.spu === "*" && clean(s.keyword) === cleanVar
    );
    if (match) return match.suffix;

    // Fallback: 2 primeiras letras uppercase
    return variation.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "XX";
  };

  // Toggle variation in group
  const toggleVariation = (groupIndex: number, variation: string) => {
    const group = formData.kitGroups[groupIndex];
    const isSelected = group.variations.includes(variation);
    
    const newGroups = [...formData.kitGroups];
    
    if (isSelected) {
      // Remove variation and its corresponding SPU
      const varIndex = group.variations.indexOf(variation);
      newGroups[groupIndex] = {
        ...group,
        variations: group.variations.filter((_, i) => i !== varIndex),
        spus: group.spus.filter((_, i) => i !== varIndex),
      };
    } else {
      // Add variation and empty SPU slot
      newGroups[groupIndex] = {
        ...group,
        variations: [...group.variations, variation],
        spus: [...group.spus, ""],
      };
    }
    
    setFormData({ ...formData, kitGroups: newGroups });
  };

  // Update SPU for a variation
  const updateVariationSpu = (groupIndex: number, varIndex: number, spu: string) => {
    const newGroups = [...formData.kitGroups];
    const newSpus = [...newGroups[groupIndex].spus];
    newSpus[varIndex] = spu;
    newGroups[groupIndex].spus = newSpus;
    setFormData({ ...formData, kitGroups: newGroups });
  };

  // Get kit summary
  const getKitSummary = (group: KitGroup) => {
    const syncedGroup = syncGroupSpusLength(group);
    const selectedCount = syncedGroup.variations.length;
    const spuList = syncedGroup.spus.filter(s => s).join(", ");
    const isComplete = selectedCount > 0 && syncedGroup.spus.every(s => s);
    
    return {
      selectedCount,
      spuList,
      isComplete,
    };
  };

  // Preview em tempo real
  const previewRows = useMemo((): PreviewRow[] => {
    const rows: PreviewRow[] = [];
    if (!formData.kitName.trim()) return rows;

    const selectedSizesList = [...sizes]
      .filter((s) => s.id && selectedSizes.has(s.id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (selectedSizesList.length === 0) return rows;

    const kNumber = String(lastKNumber + 1).padStart(2, "0");
    let sequenceCounter = 1;

    for (const group of formData.kitGroups) {
      if (!group.variations || group.variations.length === 0) continue;

      const numVariations = group.variations.length;
      const isMultiple = numVariations > 1;

      // garante que spus tem o mesmo tamanho
      const g = syncGroupSpusLength(group);

      for (const size of selectedSizesList) {
        const pNumber = isMultiple
          ? String(numVariations).padStart(2, "0")
          : String(g.quantity).padStart(2, "0");

        const tCode =
          size.code.length === 2 && /^\d+$/.test(size.code)
            ? size.code
            : size.name.charAt(0).toUpperCase();

        const sNumber = String(sequenceCounter).padStart(2, "0");

        const kitSku = formData.useSystemSequence
          ? `K${kNumber}.P${pNumber}.T${tCode}.S${sNumber}`
          : formData.customSequenceFormat
              .replace("{NN}", kNumber)
              .replace("{QQ}", pNumber)
              .replace("{TT}", tCode)
              .replace("{SS}", sNumber);

        const firstSpu = g.spus[0] || "";
        const firstSpuProduct = spuProducts.find((p) => p.spu === firstSpu);
        const productName = firstSpuProduct?.product_name || "Produto";

        let titulo: string;
        if (isMultiple) {
          const variationNames = g.variations.join(" - ");
          titulo = `Kit ${numVariations} ${productName} ${variationNames} ${size.name}`;
        } else {
          titulo = `Kit ${g.quantity} ${productName} ${g.variations[0]} ${size.name}`;
        }

        if (isMultiple) {
          for (let i = 0; i < numVariations; i++) {
            const variation = g.variations[i];
            const spu = g.spus[i] || "";
            if (!spu) continue;

            const suffix = findSuffix(spu, variation);
            const skuProduto = `${spu}${suffix}${size.code}`;

            rows.push({ kitSku, titulo, skuProduto, quantidade: 1 });
          }
        } else {
          const spu = g.spus[0] || "";
          if (spu) {
            const suffix = findSuffix(spu, g.variations[0]);
            const skuProduto = `${spu}${suffix}${size.code}`;
            rows.push({ kitSku, titulo, skuProduto, quantidade: g.quantity });
          }
        }

        sequenceCounter++;
      }
    }

    return rows;
  }, [formData, sizes, selectedSizes, spuProducts, spuSuffixes, lastKNumber, syncGroupSpusLength]);

  // Contadores para a prévia
  const totalKits = useMemo(() => {
    const kitSkus = new Set(previewRows.map((r) => r.kitSku));
    return kitSkus.size;
  }, [previewRows]);

  const totalLines = previewRows.length;

  // Validações
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!formData.kitName.trim()) errors.push("Nome base do kit é obrigatório");
    if (selectedSizes.size === 0) errors.push("Selecione pelo menos 1 tamanho");
    
    for (let g = 0; g < formData.kitGroups.length; g++) {
      const group = syncGroupSpusLength(formData.kitGroups[g]);
      if (!group.variations.length) {
        errors.push(`${group.kitLabel}: selecione pelo menos 1 variação`);
        continue;
      }

      for (let i = 0; i < group.variations.length; i++) {
        if (!group.spus[i]) errors.push(`${group.kitLabel}: SPU do item ${i + 1} (${group.variations[i]}) é obrigatório`);
      }

      if (group.variations.length === 1 && group.quantity < 1) {
        errors.push(`${group.kitLabel}: quantidade deve ser no mínimo 1`);
      }
    }

    return errors;
  }, [formData, selectedSizes, syncGroupSpusLength]);

  const [generating, setGenerating] = useState(false);

  const generateXLSX = async () => {
    if (validationErrors.length > 0) {
      alert(`Corrija os erros antes de gerar:\n${validationErrors.join("\n")}`);
      return;
    }

    setGenerating(true);

    try {
      // Increment sequence
      const generateRes = await fetch("/api/kit/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kit_name: formData.kitName,
          variations: formData.kitGroups.flatMap(g => g.variations),
          sizes: [...sizes].filter((s) => s.id && selectedSizes.has(s.id)).map((s) => s.name),
          total_kits: totalKits,
          total_lines: totalLines,
        }),
      });

      if (!generateRes.ok) {
        throw new Error("Failed to generate kit sequence");
      }

      const { k_number } = await generateRes.json();

      const activeTemplateUrl = templateUrl || systemTemplateUrl;

      const workbook = new ExcelJS.Workbook();
      let worksheet: ExcelJS.Worksheet;

      if (activeTemplateUrl) {
        const response = await fetch(activeTemplateUrl);
        if (!response.ok) throw new Error("Falha ao baixar template XLSX");

        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        worksheet = workbook.worksheets[0];
        if (!worksheet) throw new Error("Template XLSX sem planilha");

        const rowCount = worksheet.rowCount;
        if (rowCount > 1) {
          worksheet.spliceRows(2, rowCount - 1);
        }
      } else {
        worksheet = workbook.addWorksheet("Import_Composition_Template");
        
        const headerRow = worksheet.getRow(1);
        KIT_TEMPLATE_HEADERS.forEach((header, idx) => {
          headerRow.getCell(idx + 1).value = header;
        });
        headerRow.font = { bold: true };
      }

      const kNumberReal = String(k_number).padStart(2, "0");
      let currentRow = 2;
      
      for (const r of previewRows) {
        const kitSkuFixed = r.kitSku.replace(/^K\d{2}/, `K${kNumberReal}`);
        const row = worksheet.getRow(currentRow);
        
        row.getCell(1).value = kitSkuFixed;
        row.getCell(2).value = r.titulo;
        row.getCell(3).value = "";
        row.getCell(4).value = r.skuProduto;
        row.getCell(5).value = r.quantidade;

        currentRow++;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `Kit_${formData.kitName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      setLastKNumber(k_number);
    } catch (error) {
      console.error("Failed to generate XLSX:", error);
      alert("Erro ao gerar o arquivo XLSX");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-10 h-10 text-blue-500 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  const sortedSizes = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Criação de Composição (Kit)</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gere planilhas XLSX compatíveis com UpSeller</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("gerar")}
                className={`flex items-center gap-2 px-4 h-9 text-xs font-medium rounded-lg transition ${
                  activeTab === "gerar"
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Gerar
              </button>
              <button
                onClick={() => setActiveTab("config")}
                className={`flex items-center gap-2 px-4 h-9 text-xs font-medium rounded-lg transition ${
                  activeTab === "config"
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Configuração
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Tab Content */}
        {activeTab === "config" ? (
          <div className="space-y-6">
            {/* Template Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Template Kit (UpSeller)</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Faça upload do template original do UpSeller para kits/composições
                  </p>
                </div>
              </div>

              {templateUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          Seu template personalizado
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Os headers do seu template serão usados na geração
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDeleteTemplate}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Remover template"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {systemTemplateUrl && (
                    <button
                      onClick={handleRestoreSystemTemplate}
                      disabled={restoringTemplate}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition disabled:opacity-50"
                    >
                      {restoringTemplate ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                      )}
                      {restoringTemplate ? "Restaurando..." : "Restaurar para Template do Sistema"}
                    </button>
                  )}
                </div>
              ) : systemTemplateUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Usando template do sistema
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          O template padrão configurado pelo administrador será usado
                        </p>
                      </div>
                    </div>
                  </div>
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer transition">
                    {uploadingTemplate ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingTemplate ? "Enviando..." : "Usar Meu Próprio Template"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleTemplateUpload}
                      className="hidden"
                      disabled={uploadingTemplate}
                    />
                  </label>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Arraste o template XLSX do UpSeller ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    Isso garante que os headers fiquem idênticos ao formato aceito
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer transition">
                    {uploadingTemplate ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingTemplate ? "Enviando..." : "Selecionar Arquivo"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleTemplateUpload}
                      className="hidden"
                      disabled={uploadingTemplate}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Observação:</strong> Cores e Tamanhos são compartilhados com o módulo "Criar Variação". Configure-os
                  na página de variação se necessário.
                </p>
              </div>
            </div>

            {/* SPU Products */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">SPU + Nome do Produto</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Usado para montar os títulos dos kits
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSpuProducts([...spuProducts, { spu: "", product_name: "" }])}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {spuProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                    Nenhum SPU cadastrado. Ex: SPU 504 → Vestido Ciganinha
                  </p>
                ) : (
                  spuProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="SPU (ex: 504)"
                        value={product.spu}
                        onChange={(e) => {
                          const newProducts = [...spuProducts];
                          newProducts[index].spu = e.target.value;
                          setSpuProducts(newProducts);
                        }}
                        className="w-32 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Nome do Produto (ex: Vestido Ciganinha)"
                        value={product.product_name}
                        onChange={(e) => {
                          const newProducts = [...spuProducts];
                          newProducts[index].product_name = e.target.value;
                          setSpuProducts(newProducts);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => setSpuProducts(spuProducts.filter((_, i) => i !== index))}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SPU Suffixes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Mapeamento de Sufixos (Map Modelos)</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      SPU + Palavra-chave → Sufixo do SKU. Use "*" para regras universais
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSpuSuffixes([...spuSuffixes, { spu: "", keyword: "", suffix: "" }])}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Exemplo:</strong> SPU 504 + "Gata Bailarina" → GB • SPU 515 + "Ursinho" → UR • SPU * + "Primavera" → PR
                </p>
              </div>

              <div className="space-y-3">
                {spuSuffixes.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum sufixo cadastrado</p>
                ) : (
                  spuSuffixes.map((suffix, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="SPU (* = universal)"
                        value={suffix.spu}
                        onChange={(e) => {
                          const newSuffixes = [...spuSuffixes];
                          newSuffixes[index].spu = e.target.value;
                          setSpuSuffixes(newSuffixes);
                        }}
                        className="w-32 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Palavra-chave (ex: Ursinho)"
                        value={suffix.keyword}
                        onChange={(e) => {
                          const newSuffixes = [...spuSuffixes];
                          newSuffixes[index].keyword = e.target.value;
                          setSpuSuffixes(newSuffixes);
                        }}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="Sufixo (ex: UR)"
                        value={suffix.suffix}
                        onChange={(e) => {
                          const newSuffixes = [...spuSuffixes];
                          newSuffixes[index].suffix = e.target.value.toUpperCase();
                          setSpuSuffixes(newSuffixes);
                        }}
                        className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white uppercase"
                      />
                      <button
                        onClick={() => setSpuSuffixes(spuSuffixes.filter((_, i) => i !== index))}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveConfig}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition shadow-sm ${
                  saved
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                } disabled:opacity-50`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? "Salvo!" : "Salvar Configuração"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Informações Básicas */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-white">1</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações do Kit</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome Base do Kit *</label>
                    <input
                      type="text"
                      value={formData.kitName}
                      onChange={(e) => setFormData({ ...formData, kitName: e.target.value })}
                      placeholder="Ex: Kit Vestido"
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      Nome usado no arquivo exportado
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Composição dos Kits */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-white">2</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Composição dos Kits</h2>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {formData.kitGroups.map((group, groupIndex) => {
                    const syncedGroup = syncGroupSpusLength(group);
                    const summary = getKitSummary(group);
                    const isExpanded = expandedKitId === groupIndex;

                    return (
                      <div key={groupIndex} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                        {/* Header (collapsible) */}
                        <button
                          onClick={() => setExpandedKitId(isExpanded ? -1 : groupIndex)}
                          className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900 dark:text-white">{group.kitLabel}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {summary.selectedCount} {summary.selectedCount === 1 ? "item" : "itens"}
                            </span>
                            {summary.spuList && (
                              <>
                                <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                                <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                                  SPU: {summary.spuList}
                                </span>
                              </>
                            )}
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                              summary.isComplete
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            }`}>
                              {summary.isComplete ? "Completo ✓" : "Incompleto"}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 space-y-4">
                            {formData.kitGroups.length > 1 && (
                              <div className="flex justify-end">
                                <button
                                  onClick={() => removeKitGroup(groupIndex)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-sm"
                                  title="Remover kit"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remover Kit
                                </button>
                              </div>
                            )}

                            {/* Search */}
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Buscar variações..."
                                value={variationSearch}
                                onChange={(e) => setVariationSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                              />
                            </div>

                            {/* Variations List with inline SPU selects */}
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Selecione as Variações e seus SPUs *
                              </label>
                              
                              <div className="space-y-2 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                                {availableVariations.length === 0 ? (
                                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                                    Configure sufixos na aba "Configuração"
                                  </p>
                                ) : filteredVariations.length === 0 ? (
                                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
                                    Nenhuma variação encontrada
                                  </p>
                                ) : (
                                  <>
                                    {/* Selected variations first */}
                                    {filteredVariations
                                      .filter((variation) => group.variations.includes(variation))
                                      .map((variation) => {
                                        const varIndex = group.variations.indexOf(variation);
                                        
                                        return (
                                          <div key={variation} className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                            <input
                                              type="checkbox"
                                              checked={true}
                                              onChange={() => toggleVariation(groupIndex, variation)}
                                              className="w-4 h-4 text-blue-500 rounded flex-shrink-0 cursor-pointer"
                                            />
                                            <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[120px]">
                                              {variation}
                                            </span>
                                            <span className="text-gray-400 dark:text-gray-500">→</span>
                                            <select
                                              value={syncedGroup.spus[varIndex] || ""}
                                              onChange={(e) => updateVariationSpu(groupIndex, varIndex, e.target.value)}
                                              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                                            >
                                              <option value="">Selecione o SPU</option>
                                              {availableSpus.map((spu) => (
                                                <option key={spu} value={spu}>
                                                  {spu} - {spuProducts.find((p) => p.spu === spu)?.product_name || ""}
                                                </option>
                                              ))}
                                            </select>
                                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 rounded flex-shrink-0">
                                              Item {varIndex + 1}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    
                                    {/* Unselected variations after */}
                                    {filteredVariations
                                      .filter((variation) => !group.variations.includes(variation))
                                      .map((variation) => (
                                        <div key={variation} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={false}
                                            onChange={() => toggleVariation(groupIndex, variation)}
                                            className="w-4 h-4 text-blue-500 rounded flex-shrink-0 cursor-pointer"
                                          />
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {variation}
                                          </span>
                                        </div>
                                      ))}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Quantidade */}
                            {syncedGroup.variations.length === 1 && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                  Quantidade do Kit *
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={group.quantity}
                                  onChange={(e) => {
                                    const newGroups = [...formData.kitGroups];
                                    newGroups[groupIndex].quantity = parseInt(e.target.value) || 1;
                                    setFormData({ ...formData, kitGroups: newGroups });
                                  }}
                                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                  Kit com {group.quantity} unidades do mesmo SKU
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={addKitGroup}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium rounded-xl transition shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar Novo Kit
                  </button>
                </div>
              </div>

              {/* Step 3: Configurações de SKU */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-white">3</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sequência de SKU's</h2>
                      <button
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="K{NN} = número do kit (K01, K02...) • P{QQ} = quantidade de peças • T{TT} = sigla do tamanho • S{SS} = sequência de variações"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useSystemSequence}
                      onChange={(e) => setFormData({ ...formData, useSystemSequence: e.target.checked })}
                      className="w-4 h-4 text-blue-500 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Usar sequência do sistema</span>
                  </label>

                  {!formData.useSystemSequence && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Formato Personalizado
                      </label>
                      <input
                        type="text"
                        value={formData.customSequenceFormat}
                        onChange={(e) => setFormData({ ...formData, customSequenceFormat: e.target.value })}
                        placeholder="Ex: K{NN}.P{QQ}.T{TT}.S{SS}"
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white font-mono"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                        Use: {"{NN}"} = número kit, {"{QQ}"} = quantidade, {"{TT}"} = tamanho, {"{SS}"} = sequência
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Último K gerado: <span className="font-semibold text-blue-600 dark:text-blue-400">K{String(lastKNumber).padStart(2, "0")}</span> • Próximo
                      será: <span className="font-semibold text-blue-600 dark:text-blue-400">K{String(lastKNumber + 1).padStart(2, "0")}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - 1/3 width (Sticky) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="sticky top-24 space-y-6">
                {/* Tamanhos */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Tamanhos</h3>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                        {selectedSizes.size} selecionados
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar tamanhos..."
                        value={sizeSearch}
                        onChange={(e) => setSizeSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                      />
                    </div>

                    {sortedSizes.filter((s) => s.id && s.name && s.code).length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                        Configure tamanhos no módulo "Criar Variação"
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {filteredSizes
                          .filter((s) => s.id && s.name && s.code)
                          .map((size) => (
                            <button
                              key={size.id}
                              onClick={() => toggleSize(size.id!)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                                selectedSizes.has(size.id!)
                                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                              }`}
                            >
                              {size.name} ({size.code})
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium text-sm">Erros de validação</span>
                    </div>
                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                      {validationErrors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Stats */}
                {previewRows.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Estatísticas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalKits}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Kits</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalLines}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Linhas</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={generateXLSX}
                  disabled={validationErrors.length > 0 || generating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {generating ? "Gerando..." : `Gerar XLSX (${totalKits} kits)`}
                </button>

                {(templateUrl || systemTemplateUrl) && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 justify-center">
                    <CheckCircle2 className="w-3 h-3" />
                    {templateUrl ? "Usando seu template personalizado" : "Usando template do sistema"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview Table - Full Width Below */}
        {activeTab === "gerar" && previewRows.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-gray-400" />
                <div className="text-left">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Prévia de Geração ({totalLines} linhas)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Esta prévia reflete exatamente o que será exportado no XLSX
                  </p>
                </div>
              </div>
              {showPreview ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {showPreview && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Kit SKU</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Título</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">SKU Produto</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Qnt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {previewRows.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">{row.kitSku}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.titulo}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-mono text-xs">{row.skuProduto}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.quantidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {previewRows.length > 20 && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 text-center text-sm text-gray-500 dark:text-gray-400">
                    ... e mais {previewRows.length - 20} linhas
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
