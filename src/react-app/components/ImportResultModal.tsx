import { useState } from "react";
import { X, CheckCircle, AlertCircle, Edit3, Save } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Input } from "@/react-app/components/ui/input";

interface SkippedRow {
  lineNumber: number;
  sku: string;
  name: string;
  units: string;
  revenue: string;
  reason: string;
}

interface ImportResult {
  success: boolean;
  monthLabel: string;
  productsCount: number;
  skippedRows: SkippedRow[];
  updated: boolean;
}

interface ImportResultModalProps {
  result: ImportResult | null;
  onClose: () => void;
  onSaveEdits?: (editedRows: SkippedRow[]) => Promise<void>;
}

export function ImportResultModal({ result, onClose, onSaveEdits }: ImportResultModalProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "errors">("summary");
  const [editMode, setEditMode] = useState(false);
  const [editedRows, setEditedRows] = useState<SkippedRow[]>([]);

  if (!result) return null;

  const handleStartEdit = () => {
    setEditedRows([...result.skippedRows]);
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditedRows([]);
    setEditMode(false);
  };

  const handleSaveEdits = async () => {
    if (onSaveEdits) {
      await onSaveEdits(editedRows);
    }
    setEditMode(false);
    onClose();
  };

  const updateEditedRow = (index: number, field: keyof SkippedRow, value: string) => {
    const newRows = [...editedRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setEditedRows(newRows);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {result.success ? (
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            )}
            <div>
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                {result.updated ? "Planilha Atualizada" : "Planilha Importada"}
              </h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.monthLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "summary"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Resumo
          </button>
          {result.skippedRows.length > 0 && (
            <button
              onClick={() => setActiveTab("errors")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                activeTab === "errors"
                  ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Erros
              <Badge className="ml-2 bg-red-500 text-white">
                {result.skippedRows.length}
              </Badge>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "summary" && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Importação concluída com sucesso!
                    </p>
                    <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                      <p><strong>Mês:</strong> {result.monthLabel}</p>
                      <p><strong>Produtos carregados:</strong> {result.productsCount}</p>
                      {result.skippedRows.length > 0 && (
                        <p className="text-orange-700 dark:text-orange-300">
                          <strong>Linhas ignoradas:</strong> {result.skippedRows.length}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {result.skippedRows.length > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                        Atenção
                      </p>
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        Algumas linhas foram ignoradas durante a importação. Clique na aba "Erros" para ver os detalhes e corrigir manualmente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "errors" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result.skippedRows.length} linha(s) ignorada(s)
                </p>
                {!editMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEdit}
                    className="gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Editar e Salvar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdits}
                      className="gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {(editMode ? editedRows : result.skippedRows).map((row, index) => (
                  <div
                    key={index}
                    className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Badge className="bg-red-500 text-white">
                        Linha {row.lineNumber}
                      </Badge>
                      <Badge variant="outline" className="text-red-700 dark:text-red-300 border-red-300">
                        {row.reason}
                      </Badge>
                    </div>

                    {editMode ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            SKU
                          </label>
                          <Input
                            value={editedRows[index].sku}
                            onChange={(e) => updateEditedRow(index, "sku", e.target.value)}
                            placeholder="SKU do produto"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome
                          </label>
                          <Input
                            value={editedRows[index].name}
                            onChange={(e) => updateEditedRow(index, "name", e.target.value)}
                            placeholder="Nome do produto"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Unidades
                          </label>
                          <Input
                            value={editedRows[index].units}
                            onChange={(e) => updateEditedRow(index, "units", e.target.value)}
                            placeholder="Quantidade"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Receita
                          </label>
                          <Input
                            value={editedRows[index].revenue}
                            onChange={(e) => updateEditedRow(index, "revenue", e.target.value)}
                            placeholder="Valor"
                            className="text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">SKU:</span>
                          <code className="ml-2 text-gray-900 dark:text-white font-mono">
                            {row.sku || "(vazio)"}
                          </code>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Nome:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {row.name || "(vazio)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Unidades:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {row.units || "(vazio)"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Receita:</span>
                          <span className="ml-2 text-gray-900 dark:text-white">
                            {row.revenue || "(vazio)"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose}>
            {activeTab === "errors" && result.skippedRows.length > 0 ? "Fechar" : "OK"}
          </Button>
        </div>
      </div>
    </div>
  );
}
