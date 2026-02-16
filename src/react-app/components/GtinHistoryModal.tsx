import { useState, useEffect } from "react";
import { X, Search, ChevronLeft, ChevronRight, Barcode, Loader2 } from "lucide-react";

interface GtinHistoryItem {
  id: string;
  created_at: string;
  spu: string;
  sku: string;
  product_name: string;
  gtin: string;
  status: string;
}

interface GtinHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GtinHistoryModal({ isOpen, onClose }: GtinHistoryModalProps) {
  const [gtinHistory, setGtinHistory] = useState<GtinHistoryItem[]>([]);
  const [gtinSearch, setGtinSearch] = useState("");
  const [gtinPage, setGtinPage] = useState(1);
  const [gtinTotalPages, setGtinTotalPages] = useState(1);
  const [gtinLoading, setGtinLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchGtinHistory();
    }
  }, [isOpen, gtinPage, gtinSearch]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full my-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
              <Barcode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Histórico de GTIN/EAN</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Controle de códigos de barras gerados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Search */}
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

          {/* Table */}
          {gtinLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-spin" />
            </div>
          ) : gtinHistory.length === 0 ? (
            <div className="text-center py-12">
              <Barcode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {gtinSearch ? "Nenhum resultado encontrado" : "Nenhum GTIN gerado ainda"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
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
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
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
    </div>
  );
}
