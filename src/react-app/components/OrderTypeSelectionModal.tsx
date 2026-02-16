import { X, FileSpreadsheet, Wand2, PenLine } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";

interface OrderTypeSelectionModalProps {
  onClose: () => void;
  onSelectType: (type: "manual" | "spreadsheet" | "smart") => void;
}

export default function OrderTypeSelectionModal({ onClose, onSelectType }: OrderTypeSelectionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Criar Novo Pedido
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Escolha o tipo de pedido que deseja criar:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Manual Order */}
            <button
              onClick={() => onSelectType("manual")}
              className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                  <PenLine className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Pedido Manual
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Adicione produtos manualmente um por um
                </p>
              </div>
            </button>

            {/* Spreadsheet Order */}
            <button
              onClick={() => onSelectType("spreadsheet")}
              className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                  <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Pedido por Planilha
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Importe uma planilha com os produtos
                </p>
              </div>
            </button>

            {/* Smart Order */}
            <button
              onClick={() => onSelectType("smart")}
              className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                  <Wand2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Pedido Inteligente
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sistema cria pedido automaticamente com base em reposição
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
