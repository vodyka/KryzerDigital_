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
  Ruler,
  ArrowUp,
  ArrowDown,
  Upload,
  FileCheck,
  X,
  Image,
  GripVertical,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Barcode,
} from "lucide-react";
import * as ExcelJS from "exceljs";

interface Color {
  id?: number;
  name: string;
  code: string;
  sort_order?: number;
  image_url?: string | null;
}

interface Size {
  id?: number;
  name: string;
  code: string;
  sort_order: number;
}

interface FormData {
  spu: string;
  separadorSpu: string;
  separadorTamanho: string;
  tituloBase: string;
  usarApelidoNfe: boolean;
  custoCompra: string;
  ncm: string;
  cest: string;
  unidade: string;
  origem: string;
  linkFornecedor: string;
  precoVarejo: string;
  peso: string;
  comprimento: string;
  largura: string;
  altura: string;
  prefixoEan: string;
  cnpj5: string;
}

interface PreviewRow {
  spu: string;
  sku: string;
  titulo: string;
  cor: string;
  tamanho: string;
  custo: string;
  ncm: string;
  cest: string;
  unidade: string;
  origem: string;
}

interface BatchItem {
  id: string;
  timestamp: number;
  formData: FormData;
  selectedColorIds: number[];
  selectedSizeIds: number[];
  variationCount: number;
}

interface GtinHistoryItem {
  id: string;
  created_at: string;
  spu: string;
  sku: string;
  product_name: string;
  gtin: string;
  status: string;
}

const ORIGENS = [
  { value: "0", label: "0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8" },
  { value: "1", label: "1 - Estrangeira - Importação direta, exceto a indicada no código 6" },
  { value: "2", label: "2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7" },
  { value: "3", label: "3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%" },
  { value: "4", label: "4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos" },
  { value: "5", label: "5 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%" },
  { value: "6", label: "6 - Estrangeira - Importação direta, sem similar nacional, constante em lista da CAMEX" },
  { value: "7", label: "7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX" },
  { value: "8", label: "8 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%" },
];

interface HeaderDefinition {
  label: string;
  helper?: string;
}

const TEMPLATE_HEADERS: HeaderDefinition[] = [
  { label: "SPU*", helper: "Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais" },
  { label: "SKU*", helper: "Obrigatório, 1-200 caracteres e limite de números, letras e caracteres especiais" },
  { label: "Título*", helper: "Obrigatório, 1-500 caracteres" },
  { label: "Apelido do Produto", helper: "1-500 caracteres" },
  { label: "Usar apelido como título da NFe" },
  { label: "Variantes1*", helper: "Obrigatório, 1-14 caracteres" },
  { label: "Valor da Variante1*", helper: "Obrigatório, 1-30 caracteres" },
  { label: "Variantes2", helper: "limite 1-14 caracteres" },
  { label: "Valor da Variante2", helper: "limite 1-30 caracteres" },
  { label: "Variantes3", helper: "limite 1-14 caracteres" },
  { label: "Valor da Variante3", helper: "limite 1-30 caracteres" },
  { label: "Variantes4", helper: "limite 1-14 caracteres" },
  { label: "Valor da Variante4", helper: "limite 1-30 caracteres" },
  { label: "Variantes5", helper: "limite 1-14 caracteres" },
  { label: "Valor da Variante5", helper: "limite 1-30 caracteres" },
  { label: "Preço de varejo", helper: "limite 0-999999999" },
  { label: "Custo de Compra", helper: "limite 0-999999999" },
  { label: "Quantidade", helper: "limite 0-999999999, Se não for preenchido, não será registrado na Lista de Estoque" },
  { label: "N° do Estante", helper: "Apenas estantes existentes, serão filtrados se o estante selecionado estiver cheio ou ficará cheio após a importação" },
  { label: "Código de Barras", helper: "Limite de 8 a 14 caracteres, separe vários códigos de barras com vírgulas" },
  { label: "Apelido de SKU", helper: "Limite a letras, números e caracteres especiais; separe vários apelidos de SKU com vírgulas; máximo de 20 entradas" },
  { label: "Imagem" },
  { label: "Peso (g)", helper: "limite 1-999999" },
  { label: "Comprimento (cm)", helper: "limite 1-999999" },
  { label: "Largura (cm)", helper: "limite 1-999999" },
  { label: "Altura (cm)", helper: "limite 1-999999" },
  { label: "NCM", helper: "limite 8 dígitos" },
  { label: "CEST", helper: "limite 7 dígitos" },
  { label: "Unidade", helper: "Selecionar UN/KG/Par" },
  { label: "Origem", helper: "Selecionar 0/1/2/3/4/5/6/7/8" },
  { label: "Link do Fornecedor" },
];

export default function CriarVariacaoPage() {
  const [activeTab, setActiveTab] = useState<"gerar" | "config" | "gtin">("gerar");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);

  const [templateUrl, setTemplateUrl] = useState<string | null>(null); // template do usuário
  const [systemTemplateUrl, setSystemTemplateUrl] = useState<string | null>(null); // template do sistema (admin)
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [restoringTemplate, setRestoringTemplate] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    spu: "",
    separadorSpu: "",
    separadorTamanho: "",
    tituloBase: "",
    usarApelidoNfe: false,
    custoCompra: "",
    ncm: "",
    cest: "",
    unidade: "UN",
    origem: "0",
    linkFornecedor: "",
    precoVarejo: "",
    peso: "",
    comprimento: "",
    largura: "",
    altura: "",
    prefixoEan: "789",
    cnpj5: "",
  });

  const [selectedColors, setSelectedColors] = useState<Set<number>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<number>>(new Set());
  const [kitWarning, setKitWarning] = useState(false);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [showBatchPanel, setShowBatchPanel] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [colorSearch, setColorSearch] = useState("");
  const [sizeSearch, setSizeSearch] = useState("");

  // GTIN History state
  const [gtinHistory, setGtinHistory] = useState<GtinHistoryItem[]>([]);
  const [gtinSearch, setGtinSearch] = useState("");
  const [gtinPage, setGtinPage] = useState(1);
  const [gtinTotalPages, setGtinTotalPages] = useState(1);
  const [gtinLoading, setGtinLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "gtin") {
      fetchGtinHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, gtinPage, gtinSearch]);

  const fetchConfig = async () => {
    try {
      // Always fetch system template first (public route)
      const systemTemplateRes = await fetch("/api/variation-template/system");
      if (systemTemplateRes.ok) {
        const systemTemplateData = await systemTemplateRes.json();
        setSystemTemplateUrl(systemTemplateData.template_url || null);
        console.log("System template loaded:", systemTemplateData.template_url);
      } else {
        console.log("No system template configured");
      }

      // Then fetch user-specific data
      const [configRes, userTemplateRes] = await Promise.all([
        fetch("/api/variation-config"),
        fetch("/api/variation-template"),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        const sortedColors = (data.colors || []).sort(
          (a: Color, b: Color) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setColors(sortedColors);

        const sortedSizes = (data.sizes || []).sort(
          (a: Size, b: Size) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setSizes(sortedSizes);
      }

      if (userTemplateRes.ok) {
        const templateData = await userTemplateRes.json();
        setTemplateUrl(templateData.template_url || null);
        console.log("User template loaded:", templateData.template_url);
      } else if (userTemplateRes.status !== 401) {
        // Log only if it's not an auth error
        console.log("No user template configured");
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGtinHistory = async () => {
    setGtinLoading(true);
    try {
      const params = new URLSearchParams({
        page: gtinPage.toString(),
      });
      if (gtinSearch) params.append("search", gtinSearch);

      const response = await fetch(`/api/gtin/history?${params}`);
      if (response.ok) {
        const data = await response.json();
        setGtinHistory(data.items || []);
        setGtinTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Failed to fetch GTIN history:", error);
    } finally {
      setGtinLoading(false);
    }
  };

  // Upload template do usuário (continua igual)
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Apenas arquivos XLSX são aceitos");
      return;
    }

    setUploadingTemplate(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await fetch("/api/variation-template", {
        method: "POST",
        body: fd,
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
      const response = await fetch("/api/variation-template", { method: "DELETE" });
      if (response.ok) setTemplateUrl(null);
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleRestoreSystemTemplate = async () => {
    if (!systemTemplateUrl) return;
    if (!confirm("Restaurar para o template do sistema? Seu template personalizado será removido.")) return;

    setRestoringTemplate(true);
    try {
      await fetch("/api/variation-template", { method: "DELETE" });
      setTemplateUrl(null);
    } catch (error) {
      console.error("Failed to restore system template:", error);
    } finally {
      setRestoringTemplate(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/variation-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors, sizes }),
      });

      if (response.ok) {
        const data = await response.json();
        const sortedColors = (data.colors || []).sort(
          (a: Color, b: Color) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setColors(sortedColors);

        const sortedSizes = (data.sizes || []).sort(
          (a: Size, b: Size) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setSizes(sortedSizes);

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  const [colorDragIndex, setColorDragIndex] = useState<number | null>(null);
  const [uploadingColorImage, setUploadingColorImage] = useState<number | null>(null);

  const addColor = () => {
    const maxOrder = colors.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
    setColors([...colors, { name: "", code: "", sort_order: maxOrder + 1 }]);
  };

  const removeColor = (index: number) => {
    const sortedColors = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const colorToRemove = sortedColors[index];
    const newColors = colors.filter((c) => c !== colorToRemove);
    setColors(newColors);

    if (colorToRemove?.id) {
      const newSelected = new Set(selectedColors);
      newSelected.delete(colorToRemove.id);
      setSelectedColors(newSelected);
    }
  };

  const updateColor = (index: number, field: "name" | "code" | "image_url", value: string | null) => {
    const sortedColors = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const targetColor = sortedColors[index];
    const newColors = colors.map((c) => (c === targetColor ? { ...c, [field]: value } : c));
    setColors(newColors);
  };

  const checkDuplicateColorCode = (index: number, code: string) => {
    if (!code.trim()) return;
    const sortedColors = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const duplicateIndex = sortedColors.findIndex(
      (c, i) => i !== index && c.code.toUpperCase() === code.toUpperCase()
    );
    if (duplicateIndex !== -1) {
      const duplicateColor = sortedColors[duplicateIndex];
      alert(`A sigla "${code.toUpperCase()}" já existe na linha ${duplicateIndex + 1} com a cor "${duplicateColor.name}"`);
    }
  };

  const moveColorUp = (displayIndex: number) => {
    if (displayIndex === 0) return;
    const sorted = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const current = sorted[displayIndex];
    const prev = sorted[displayIndex - 1];
    if (!current || !prev) return;
    const currentOrder = current.sort_order || 0;
    current.sort_order = prev.sort_order || 0;
    prev.sort_order = currentOrder;
    setColors([...colors]);
  };

  const moveColorDown = (displayIndex: number) => {
    const sorted = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (displayIndex >= sorted.length - 1) return;
    const current = sorted[displayIndex];
    const next = sorted[displayIndex + 1];
    if (!current || !next) return;
    const currentOrder = current.sort_order || 0;
    current.sort_order = next.sort_order || 0;
    next.sort_order = currentOrder;
    setColors([...colors]);
  };

  const handleColorDragStart = (index: number) => setColorDragIndex(index);

  const handleColorDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (colorDragIndex === null || colorDragIndex === targetIndex) return;

    const sorted = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const draggedColor = sorted[colorDragIndex];
    const targetColor = sorted[targetIndex];
    if (!draggedColor || !targetColor) return;

    const tempOrder = draggedColor.sort_order;
    draggedColor.sort_order = targetColor.sort_order;
    targetColor.sort_order = tempOrder;

    setColors([...colors]);
    setColorDragIndex(targetIndex);
  };

  const handleColorDragEnd = () => setColorDragIndex(null);

  const handleColorImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Apenas imagens são aceitas");
      return;
    }

    setUploadingColorImage(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", "color_image");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });

      if (response.ok) {
        const data = await response.json();
        updateColor(index, "image_url", data.url);
      } else {
        alert("Erro ao fazer upload da imagem");
      }
    } catch (error) {
      console.error("Failed to upload color image:", error);
      alert("Erro ao fazer upload da imagem");
    } finally {
      setUploadingColorImage(null);
    }
  };

  const addSize = () => {
    const maxOrder = sizes.reduce((max, s) => Math.max(max, s.sort_order || 0), 0);
    setSizes([...sizes, { name: "", code: "", sort_order: maxOrder + 1 }]);
  };

  const removeSize = (index: number) => {
    const newSizes = sizes.filter((_, i) => i !== index);
    setSizes(newSizes);

    if (sizes[index]?.id) {
      const newSelected = new Set(selectedSizes);
      newSelected.delete(sizes[index].id!);
      setSelectedSizes(newSelected);
    }
  };

  const updateSize = (index: number, field: "name" | "code" | "sort_order", value: string | number) => {
    const sortedSizes = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const targetSize = sortedSizes[index];

    const newSizes = sizes.map((s) => {
      if (s === targetSize) {
        if (field === "sort_order") return { ...s, [field]: Number(value) || 0 };
        return { ...s, [field]: value as string };
      }
      return s;
    });
    setSizes(newSizes);
  };

  const checkDuplicateSizeCode = (index: number, code: string) => {
    if (!code.trim()) return;
    const sortedSizes = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const duplicateIndex = sortedSizes.findIndex(
      (s, i) => i !== index && s.code.toUpperCase() === code.toUpperCase()
    );
    if (duplicateIndex !== -1) {
      const duplicateSize = sortedSizes[duplicateIndex];
      alert(`A sigla "${code.toUpperCase()}" já existe na linha ${duplicateIndex + 1} com o tamanho "${duplicateSize.name}"`);
    }
  };

  const moveSizeUp = (displayIndex: number) => {
    if (displayIndex === 0) return;

    const sorted = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const current = sorted[displayIndex];
    const prev = sorted[displayIndex - 1];
    if (!current || !prev) return;

    const currentOrder = current.sort_order;
    current.sort_order = prev.sort_order;
    prev.sort_order = currentOrder;

    const remapped = sorted.map((s) => ({ ...s }));
    remapped.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setSizes(remapped);
  };

  const moveSizeDown = (displayIndex: number) => {
    const sorted = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (displayIndex >= sorted.length - 1) return;

    const current = sorted[displayIndex];
    const next = sorted[displayIndex + 1];
    if (!current || !next) return;

    const currentOrder = current.sort_order;
    current.sort_order = next.sort_order;
    next.sort_order = currentOrder;

    const remapped = sorted.map((s) => ({ ...s }));
    remapped.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    setSizes(remapped);
  };

  const toggleColor = (colorId: number) => {
    const newSelected = new Set(selectedColors);
    if (newSelected.has(colorId)) newSelected.delete(colorId);
    else newSelected.add(colorId);
    setSelectedColors(newSelected);
  };

  const toggleSize = (sizeId: number) => {
    const newSelected = new Set(selectedSizes);
    if (newSelected.has(sizeId)) newSelected.delete(sizeId);
    else newSelected.add(sizeId);
    setSelectedSizes(newSelected);
  };

  const selectAllColors = () => {
    const validColors = colors.filter((c) => c.id && c.name && c.code);
    setSelectedColors(new Set(validColors.map((c) => c.id!)));
  };

  const clearAllColors = () => setSelectedColors(new Set());

  const selectAllSizes = () => {
    const validSizes = sizes.filter((s) => s.id && s.name && s.code);
    setSelectedSizes(new Set(validSizes.map((s) => s.id!)));
  };

  const clearAllSizes = () => setSelectedSizes(new Set());

  const formatCostBR = (cost: string): string => {
    if (!cost) return "";
    const num = parseFloat(cost);
    if (isNaN(num)) return cost;
    return num.toFixed(2).replace(".", ",");
  };

  const formatCnpj5Display = (cnpj5: string): string => {
    if (!cnpj5) return "__.___.***/0001-__";
    const padded = cnpj5.padEnd(5, "_");
    return `${padded.slice(0, 2)}.${padded.slice(2, 5)}.***/0001-__`;
  };

  const previewRows = useMemo((): PreviewRow[] => {
    const rows: PreviewRow[] = [];

    const selectedColorsList = colors.filter((c) => c.id && selectedColors.has(c.id));
    const selectedSizesList = [...sizes]
      .filter((s) => s.id && selectedSizes.has(s.id))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    for (const color of selectedColorsList) {
      for (const size of selectedSizesList) {
        let sku = formData.spu;
        if (formData.separadorSpu) sku += formData.separadorSpu;
        sku += color.code;
        if (formData.separadorTamanho) sku += formData.separadorTamanho;
        sku += size.code;

        const titulo = `${formData.tituloBase} ${color.name} ${size.name}`.trim();

        rows.push({
          spu: formData.spu,
          sku,
          titulo,
          cor: color.name,
          tamanho: size.name,
          custo: formatCostBR(formData.custoCompra),
          ncm: formData.ncm,
          cest: formData.cest,
          unidade: formData.unidade,
          origem: formData.origem,
        });
      }
    }

    return rows;
  }, [formData, colors, sizes, selectedColors, selectedSizes]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!formData.spu.trim()) errors.push("SPU é obrigatório");
    if (!formData.tituloBase.trim()) errors.push("Título base é obrigatório");
    if (!formData.custoCompra.trim()) errors.push("Custo de compra é obrigatório");
    if (!formData.cnpj5 || formData.cnpj5.length !== 5) errors.push("CNPJ (5 primeiros dígitos) é obrigatório");
    if (selectedColors.size === 0) errors.push("Selecione pelo menos 1 cor");
    if (selectedSizes.size === 0) errors.push("Selecione pelo menos 1 tamanho");

    const skus = new Set<string>();
    for (const row of previewRows) {
      if (skus.has(row.sku)) {
        errors.push(`SKU duplicado: ${row.sku}`);
        break;
      }
      skus.add(row.sku);
    }

    return errors;
  }, [formData, selectedColors, selectedSizes, previewRows]);

  useEffect(() => {
    setKitWarning(formData.unidade === "KIT");
  }, [formData.unidade]);

  const [generating, setGenerating] = useState(false);

  const addToBatch = () => {
    if (validationErrors.length > 0) {
      alert(`Corrija os erros antes de adicionar ao lote:\n${validationErrors.join("\n")}`);
      return;
    }

    const spuExists = batchItems.some((item) => item.formData.spu === formData.spu);
    if (spuExists) {
      if (!confirm(`O SPU "${formData.spu}" já existe no lote. Deseja adicionar mesmo assim?`)) return;
    }

    const newItem: BatchItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      formData: { ...formData },
      selectedColorIds: Array.from(selectedColors),
      selectedSizeIds: Array.from(selectedSizes),
      variationCount: previewRows.length,
    };

    setBatchItems([...batchItems, newItem]);
    setShowBatchPanel(true);

    setFormData({
      spu: "",
      separadorSpu: formData.separadorSpu,
      separadorTamanho: formData.separadorTamanho,
      tituloBase: "",
      usarApelidoNfe: formData.usarApelidoNfe,
      custoCompra: "",
      ncm: formData.ncm,
      cest: formData.cest,
      unidade: formData.unidade,
      origem: formData.origem,
      linkFornecedor: "",
      precoVarejo: "",
      peso: "",
      comprimento: "",
      largura: "",
      altura: "",
      prefixoEan: formData.prefixoEan,
      cnpj5: formData.cnpj5,
    });
  };

  const removeBatchItem = (id: string) => setBatchItems(batchItems.filter((item) => item.id !== id));

  const editBatchItem = (id: string) => {
    const item = batchItems.find((i) => i.id === id);
    if (!item) return;

    setFormData(item.formData);
    setSelectedColors(new Set(item.selectedColorIds));
    setSelectedSizes(new Set(item.selectedSizeIds));

    setBatchItems(batchItems.filter((i) => i.id !== id));
  };

  const duplicateBatchItem = (id: string) => {
    const item = batchItems.find((i) => i.id === id);
    if (!item) return;

    const newItem: BatchItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      formData: { ...item.formData, spu: item.formData.spu + "_COPIA" },
      selectedColorIds: [...item.selectedColorIds],
      selectedSizeIds: [...item.selectedSizeIds],
      variationCount: item.variationCount,
    };

    setBatchItems([...batchItems, newItem]);
  };

  const clearBatch = () => {
    if (!confirm("Limpar todo o lote? Esta ação não pode ser desfeita.")) return;
    setBatchItems([]);
  };

  const totalBatchVariations = useMemo(() => {
    return batchItems.reduce((sum, item) => sum + item.variationCount, 0);
  }, [batchItems]);

  const generateXLSX = async () => {
    if (batchItems.length === 0 && validationErrors.length > 0) {
      alert(`Corrija os erros antes de gerar:\n${validationErrors.join("\n")}`);
      return;
    }

    setGenerating(true);

    try {
      const itemsToExport =
        batchItems.length > 0
          ? batchItems
          : [
              {
                id: "current",
                timestamp: Date.now(),
                formData,
                selectedColorIds: Array.from(selectedColors),
                selectedSizeIds: Array.from(selectedSizes),
                variationCount: previewRows.length,
              },
            ];

      const sheetName = "Import_Variants_Template_BR01";

      // prioridade: template do usuário -> template do sistema (admin) -> headers padrão
      const activeTemplateUrl = templateUrl || systemTemplateUrl;

      const columnMap = {
        spu: 1,
        sku: 2,
        titulo: 3,
        apelido: 4,
        usarApelido: 5,
        var1: 6,
        valVar1: 7,
        var2: 8,
        valVar2: 9,
        precoVarejo: 16,
        custo: 17,
        barcode: 20,
        peso: 23,
        comprimento: 24,
        largura: 25,
        altura: 26,
        ncm: 27,
        cest: 28,
        unidade: 29,
        origem: 30,
        linkFornecedor: 31,
      } as const;

      const workbook = new ExcelJS.Workbook();
      let worksheet: ExcelJS.Worksheet;

      if (activeTemplateUrl) {
        const response = await fetch(activeTemplateUrl);
        if (!response.ok) throw new Error("Falha ao baixar template XLSX");

        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        // tenta pegar pelo nome do sheet, senão cai na primeira
        worksheet = workbook.getWorksheet(sheetName) || workbook.worksheets[0];
        if (!worksheet) throw new Error("Template XLSX sem planilha");

        // (opcional porém recomendado) força a linha 1 como texto simples + wrap
        const headerRow = worksheet.getRow(1);
        TEMPLATE_HEADERS.forEach((h, idx) => {
          const cell = headerRow.getCell(idx + 1);
          const headerText = h.helper ? `${h.label}\n(${h.helper})` : h.label;
          cell.value = headerText;
          cell.alignment = { wrapText: true, vertical: "top" };
          cell.font = { bold: true, size: 10 };
        });
        headerRow.height = 40;

        // limpa tudo abaixo do header
        const rowCount = worksheet.rowCount;
        if (rowCount > 1) worksheet.spliceRows(2, rowCount - 1);
      } else {
        worksheet = workbook.addWorksheet(sheetName);

        const headerRow = worksheet.getRow(1);
        TEMPLATE_HEADERS.forEach((h, idx) => {
          const cell = headerRow.getCell(idx + 1);
          cell.value = h.helper ? `${h.label}\n(${h.helper})` : h.label;
          cell.alignment = { wrapText: true, vertical: "top" };
          cell.font = { bold: true, size: 10 };
        });
        headerRow.height = 40;
      }

      let currentRow = 2;

      for (const item of itemsToExport) {
        const itemData = item.formData;

        const itemColorsList = colors
          .filter((c) => c.id && item.selectedColorIds.includes(c.id))
          .filter((c) => c.name && c.code);

        const itemSizesList = [...sizes]
          .filter((s) => s.id && item.selectedSizeIds.includes(s.id))
          .filter((s) => s.name && s.code)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const variationCount = itemColorsList.length * itemSizesList.length;

        // Generate GTINs using new API
        const skus: string[] = [];
        const productNames: string[] = [];

        for (const color of itemColorsList) {
          for (const size of itemSizesList) {
            let sku = itemData.spu;
            if (itemData.separadorSpu) sku += itemData.separadorSpu;
            sku += color.code;
            if (itemData.separadorTamanho) sku += itemData.separadorTamanho;
            sku += size.code;

            const productName = `${itemData.tituloBase} ${color.name} ${size.name}`.trim();
            skus.push(sku);
            productNames.push(productName);
          }
        }

        let gtins: string[] = [];

        if (itemData.cnpj5 && itemData.cnpj5.length === 5) {
          try {
            const gtinResponse = await fetch("/api/gtin/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cnpj5: itemData.cnpj5,
                count: variationCount,
                spu: itemData.spu,
                skus,
                productNames,
              }),
            });

            if (gtinResponse.ok) {
              const gtinData = await gtinResponse.json();
              gtins = (gtinData.items || []).map((it: any) => it.gtin);
            } else {
              const error = await gtinResponse.json();
              throw new Error(error.error || "Erro ao gerar GTINs");
            }
          } catch (error: any) {
            console.error("Failed to generate GTINs:", error);
            alert(`Erro ao gerar códigos de barras: ${error.message}`);
            setGenerating(false);
            return;
          }
        }

        let gtinIndex = 0;

        for (const color of itemColorsList) {
          for (const size of itemSizesList) {
            let sku = itemData.spu;
            if (itemData.separadorSpu) sku += itemData.separadorSpu;
            sku += color.code;
            if (itemData.separadorTamanho) sku += itemData.separadorTamanho;
            sku += size.code;

            const titulo = `${itemData.tituloBase} ${color.name} ${size.name}`.trim();

            const row = worksheet.getRow(currentRow);

            row.getCell(columnMap.spu).value = itemData.spu;
            row.getCell(columnMap.sku).value = sku;
            row.getCell(columnMap.titulo).value = titulo;
            row.getCell(columnMap.apelido).value = titulo;
            row.getCell(columnMap.usarApelido).value = itemData.usarApelidoNfe ? "Y" : "N";
            row.getCell(columnMap.var1).value = "Cor";
            row.getCell(columnMap.valVar1).value = color.name;
            row.getCell(columnMap.var2).value = "Tamanho";
            row.getCell(columnMap.valVar2).value = size.name;

            if (itemData.precoVarejo) {
              row.getCell(columnMap.precoVarejo).value = formatCostBR(itemData.precoVarejo);
            }
            row.getCell(columnMap.custo).value = formatCostBR(itemData.custoCompra);

            if (gtins[gtinIndex]) {
              row.getCell(columnMap.barcode).value = gtins[gtinIndex];
            }

            if (itemData.peso) row.getCell(columnMap.peso).value = itemData.peso;
            if (itemData.comprimento) row.getCell(columnMap.comprimento).value = itemData.comprimento;
            if (itemData.largura) row.getCell(columnMap.largura).value = itemData.largura;
            if (itemData.altura) row.getCell(columnMap.altura).value = itemData.altura;

            row.getCell(columnMap.ncm).value = itemData.ncm;
            row.getCell(columnMap.cest).value = itemData.cest;
            row.getCell(columnMap.unidade).value = itemData.unidade;
            row.getCell(columnMap.origem).value = itemData.origem;
            row.getCell(columnMap.linkFornecedor).value = itemData.linkFornecedor;

            currentRow++;
            gtinIndex++;
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const fileName =
        batchItems.length > 0
          ? `Lote_${batchItems.length}SPUs_${new Date().toISOString().slice(0, 10)}.xlsx`
          : `Variacao_${formData.spu}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);

      if (batchItems.length > 0) {
        setBatchItems([]);
        setShowBatchPanel(false);
      }

      if (activeTab === "gtin") fetchGtinHistory();
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

  const filteredColors = colors.filter((c) => {
    if (!colorSearch) return true;
    return c.name.toLowerCase().includes(colorSearch.toLowerCase()) || c.code.toLowerCase().includes(colorSearch.toLowerCase());
  });

  const filteredSizes = sortedSizes.filter((s) => {
    if (!sizeSearch) return true;
    return s.name.toLowerCase().includes(sizeSearch.toLowerCase()) || s.code.toLowerCase().includes(sizeSearch.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Criar Variação (UpSeller)</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gere planilhas XLSX compatíveis com importação do UpSeller</p>
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
              <button
                onClick={() => setActiveTab("gtin")}
                className={`flex items-center gap-2 px-4 h-9 text-xs font-medium rounded-lg transition ${
                  activeTab === "gtin"
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Barcode className="w-3.5 h-3.5" />
                GTIN/EAN
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "gtin" ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Barcode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Histórico de GTIN/EAN</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Controle de códigos de barras gerados para garantir unicidade</p>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por SKU, GTIN, SPU ou Produto..."
                  value={gtinSearch}
                  onChange={(e) => {
                    setGtinSearch(e.target.value);
                    setGtinPage(1);
                  }}
                  className="w-full h-11 pl-10 pr-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>

            {/* Table */}
            {gtinLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
              </div>
            ) : gtinHistory.length === 0 ? (
              <div className="text-center py-12">
                <Barcode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">{gtinSearch ? "Nenhum resultado encontrado" : "Nenhum GTIN gerado ainda"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Data/Hora</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">SPU</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">SKU</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Produto</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">GTIN/EAN</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {gtinHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {new Date(item.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-mono font-medium">{item.spu}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-mono">{item.sku}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{item.product_name}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-mono font-semibold">{item.gtin}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                            {item.status === "active" ? "Ativo" : item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {gtinTotalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Página {gtinPage} de {gtinTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGtinPage(Math.max(1, gtinPage - 1))}
                    disabled={gtinPage === 1}
                    className="flex items-center gap-1 px-3 h-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setGtinPage(Math.min(gtinTotalPages, gtinPage + 1))}
                    disabled={gtinPage === gtinTotalPages}
                    className="flex items-center gap-1 px-3 h-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "config" ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Template Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Template UpSeller</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Faça upload do template original do UpSeller para usar os headers exatos
                  </p>
                </div>
              </div>

              {templateUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Seu template personalizado</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Os headers do seu template serão usados na geração</p>
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
                      {restoringTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
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
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Usando template do sistema</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">O template padrão configurado pelo administrador será usado</p>
                      </div>
                    </div>
                  </div>

                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer transition">
                    {uploadingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingTemplate ? "Enviando..." : "Usar Meu Próprio Template"}
                    <input type="file" accept=".xlsx,.xls" onChange={handleTemplateUpload} className="hidden" disabled={uploadingTemplate} />
                  </label>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Arraste o template XLSX do UpSeller ou clique para selecionar</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">Isso garante que os headers fiquem idênticos ao formato aceito</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer transition">
                    {uploadingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingTemplate ? "Enviando..." : "Selecionar Arquivo"}
                    <input type="file" accept=".xlsx,.xls" onChange={handleTemplateUpload} className="hidden" disabled={uploadingTemplate} />
                  </label>
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Cores</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nome da cor (usado no título) e sigla (usada no SKU)</p>
                  </div>
                </div>
                <button onClick={addColor} className="flex items-center gap-2 px-3 h-9 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {colors.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhuma cor cadastrada</p>
                ) : (
                  [...colors]
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map((color, displayIndex) => (
                      <div
                        key={displayIndex}
                        draggable
                        onDragStart={() => handleColorDragStart(displayIndex)}
                        onDragOver={(e) => handleColorDragOver(e, displayIndex)}
                        onDragEnd={handleColorDragEnd}
                        className={`flex items-center gap-2 p-2 rounded-lg transition ${
                          colorDragIndex === displayIndex
                            ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-600"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        }`}
                      >
                        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveColorUp(displayIndex)}
                            disabled={displayIndex === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveColorDown(displayIndex)}
                            disabled={displayIndex === colors.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-500 dark:text-gray-400">
                          {displayIndex + 1}
                        </div>

                        <div className="relative">
                          {color.image_url ? (
                            <div className="relative group">
                              <img
                                src={color.image_url}
                                alt={color.name}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                              />
                              <button
                                onClick={() => updateColor(displayIndex, "image_url", null)}
                                className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                              {uploadingColorImage === displayIndex ? (
                                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                              ) : (
                                <Image className="w-4 h-4 text-gray-400" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleColorImageUpload(displayIndex, file);
                                  e.target.value = "";
                                }}
                                disabled={uploadingColorImage !== null}
                              />
                            </label>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Nome (ex: Vermelho)"
                          value={color.name}
                          onChange={(e) => updateColor(displayIndex, "name", e.target.value)}
                          className="flex-1 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                        />

                        <input
                          type="text"
                          placeholder="Sigla SKU (ex: VM)"
                          value={color.code}
                          onChange={(e) => updateColor(displayIndex, "code", e.target.value.toUpperCase())}
                          onBlur={(e) => checkDuplicateColorCode(displayIndex, e.target.value)}
                          className="w-28 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white uppercase"
                        />

                        <button onClick={() => removeColor(displayIndex)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Sizes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Tamanhos</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Nome (P, M, G - usado no título e coluna Tam) • Sigla numérica (02, 04 - usada apenas no SKU)
                    </p>
                  </div>
                </div>
                <button onClick={addSize} className="flex items-center gap-2 px-3 h-9 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <strong>Exemplo:</strong> Nome: "P" → aparece no título e coluna Tam • Sigla: "02" → aparece apenas no SKU (223-GB-
                  <strong>02</strong>)
                </p>
              </div>

              <div className="space-y-3">
                {sortedSizes.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum tamanho cadastrado</p>
                ) : (
                  sortedSizes.map((size, displayIndex) => {
                    const originalIndex = sizes.findIndex((s) => s === size);
                    return (
                      <div key={originalIndex} className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveSizeUp(displayIndex)}
                            disabled={displayIndex === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveSizeDown(displayIndex)}
                            disabled={displayIndex === sortedSizes.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-500 dark:text-gray-400">
                          {displayIndex + 1}
                        </div>

                        <input
                          type="text"
                          placeholder="Nome (ex: P, M, G)"
                          value={size.name}
                          onChange={(e) => updateSize(displayIndex, "name", e.target.value)}
                          className="flex-1 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                        />

                        <input
                          type="text"
                          placeholder="Sigla SKU (ex: 02)"
                          value={size.code}
                          onChange={(e) => updateSize(displayIndex, "code", e.target.value.toUpperCase())}
                          onBlur={(e) => checkDuplicateSizeCode(displayIndex, e.target.value)}
                          className="w-28 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white uppercase"
                        />

                        <button onClick={() => removeSize(originalIndex)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveConfig}
                disabled={saving}
                className={`flex items-center gap-2 px-6 h-11 rounded-xl text-sm font-medium transition ${
                  saved
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
                } disabled:opacity-50`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? "Salvo!" : "Salvar Configuração"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // ===== ABA GERAR (abaixo é seu layout original, sem alteração funcional além do template) =====
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Form (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Identificação */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Identificação</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Informações básicas do produto</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">SPU *</label>
                    <input
                      type="text"
                      value={formData.spu}
                      onChange={(e) => setFormData({ ...formData, spu: e.target.value })}
                      placeholder="Ex: 223"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Separador SPU</label>
                      <input
                        type="text"
                        value={formData.separadorSpu}
                        onChange={(e) => setFormData({ ...formData, separadorSpu: e.target.value })}
                        placeholder="Ex: -"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Separador Tamanho</label>
                      <input
                        type="text"
                        value={formData.separadorTamanho}
                        onChange={(e) => setFormData({ ...formData, separadorTamanho: e.target.value })}
                        placeholder="Ex: -"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Título Base *</label>
                    <input
                      type="text"
                      value={formData.tituloBase}
                      onChange={(e) => setFormData({ ...formData, tituloBase: e.target.value })}
                      placeholder="Exemplo: Camisa Básica Masculina"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.usarApelidoNfe}
                      onChange={(e) => setFormData({ ...formData, usarApelidoNfe: e.target.checked })}
                      className="w-4 h-4 text-blue-500 rounded focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Usar apelido como título da NFe</span>
                  </label>
                </div>
              </div>

              {/* Step 2: Seleção de Variantes */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Seleção de Variantes</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Escolha cores e tamanhos</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Colors */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Cores ({selectedColors.size} selecionadas)
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={selectAllColors} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          Todos
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button onClick={clearAllColors} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
                          Limpar
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button onClick={() => setActiveTab("config")} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
                          Gerenciar
                        </button>
                      </div>
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar cor..."
                        value={colorSearch}
                        onChange={(e) => setColorSearch(e.target.value)}
                        className="w-full h-9 pl-10 pr-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>

                    {filteredColors.filter((c) => c.id && c.name && c.code).length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                        {colorSearch ? "Nenhuma cor encontrada" : "Configure cores na aba Configuração"}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {filteredColors
                          .filter((c) => c.id && c.name && c.code)
                          .map((color) => (
                            <button
                              key={color.id}
                              onClick={() => toggleColor(color.id!)}
                              className={`group relative px-3 h-9 rounded-lg text-xs font-medium transition ${
                                selectedColors.has(color.id!)
                                  ? "bg-blue-500 text-white shadow-sm"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                              }`}
                            >
                              {selectedColors.has(color.id!) && (
                                <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 bg-white dark:bg-gray-800 rounded-full" />
                              )}
                              {color.name} ({color.code})
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Sizes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Tamanhos ({selectedSizes.size} selecionados)
                      </label>
                      <div className="flex items-center gap-2">
                        <button onClick={selectAllSizes} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          Todos
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button onClick={clearAllSizes} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
                          Limpar
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <button onClick={() => setActiveTab("config")} className="text-xs text-gray-600 dark:text-gray-400 hover:underline">
                          Gerenciar
                        </button>
                      </div>
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar tamanho..."
                        value={sizeSearch}
                        onChange={(e) => setSizeSearch(e.target.value)}
                        className="w-full h-9 pl-10 pr-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>

                    {filteredSizes.filter((s) => s.id && s.name && s.code).length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                        {sizeSearch ? "Nenhum tamanho encontrado" : "Configure tamanhos na aba Configuração"}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {filteredSizes
                          .filter((s) => s.id && s.name && s.code)
                          .map((size) => (
                            <button
                              key={size.id}
                              onClick={() => toggleSize(size.id!)}
                              className={`group relative px-3 h-9 rounded-lg text-xs font-medium transition ${
                                selectedSizes.has(size.id!)
                                  ? "bg-green-500 text-white shadow-sm"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                              }`}
                            >
                              {selectedSizes.has(size.id!) && (
                                <CheckCircle2 className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 bg-white dark:bg-gray-800 rounded-full" />
                              )}
                              {size.name} ({size.code})
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Logística e Fiscais */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-semibold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Logística e Fiscais</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dados complementares do produto</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Custo de Compra *</label>
                    <input
                      type="text"
                      value={formData.custoCompra}
                      onChange={(e) => {
                        const value = e.target.value.replace(",", ".");
                        setFormData({ ...formData, custoCompra: value });
                      }}
                      placeholder="Ex: 14.50 ou 14,50"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No XLSX será exportado com vírgula (ex: 14,50)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preço de Varejo</label>
                    <input
                      type="text"
                      value={formData.precoVarejo}
                      onChange={(e) => {
                        const value = e.target.value.replace(",", ".");
                        setFormData({ ...formData, precoVarejo: value });
                      }}
                      placeholder="Ex: 29.90"
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Peso (g)</label>
                      <input
                        type="text"
                        value={formData.peso}
                        onChange={(e) => setFormData({ ...formData, peso: e.target.value.replace(/\D/g, "") })}
                        placeholder="500"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Comp. (cm)</label>
                      <input
                        type="text"
                        value={formData.comprimento}
                        onChange={(e) => setFormData({ ...formData, comprimento: e.target.value.replace(/\D/g, "") })}
                        placeholder="30"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Larg. (cm)</label>
                      <input
                        type="text"
                        value={formData.largura}
                        onChange={(e) => setFormData({ ...formData, largura: e.target.value.replace(/\D/g, "") })}
                        placeholder="20"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alt. (cm)</label>
                      <input
                        type="text"
                        value={formData.altura}
                        onChange={(e) => setFormData({ ...formData, altura: e.target.value.replace(/\D/g, "") })}
                        placeholder="10"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Prefixo EAN</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={formData.prefixoEan}
                        readOnly
                        disabled
                        className="w-full h-11 px-3 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prefixo fixo para EAN-13</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">CNPJ (5 primeiros dígitos) *</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.cnpj5}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                          setFormData({ ...formData, cnpj5: value });
                        }}
                        placeholder="12345"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Formato: {formatCnpj5Display(formData.cnpj5)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">NCM (8 dígitos)</label>
                      <input
                        type="text"
                        maxLength={8}
                        value={formData.ncm}
                        onChange={(e) => setFormData({ ...formData, ncm: e.target.value.replace(/\D/g, "") })}
                        placeholder="Ex: 61042200"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">CEST (7 dígitos)</label>
                      <input
                        type="text"
                        maxLength={7}
                        value={formData.cest}
                        onChange={(e) => setFormData({ ...formData, cest: e.target.value.replace(/\D/g, "") })}
                        placeholder="Ex: 2800100"
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Unidade</label>
                      <select
                        value={formData.unidade}
                        onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      >
                        <option value="UN">UN</option>
                        <option value="KG">KG</option>
                        <option value="Par">Par</option>
                        <option value="KIT">KIT</option>
                      </select>
                      {kitWarning && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          KIT pode não ser aceito pelo UpSeller
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Origem *</label>
                      <select
                        value={formData.origem}
                        onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                        className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                      >
                        {ORIGENS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Link do Fornecedor</label>
                    <input
                      type="url"
                      value={formData.linkFornecedor}
                      onChange={(e) => setFormData({ ...formData, linkFornecedor: e.target.value })}
                      placeholder="https://..."
                      className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Preview (Collapsible) */}
              {previewRows.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Package className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Prévia de Geração ({previewRows.length} variações)</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Visualize as variações que serão geradas</p>
                      </div>
                    </div>
                    {showPreview ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>

                  {showPreview && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">SKU</th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Título</th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Cor</th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Tam</th>
                              <th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">Custo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {previewRows.slice(0, 5).map((row, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="px-4 py-2.5 text-gray-900 dark:text-white font-mono">{row.sku}</td>
                                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.titulo}</td>
                                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.cor}</td>
                                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.tamanho}</td>
                                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.custo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {previewRows.length > 5 && (
                          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/30 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                            ... e mais {previewRows.length - 5} variações
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Sticky Summary (1/3 width) */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                {/* Summary Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Resumo do SPU</h3>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">SPU</span>
                      <span className="font-mono font-medium text-gray-900 dark:text-white">{formData.spu || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Variações</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{previewRows.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Custo</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formData.custoCompra ? `R$ ${formatCostBR(formData.custoCompra)}` : "-"}
                      </span>
                    </div>
                    {formData.precoVarejo && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">Varejo</span>
                        <span className="font-medium text-gray-900 dark:text-white">R$ {formatCostBR(formData.precoVarejo)}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</span>
                      {validationErrors.length === 0 ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pronto
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Pendente
                        </span>
                      )}
                    </div>

                    {validationErrors.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        {validationErrors.map((error, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                            <X className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
                  <button
                    onClick={addToBatch}
                    disabled={validationErrors.length > 0}
                    className="w-full flex items-center justify-center gap-2 h-11 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar ao Lote
                  </button>

                  {batchItems.length > 0 && (
                    <button
                      onClick={() => setShowBatchPanel(!showBatchPanel)}
                      className="w-full flex items-center justify-center gap-2 h-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition text-xs"
                    >
                      {showBatchPanel ? "Ocultar" : "Mostrar"} Lote ({totalBatchVariations})
                    </button>
                  )}
                </div>

                {/* Batch Card */}
                {batchItems.length > 0 && (
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">Lote de Exportação</h3>
                      <Package className="w-5 h-5 opacity-80" />
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="opacity-90">SPUs no lote</span>
                        <span className="font-bold text-lg">{batchItems.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="opacity-90">Total variações</span>
                        <span className="font-bold text-lg">{totalBatchVariations}</span>
                      </div>
                    </div>

                    <button
                      onClick={generateXLSX}
                      disabled={generating}
                      className="w-full flex items-center justify-center gap-2 h-11 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-xl transition disabled:opacity-50 text-sm border border-white/20"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {generating ? "Gerando..." : "Exportar XLSX"}
                    </button>

                    {(templateUrl || systemTemplateUrl) && (
                      <div className="flex items-center gap-2 text-xs opacity-80 justify-center mt-3">
                        <FileCheck className="w-3 h-3" />
                        {templateUrl ? "Template personalizado" : "Template do sistema"}
                      </div>
                    )}
                  </div>
                )}

                {/* Single Export (when no batch) */}
                {batchItems.length === 0 && previewRows.length > 0 && (
                  <button
                    onClick={generateXLSX}
                    disabled={validationErrors.length > 0 || generating}
                    className="w-full flex items-center justify-center gap-2 h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl transition disabled:opacity-50 text-sm shadow-sm"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {generating ? "Gerando..." : `Gerar XLSX (${previewRows.length})`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Batch Panel (Full Width Below) */}
          {showBatchPanel && batchItems.length > 0 && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                    Lote de Exportação ({batchItems.length} SPUs, {totalBatchVariations} variações)
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Gerencie os produtos que serão exportados juntos</p>
                </div>
                <button
                  onClick={clearBatch}
                  className="flex items-center gap-2 px-3 h-9 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-xs font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Lote
                </button>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {batchItems.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.formData.spu}</span>
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                            {item.variationCount} variações
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{item.formData.tituloBase}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => duplicateBatchItem(item.id)}
                          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                          title="Duplicar"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => editBatchItem(item.id)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                          title="Editar"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeBatchItem(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
