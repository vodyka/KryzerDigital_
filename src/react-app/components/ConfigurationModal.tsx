import { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Loader2, Check, Palette, Ruler, ArrowUp, ArrowDown, GripVertical, Image, Barcode } from "lucide-react";

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

interface EanConfig {
  prefix_ean: string;
  cnpj_5: string;
}

interface ConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigurationModal({ isOpen, onClose }: ConfigurationModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [colors, setColors] = useState<Color[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [uploadingColorImage, setUploadingColorImage] = useState<number | null>(null);
  const [eanConfig, setEanConfig] = useState<EanConfig>({ prefix_ean: "789", cnpj_5: "" });

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/variation-config");
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
        
        if (data.ean_config) {
          setEanConfig({
            prefix_ean: data.ean_config.prefix_ean || "789",
            cnpj_5: data.ean_config.cnpj_5 || "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    // Validate colors for duplicates
    const sortedColors = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    // Check for duplicate color names
    for (let i = 0; i < sortedColors.length; i++) {
      const currentName = sortedColors[i].name.trim().toLowerCase();
      if (!currentName) continue;
      
      for (let j = i + 1; j < sortedColors.length; j++) {
        const otherName = sortedColors[j].name.trim().toLowerCase();
        if (currentName === otherName) {
          alert(`O nome "${sortedColors[i].name}" está duplicado nas linhas ${i + 1} e ${j + 1}`);
          return;
        }
      }
    }
    
    // Check for duplicate color codes
    for (let i = 0; i < sortedColors.length; i++) {
      const currentCode = sortedColors[i].code.trim().toUpperCase();
      if (!currentCode) continue;
      
      for (let j = i + 1; j < sortedColors.length; j++) {
        const otherCode = sortedColors[j].code.trim().toUpperCase();
        if (currentCode === otherCode) {
          alert(`A sigla "${currentCode}" já existe na linha ${i + 1} com a cor "${sortedColors[i].name}" e também na linha ${j + 1} com a cor "${sortedColors[j].name}"`);
          return;
        }
      }
    }
    
    // Validate sizes for duplicates
    const sortedSizes = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    // Check for duplicate size names
    for (let i = 0; i < sortedSizes.length; i++) {
      const currentName = sortedSizes[i].name.trim().toLowerCase();
      if (!currentName) continue;
      
      for (let j = i + 1; j < sortedSizes.length; j++) {
        const otherName = sortedSizes[j].name.trim().toLowerCase();
        if (currentName === otherName) {
          alert(`O nome "${sortedSizes[i].name}" está duplicado nas linhas ${i + 1} e ${j + 1}`);
          return;
        }
      }
    }
    
    // Check for duplicate size codes
    for (let i = 0; i < sortedSizes.length; i++) {
      const currentCode = sortedSizes[i].code.trim().toUpperCase();
      if (!currentCode) continue;
      
      for (let j = i + 1; j < sortedSizes.length; j++) {
        const otherCode = sortedSizes[j].code.trim().toUpperCase();
        if (currentCode === otherCode) {
          alert(`A sigla "${currentCode}" já existe na linha ${i + 1} com o tamanho "${sortedSizes[i].name}" e também na linha ${j + 1} com o tamanho "${sortedSizes[j].name}"`);
          return;
        }
      }
    }
    
    setSaving(true);
    try {
      const response = await fetch("/api/variation-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colors, sizes, ean_config: eanConfig }),
      });

      if (response.ok) {
        const data = await response.json();
        const savedColors = (data.colors || []).sort(
          (a: Color, b: Color) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setColors(savedColors);

        const savedSizes = (data.sizes || []).sort(
          (a: Size, b: Size) => (a.sort_order || 0) - (b.sort_order || 0)
        );
        setSizes(savedSizes);

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Erro ao salvar configuração");
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const addColor = () => {
    const maxOrder = colors.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
    setColors([...colors, { name: "", code: "", sort_order: maxOrder + 1 }]);
  };

  const removeColor = (index: number) => {
    const sortedColors = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const colorToRemove = sortedColors[index];
    const newColors = colors.filter((c) => c !== colorToRemove);
    setColors(newColors);
  };

  const updateColor = (index: number, field: "name" | "code" | "image_url", value: string | null) => {
    const sortedColors = [...colors].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const targetColor = sortedColors[index];
    const newColors = colors.map((c) => (c === targetColor ? { ...c, [field]: value } : c));
    setColors(newColors);
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

  const moveSizeUp = (displayIndex: number) => {
    if (displayIndex === 0) return;
    const sorted = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const current = sorted[displayIndex];
    const prev = sorted[displayIndex - 1];
    if (!current || !prev) return;
    const currentOrder = current.sort_order;
    current.sort_order = prev.sort_order;
    prev.sort_order = currentOrder;
    setSizes([...sizes]);
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
    setSizes([...sizes]);
  };

  if (!isOpen) return null;

  const sortedSizes = [...sizes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configuração de Variações</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-blue-500 dark:text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Colors */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Cores</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nome da cor (título) e sigla (SKU)</p>
                  </div>
                </div>
                <button
                  onClick={addColor}
                  className="flex items-center gap-2 px-3 h-9 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                >
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
                      <div key={displayIndex} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="cursor-grab active:cursor-grabbing text-gray-400">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveColorUp(displayIndex)}
                            disabled={displayIndex === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => moveColorDown(displayIndex)}
                            disabled={displayIndex === colors.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-500">
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
                                className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
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
                          className="flex-1 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                        />

                        <input
                          type="text"
                          placeholder="Sigla (ex: VM)"
                          value={color.code}
                          onChange={(e) => updateColor(displayIndex, "code", e.target.value.toUpperCase())}
                          className="w-28 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm uppercase"
                        />

                        <button
                          onClick={() => removeColor(displayIndex)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* EAN/GTIN Configuration */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Barcode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">EAN/GTIN</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configuração para geração automática de códigos de barras</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Prefixo EAN</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={eanConfig.prefix_ean}
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
                    value={eanConfig.cnpj_5}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                      setEanConfig({ ...eanConfig, cnpj_5: value });
                    }}
                    placeholder="12345"
                    className="w-full h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Formato: {eanConfig.cnpj_5 ? `${eanConfig.cnpj_5.slice(0, 2)}.${eanConfig.cnpj_5.slice(2, 5)}` : "00.000"}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Como funciona:</strong> Os códigos EAN-13 serão gerados automaticamente no formato: 
                  <code className="ml-1 px-1 bg-blue-100 dark:bg-blue-900/40 rounded">789 + 5 dígitos CNPJ + 4 dígitos sequenciais + dígito verificador</code>
                </p>
              </div>
            </div>

            {/* Sizes */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <Ruler className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Tamanhos</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nome (título) e sigla numérica (SKU)</p>
                  </div>
                </div>
                <button
                  onClick={addSize}
                  className="flex items-center gap-2 px-3 h-9 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {sortedSizes.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum tamanho cadastrado</p>
                ) : (
                  sortedSizes.map((size, displayIndex) => (
                    <div key={displayIndex} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSizeUp(displayIndex)}
                          disabled={displayIndex === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveSizeDown(displayIndex)}
                          disabled={displayIndex === sortedSizes.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-500">
                        {displayIndex + 1}
                      </div>

                      <input
                        type="text"
                        placeholder="Nome (ex: P, M, G)"
                        value={size.name}
                        onChange={(e) => updateSize(displayIndex, "name", e.target.value)}
                        className="flex-1 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                      />

                      <input
                        type="text"
                        placeholder="Sigla (ex: 02)"
                        value={size.code}
                        onChange={(e) => updateSize(displayIndex, "code", e.target.value.toUpperCase())}
                        className="w-28 h-11 px-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm uppercase"
                      />

                      <button
                        onClick={() => removeSize(sizes.findIndex((s) => s === size))}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            disabled={saving}
          >
            Fechar
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className={`flex items-center gap-2 px-6 h-11 rounded-lg text-sm font-medium transition ${
              saved
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            } disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
