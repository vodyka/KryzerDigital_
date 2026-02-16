import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Search,
  Upload,
  DollarSign,
  Activity,
  X,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlignJustify,
  Calendar,
  Trash2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { Input } from "@/react-app/components/ui/input";
import { AnalyticsChart } from "@/react-app/components/AnalyticsChart";
import { MetricCard } from "@/react-app/components/MetricCard";
import { exportToExcel, exportToCSV } from "@/react-app/utils/exportData";
import { ImportResultModal } from "@/react-app/components/ImportResultModal";

type PeriodFilter = "30D" | "60D" | "90D" | "3M" | "6M" | "12M";

interface SpreadsheetData {
  sku: string;
  name: string;
  units: number;
  revenue: number;
  avgPrice: number;
  notFound?: boolean;
}

interface HistoryRecord {
  id: number;
  monthYear: string;
  monthLabel: string;
  uploadedAt: string;
  isComplete: boolean;
}

interface ComparisonData {
  monthA: {
    monthYear: string;
    totals: {
      units: number;
      revenue: number;
      uniqueSkus: number;
    };
    avgPrice: number;
  };
  monthB: {
    monthYear: string;
    totals: {
      units: number;
      revenue: number;
      uniqueSkus: number;
    };
    avgPrice: number;
  };
  comparison: {
    unitsDiff: number;
    unitsPercent: number;
    revenueDiff: number;
    revenuePercent: number;
    skusDiff: number;
    skusPercent: number;
  };
}

function formatMonthLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-");
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${monthNames[parseInt(month) - 1]}/${year}`;
}

export default function VendasVariantePage() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30D");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showComparisonCard, setShowComparisonCard] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "units" | "avgPrice">("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMultiSearchModal, setShowMultiSearchModal] = useState(false);
  const [multiSearchText, setMultiSearchText] = useState("");
  const [activeMultiSearch, setActiveMultiSearch] = useState(false);
  const [filteredData, setFilteredData] = useState<SpreadsheetData[]>([]);
  const [comparisonMonthA, setComparisonMonthA] = useState<string>("");
  const [comparisonMonthB, setComparisonMonthB] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedMonth) {
        params.append("month_year", selectedMonth);
      } else {
        params.append("period", periodFilter);
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/analytics/products?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setFilteredData(data.products || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/analytics/spreadsheets", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setHistory((data.spreadsheets || []).map((s: any) => ({
        id: s.id,
        monthYear: s.month_year,
        monthLabel: formatMonthLabel(s.month_year),
        uploadedAt: s.uploaded_at,
        isComplete: s.is_complete === 1,
      })));
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const loadComparison = async () => {
    if (!comparisonMonthA || !comparisonMonthB) {
      setComparisonData(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/analytics/compare?month_a=${comparisonMonthA}&month_b=${comparisonMonthB}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setComparisonData(data);
    } catch (error) {
      console.error("Error loading comparison:", error);
      setComparisonData(null);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [periodFilter, selectedMonth]);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    loadComparison();
  }, [comparisonMonthA, comparisonMonthB]);

  const totalRevenue = filteredData.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalUnits = filteredData.reduce((sum, p) => sum + (p.units || 0), 0);
  const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  const top30Products = [...filteredData]
    .sort((a, b) => (b.units || 0) - (a.units || 0))
    .slice(0, 30);

  const filteredAndSortedProducts = filteredData
    .filter((product) => {
      if (activeMultiSearch && multiSearchText.trim()) {
        const skus = multiSearchText.split('\n').map(s => s.trim().toUpperCase()).filter(s => s);
        return skus.some(sku => product.sku.toUpperCase().includes(sku));
      }
      
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

  const totalPages = Math.ceil(filteredAndSortedProducts.length / pageSize);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder, pageSize]);

  const handleFileUpload = async (file: File) => {
    try {
      if (!file.name.startsWith("Sales_by_Variant_")) {
        alert("O nome do arquivo deve começar com 'Sales_by_Variant_'");
        return;
      }

      // Extract month/year from filename: Sales_by_Variant_MM_AAAA.xlsx
      const fileNameParts = file.name.replace("Sales_by_Variant_", "").replace(".xlsx", "").split("_");
      
      if (fileNameParts.length < 2) {
        alert("Formato de arquivo inválido. Use: Sales_by_Variant_MM_AAAA.xlsx");
        return;
      }

      const month = parseInt(fileNameParts[0]);
      const year = fileNameParts[1];

      if (month < 1 || month > 12 || !year) {
        alert("Mês ou ano inválido no nome do arquivo");
        return;
      }

      const monthYear = `${year}-${String(month).padStart(2, '0')}`;
      const monthLabel = formatMonthLabel(monthYear);

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        alert("A planilha está vazia ou não contém dados");
        return;
      }
      
      let productsMap: Record<string, string> = {};
      try {
        const token = localStorage.getItem("token");
        const productsResponse = await fetch("/api/products", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const productsData = await productsResponse.json();
        if (productsData.products) {
          productsMap = productsData.products.reduce((acc: Record<string, string>, p: any) => {
            acc[p.sku] = p.name;
            return acc;
          }, {});
        }
      } catch (error) {
        console.error("Error fetching products for title lookup:", error);
      }

      const parsedData: SpreadsheetData[] = [];
      const skippedRows: any[] = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const sku = row[2]?.toString().trim();
        const fallbackTitle = row[3]?.toString().trim() || "Produto sem nome";
        const unitsRaw = row[8]?.toString() || "";
        const revenueRaw = row[9]?.toString() || "";
        const units = parseInt(unitsRaw.replace(/[^0-9-]/g, "") || "0");
        const revenue = parseFloat(revenueRaw.replace(/[^0-9.,-]/g, "").replace(",", ".") || "0");
        
        const productFound = !!(productsMap[sku || ""]);
        const name = productsMap[sku || ""] || fallbackTitle;
        const avgPrice = units > 0 ? revenue / units : 0;

        if (sku && !isNaN(units) && units > 0) {
          parsedData.push({
            sku,
            name,
            units,
            revenue: isNaN(revenue) ? 0 : revenue,
            avgPrice: isNaN(avgPrice) ? 0 : avgPrice,
            notFound: !productFound,
          });
        } else {
          let reason = "";
          if (!sku) reason = "SKU vazio";
          else if (isNaN(units) || units <= 0) reason = "Unidades inválidas";
          
          skippedRows.push({
            lineNumber: i + 1, // +1 porque linha 1 do Excel é header (linha 0 do array)
            sku: sku || "",
            name: fallbackTitle,
            units: unitsRaw,
            revenue: revenueRaw,
            reason,
          });
        }
      }

      if (parsedData.length === 0) {
        alert("Nenhum dado válido encontrado na planilha. Verifique se as colunas estão corretas.");
        return;
      }

      const token = localStorage.getItem("token");
      const response = await fetch("/api/analytics/spreadsheets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          monthYear, 
          monthLabel, 
          data: parsedData 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload spreadsheet");
      }

      const result = await response.json();

      await loadHistory();
      await loadProducts();
      
      setImportResult({
        success: true,
        monthLabel,
        productsCount: parsedData.length,
        skippedRows,
        updated: result.updated,
      });
      setShowImportModal(false);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Erro ao importar planilha: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const handleRemoveSpreadsheet = async (monthYear: string) => {
    const monthLabel = formatMonthLabel(monthYear);
    if (!confirm(`Tem certeza que deseja remover a planilha de ${monthLabel}? Todos os dados deste mês serão excluídos.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/analytics/spreadsheets/${monthYear}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to remove spreadsheet");
      }

      await loadHistory();
      await loadProducts();
      alert("Planilha removida com sucesso!");
    } catch (error) {
      console.error("Error removing spreadsheet:", error);
      alert("Erro ao remover planilha. Tente novamente.");
    }
  };

  const handleSaveEditedRows = async (editedRows: any[]) => {
    try {
      // Parse edited rows
      const validRows: SpreadsheetData[] = [];
      
      for (const row of editedRows) {
        const sku = row.sku?.trim();
        const units = parseInt(row.units?.toString().replace(/[^0-9-]/g, "") || "0");
        const revenue = parseFloat(row.revenue?.toString().replace(/[^0-9.,-]/g, "").replace(",", ".") || "0");
        
        if (sku && !isNaN(units) && units > 0) {
          validRows.push({
            sku,
            name: row.name || "Produto sem nome",
            units,
            revenue: isNaN(revenue) ? 0 : revenue,
            avgPrice: units > 0 ? revenue / units : 0,
            notFound: false,
          });
        }
      }
      
      if (validRows.length === 0) {
        alert("Nenhuma linha válida para salvar");
        return;
      }

      // Get current import result to get monthYear
      if (!importResult) return;
      
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const [monthName, year] = importResult.monthLabel.split("/");
      const monthIndex = monthNames.indexOf(monthName);
      const monthYear = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      // Send to server
      const token = localStorage.getItem("token");
      const response = await fetch("/api/analytics/spreadsheets", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          monthYear,
          monthLabel: importResult.monthLabel,
          data: validRows,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save edited rows");
      }

      await loadHistory();
      await loadProducts();
      
      alert(`${validRows.length} linha(s) salva(s) com sucesso!`);
    } catch (error) {
      console.error("Error saving edited rows:", error);
      alert("Erro ao salvar. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 lg:p-6">
      {/* Import Result Modal */}
      <ImportResultModal
        result={importResult}
        onClose={() => setImportResult(null)}
        onSaveEdits={handleSaveEditedRows}
      />

      {/* Multi-SKU Search Modal */}
      {showMultiSearchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Busca Múltipla por SKU
              </h5>
              <button
                onClick={() => setShowMultiSearchModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Digite os SKUs (um por linha)
              </label>
              <textarea
                value={multiSearchText}
                onChange={(e) => setMultiSearchText(e.target.value)}
                placeholder="515UR06&#10;515UR04&#10;515UR02&#10;515UR08"
                className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Digite um SKU por linha. A busca encontrará todos os produtos que contenham esses códigos.
              </p>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setMultiSearchText("");
                  setActiveMultiSearch(false);
                  setShowMultiSearchModal(false);
                }}
              >
                Limpar
              </Button>
              <Button
                onClick={() => {
                  setActiveMultiSearch(true);
                  setSearchQuery("");
                  setShowMultiSearchModal(false);
                }}
              >
                Buscar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Histórico de Planilhas ({history.length}/36)
              </h5>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500 font-medium">Nenhuma planilha importada</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Clique em "Importar" para adicionar planilhas de vendas
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {record.monthLabel}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Enviado em {new Date(record.uploadedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMonth(record.monthYear);
                            setShowHistoryModal(false);
                          }}
                          title="Visualizar este mês"
                        >
                          <Activity className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSpreadsheet(record.monthYear)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Importar Planilha de Vendas
              </h5>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Selecione o arquivo
                </label>
                <Input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                      e.target.value = "";
                    }
                  }}
                  className="w-full"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-2">Formato do arquivo:</p>
                    <p className="mb-2"><strong>Nome:</strong> Sales_by_Variant_MM_AAAA.xlsx</p>
                    <p className="mb-2"><strong>Exemplo:</strong> Sales_by_Variant_01_2025.xlsx (Janeiro/2025)</p>
                    <p><strong>Colunas:</strong> C=SKU, D=Título, I=Unidades Vendidas, J=Pagamento Recebidos</p>
                    <p className="mt-3 text-xs">
                      💡 O sistema mantém histórico de até 36 meses. Se já existir uma planilha para o mês, ela será substituída.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Vendas por Variante
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analise vendas com histórico de até 36 meses
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Button variant="outline" onClick={() => setShowHistoryModal(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Histórico ({history.length})
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToExcel(filteredData, periodFilter)}>
                Exportar para Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(filteredData, periodFilter)}>
                Exportar para CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(["30D", "60D", "90D", "3M", "6M", "12M"] as PeriodFilter[]).map((period) => (
                <button
                  key={period}
                  onClick={() => {
                    setPeriodFilter(period);
                    setSelectedMonth(null);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    periodFilter === period && !selectedMonth
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  {selectedMonth ? formatMonthLabel(selectedMonth) : "Mês Específico"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                {history.map((record) => (
                  <DropdownMenuItem
                    key={record.id}
                    onClick={() => setSelectedMonth(record.monthYear)}
                  >
                    {record.monthLabel}
                  </DropdownMenuItem>
                ))}
                {history.length === 0 && (
                  <DropdownMenuItem disabled>
                    Nenhum mês disponível
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedMonth && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMonth(null)}
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}

            <div className="flex-1" />

            <Button
              variant={showComparisonCard ? "default" : "outline"}
              size="sm"
              onClick={() => setShowComparisonCard(!showComparisonCard)}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Comparativo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Card */}
      {showComparisonCard && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Comparativo Mês x Mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mês A
                </label>
                <select
                  value={comparisonMonthA}
                  onChange={(e) => setComparisonMonthA(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um mês</option>
                  {history.filter(h => h.isComplete).map((record) => (
                    <option key={record.id} value={record.monthYear}>
                      {record.monthLabel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mês B
                </label>
                <select
                  value={comparisonMonthB}
                  onChange={(e) => setComparisonMonthB(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um mês</option>
                  {history.filter(h => h.isComplete).map((record) => (
                    <option key={record.id} value={record.monthYear}>
                      {record.monthLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {comparisonData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unidades Vendidas</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {comparisonData.comparison.unitsDiff > 0 ? "+" : ""}
                        {comparisonData.comparison.unitsDiff.toLocaleString('pt-BR')}
                      </p>
                      <Badge className={comparisonData.comparison.unitsPercent >= 0 ? "bg-green-500" : "bg-red-500"}>
                        {comparisonData.comparison.unitsPercent > 0 ? "+" : ""}
                        {comparisonData.comparison.unitsPercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {comparisonData.monthA.totals.units.toLocaleString('pt-BR')} → {comparisonData.monthB.totals.units.toLocaleString('pt-BR')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Faturamento</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {comparisonData.comparison.revenueDiff > 0 ? "+" : ""}
                        R$ {Math.abs(comparisonData.comparison.revenueDiff).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <Badge className={comparisonData.comparison.revenuePercent >= 0 ? "bg-green-500" : "bg-red-500"}>
                        {comparisonData.comparison.revenuePercent > 0 ? "+" : ""}
                        {comparisonData.comparison.revenuePercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      R$ {comparisonData.monthA.totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} → R$ {comparisonData.monthB.totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Preço Médio</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        R$ {comparisonData.monthB.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      R$ {comparisonData.monthA.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → R$ {comparisonData.monthB.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">SKUs Vendidos</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {comparisonData.comparison.skusDiff > 0 ? "+" : ""}
                        {comparisonData.comparison.skusDiff}
                      </p>
                      <Badge className={comparisonData.comparison.skusPercent >= 0 ? "bg-green-500" : "bg-red-500"}>
                        {comparisonData.comparison.skusPercent > 0 ? "+" : ""}
                        {comparisonData.comparison.skusPercent.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {comparisonData.monthA.totals.uniqueSkus} → {comparisonData.monthB.totals.uniqueSkus}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Anúncios Vendidos"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={selectedMonth ? formatMonthLabel(selectedMonth) : `Período: ${periodFilter}`}
          icon={DollarSign}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-900/20"
          trend={{
            value: selectedMonth ? formatMonthLabel(selectedMonth) : periodFilter,
            isPositive: true,
            icon: TrendingUp,
          }}
        />

        <MetricCard
          title="Unidades Vendidas"
          value={totalUnits.toLocaleString('pt-BR')}
          subtitle="Total de unidades"
          icon={Package}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          trend={{
            value: "Total de unidades",
            isPositive: true,
            icon: Activity,
          }}
        />

        <MetricCard
          title="Ticket Médio"
          value={`R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Por unidade"
          icon={TrendingUp}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-900/20"
          trend={{
            value: "Por unidade",
            isPositive: true,
            icon: Activity,
          }}
        />

        <MetricCard
          title="Total SKUs"
          value={filteredData.length}
          subtitle="Produtos únicos"
          icon={ShoppingBag}
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBgColor="bg-cyan-100 dark:bg-cyan-900/20"
          trend={{
            value: "Produtos únicos",
            isPositive: true,
            icon: Package,
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <AnalyticsChart 
          data={filteredData} 
          title="Top 10 Receita por Produto" 
          type="revenue" 
        />
        
        <AnalyticsChart 
          data={filteredData} 
          title="Top 10 Unidades Vendidas" 
          type="units" 
        />
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Product List */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Lista de Produtos Importados</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por título ou SKU..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveMultiSearch(false);
                  }}
                  className="pl-10"
                  disabled={activeMultiSearch}
                />
                {activeMultiSearch && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Badge className="bg-blue-500 text-white">
                      Busca múltipla ativa
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowMultiSearchModal(true)}
                className="gap-2"
                title="Busca múltipla por SKU"
              >
                <AlignJustify className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    Ordenar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setSortBy("revenue"); setSortOrder("desc"); }}>
                    Receita (Maior → Menor)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("revenue"); setSortOrder("asc"); }}>
                    Receita (Menor → Maior)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setSortBy("units"); setSortOrder("desc"); }}>
                    Unidades (Mais → Menos)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("units"); setSortOrder("asc"); }}>
                    Unidades (Menos → Mais)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setSortBy("avgPrice"); setSortOrder("desc"); }}>
                    Preço Médio (Maior → Menor)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortBy("avgPrice"); setSortOrder("asc"); }}>
                    Preço Médio (Menor → Maior)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">{pageSize} por página</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setPageSize(20)}>20 por página</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPageSize(50)}>50 por página</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPageSize(100)}>100 por página</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPageSize(300)}>300 por página</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPageSize(500)}>500 por página</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      Unidades
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      Receita
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      Preço Médio
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500 font-medium">Nenhum produto importado</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Clique em "Importar" para adicionar planilhas de vendas
                        </p>
                      </td>
                    </tr>
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Search className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500 font-medium">Nenhum resultado encontrado</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Tente ajustar seus filtros de busca
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((product) => (
                      <tr 
                        key={product.sku} 
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          product.notFound ? "bg-red-50 dark:bg-red-900/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <code className={`text-xs font-mono px-2 py-1 rounded ${
                            product.notFound 
                              ? "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20" 
                              : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700"
                          }`}>
                            {product.sku}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`font-medium ${
                            product.notFound 
                              ? "text-red-900 dark:text-red-100" 
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {product.name}
                            {!!product.notFound && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                                (SKU não encontrado em /produtos)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {(product.units || 0).toLocaleString('pt-BR')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-900 dark:text-white font-medium">
                            R$ {(product.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-gray-900 dark:text-white">
                            R$ {(product.avgPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredAndSortedProducts.length > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredAndSortedProducts.length)} de {filteredAndSortedProducts.length} produtos
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[2.5rem]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 30 Products */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Top 30 Produtos</CardTitle>
              <Badge variant="outline" className="text-xs">
                Por unidades vendidas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 lg:p-4 flex-1 overflow-hidden">
            {top30Products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500 font-medium">Aguardando dados</p>
                <p className="text-sm text-gray-400 mt-1 text-center">
                  Importe planilhas para ver o ranking
                </p>
              </div>
            ) : (
              <div className="space-y-3 h-full overflow-y-auto overflow-x-hidden">
                {top30Products.map((product, index) => {
                  const medalColors = [
                    "from-yellow-400 to-yellow-600",
                    "from-gray-300 to-gray-500",
                    "from-orange-400 to-orange-600",
                  ];
                  const bgColor = index < 3 ? medalColors[index] : "from-blue-400 to-blue-600";
                  
                  return (
                    <div
                      key={product.sku}
                      className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0 group hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 bg-gradient-to-br ${bgColor} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <span className="text-sm text-white font-bold">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <code className="text-xs text-gray-500 dark:text-gray-400 font-mono block truncate mb-0.5">
                            {product.sku}
                          </code>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            R$ {(product.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="text-base font-bold text-gray-900 dark:text-white">
                          {(product.units || 0).toLocaleString('pt-BR')}
                        </div>
                        <small className="text-xs text-gray-500">unidades</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
