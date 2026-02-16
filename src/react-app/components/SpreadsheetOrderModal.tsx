import { useState } from "react";
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Users } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import MultiSupplierOrderModal from "@/react-app/components/MultiSupplierOrderModal";
import * as XLSX from "xlsx";

interface SpreadsheetOrderModalProps {
  onClose: () => void;
  onOrderCreated: () => void;
}

export default function SpreadsheetOrderModal({ onClose, onOrderCreated }: SpreadsheetOrderModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isMultiSupplier, setIsMultiSupplier] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [applyRounding, setApplyRounding] = useState(false);
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [showMultiSupplierModal, setShowMultiSupplierModal] = useState(false);
  const [stockPeriod, setStockPeriod] = useState<"7D" | "15D" | "30D" | null>(null);
  const [useColumnH, setUseColumnH] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError("Por favor, selecione um arquivo XLSX válido");
      return;
    }

    if (!stockPeriod) {
      setError("Por favor, selecione o período de estoque (7D, 15D ou 30D)");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isMultiSupplier) {
        // Parse file locally and show multi-supplier modal
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

        if (!data || data.length < 2) {
          setError("Planilha vazia ou sem dados");
          setUploading(false);
          return;
        }

        // Parse items from spreadsheet
        const items = [];
        const notFoundSkus: string[] = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length < 7) continue;

          const sku = String(row[0] || "").trim();
          const quantityColumnIndex = useColumnH ? 7 : 6; // Column H (index 7) or G (index 6)
          const rawQuantity = parseInt(String(row[quantityColumnIndex] || "0"));

          if (!sku || rawQuantity <= 0) continue;

          const quantity = applyRounding ? roundToMultipleOf10(rawQuantity) : rawQuantity;

          // Look up product by SKU
          const productResponse = await fetch(`/api/products?sku=${encodeURIComponent(sku)}`);
          const productData = await productResponse.json();
          const product = productData.products?.find((p: any) => p.sku === sku);

          if (!product) {
            notFoundSkus.push(sku);
            continue;
          }

          const price = parseFloat(product.cost_price) || 0;
          items.push({
            product_id: product.id,
            sku: product.sku,
            product_name: product.name,
            image_url: product.image_url || null,
            quantity,
            unit_price: price,
            purchase_cost: price,
            subtotal: quantity * price,
          });
        }

        if (items.length === 0) {
          setError(
            notFoundSkus.length > 0
              ? `SKUs não encontrados: ${notFoundSkus.join(", ")}`
              : "Nenhum produto válido encontrado na planilha"
          );
          setUploading(false);
          return;
        }

        setParsedItems(items);
        setUploading(false);
        setShowMultiSupplierModal(true);
      } else {
        // Single supplier mode - use existing API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("applyRounding", applyRounding.toString());
        formData.append("stockPeriod", stockPeriod);
        formData.append("useColumnH", useColumnH.toString());

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch("/api/orders/upload-spreadsheet", {
          method: "POST",
          body: formData,
          credentials: "include",
          headers,
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Erro ao processar planilha");
          return;
        }

        const orderCount = data.orders?.length || 0;
        if (orderCount === 1) {
          setSuccess(`Pedido criado com sucesso! Número: ${data.orders[0].order_number}`);
        } else {
          setSuccess(`${orderCount} pedidos criados com sucesso para diferentes fornecedores!`);
        }

        setTimeout(() => {
          onOrderCreated();
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Erro ao fazer upload da planilha");
    } finally {
      if (!isMultiSupplier) {
        setUploading(false);
      }
    }
  };

  const roundToMultipleOf10 = (quantity: number): number => {
    if (quantity <= 0) return 10;
    if (quantity <= 14) return 10;
    const remainder = quantity % 10;
    const base = Math.floor(quantity / 10) * 10;
    return remainder >= 5 ? base + 10 : base;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Importar Pedido por Planilha
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {step === 1 ? "Selecione o modo de importação" : "Faça upload de uma planilha XLSX com os produtos"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              disabled={uploading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
            {step === 1 ? (
              <>
                {/* Step 1: Multi-supplier selection */}
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Importar para Multi-Fornecedores?
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8">
                    Escolha como deseja importar os produtos da planilha
                  </p>

                  <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                    <button
                      onClick={() => {
                        setIsMultiSupplier(false);
                        setStep(2);
                      }}
                      className={`p-6 border-2 rounded-lg transition-all hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 ${
                        isMultiSupplier === false
                          ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="text-3xl mb-2">📦</div>
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">Fornecedor Único</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Sistema agrupa automaticamente por fornecedor
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setIsMultiSupplier(true);
                        setStep(2);
                      }}
                      className={`p-6 border-2 rounded-lg transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 ${
                        isMultiSupplier === true
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="text-3xl mb-2">🏢</div>
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">Multi-Fornecedores</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Distribua manualmente produtos entre fornecedores
                      </div>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Formato da Planilha</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    A planilha deve conter as seguintes colunas:
                  </p>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>
                      <strong>Coluna A:</strong> SKU do produto
                    </li>
                    <li>
                      <strong>Coluna {useColumnH ? 'H' : 'G'}:</strong> Quantidade
                    </li>
                  </ul>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
                    {isMultiSupplier
                      ? "A primeira linha (cabeçalho) será ignorada. Você poderá distribuir os produtos entre diferentes fornecedores na próxima etapa."
                      : "A primeira linha (cabeçalho) será ignorada. O sistema buscará os produtos pelo SKU, agrupará por fornecedor e criará pedidos automaticamente para cada fornecedor."}
                  </p>
                </div>

                {/* Stock Period Selection */}
                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6">
                  <div className="mb-3">
                    <label className="text-sm font-medium text-gray-900 dark:text-white block mb-2">
                      Período de Estoque
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Selecione o período de estoque para este pedido
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["7D", "15D", "30D"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setStockPeriod(period)}
                        disabled={uploading}
                        className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          stockPeriod === period
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600"
                        } ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Selection Option */}
                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center pt-0.5">
                      <input
                        type="checkbox"
                        checked={useColumnH}
                        onChange={(e) => setUseColumnH(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-2 focus:ring-blue-500/20"
                        disabled={uploading}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        Usar Coluna H para Quantidade
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {useColumnH ? 'Usando Coluna H (8ª coluna)' : 'Usando Coluna G (7ª coluna) - padrão'}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Rounding Option */}
                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center pt-0.5">
                      <input
                        type="checkbox"
                        checked={applyRounding}
                        onChange={(e) => setApplyRounding(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-2 focus:ring-blue-500/20"
                        disabled={uploading}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        Aplicar regra de arredondamento automático
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Ajusta quantidades para múltiplos de 10
                      </p>
                      <ul className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 space-y-0.5 ml-1">
                        <li>• 1-14 unidades → 10</li>
                        <li>• 15-24 unidades → 20</li>
                        <li>• 25-34 unidades → 30</li>
                        <li>• E assim por diante (múltiplos de 10)</li>
                      </ul>
                    </div>
                  </label>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                    </div>
                  </div>
                )}

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                      <FileSpreadsheet className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Selecione uma planilha XLSX
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Clique no botão abaixo para fazer upload
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = "";
                      }}
                      disabled={uploading}
                      className="hidden"
                      id="spreadsheet-upload"
                    />
                    <label htmlFor="spreadsheet-upload">
                      <Button disabled={uploading} asChild>
                        <span className="cursor-pointer">
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? "Processando..." : "Selecionar Arquivo"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {step === 2 && (
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setError(null);
                  setSuccess(null);
                }}
                disabled={uploading}
              >
                Voltar
              </Button>
            )}
            <div className="flex gap-3 ml-auto">
              <Button variant="outline" onClick={onClose} disabled={uploading}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Supplier Modal */}
      {showMultiSupplierModal && (
        <MultiSupplierOrderModal
          items={parsedItems}
          onClose={() => {
            setShowMultiSupplierModal(false);
            onClose();
          }}
          onOrdersCreated={onOrderCreated}
          applyRounding={applyRounding}
        />
      )}
    </>
  );
}
