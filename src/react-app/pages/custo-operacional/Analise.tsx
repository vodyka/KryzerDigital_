import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Switch } from "@/react-app/components/ui/switch";
import {
  TrendingUp,
  Search,
  Download,
  DollarSign,
  Package,
  Calculator,
  AlertCircle,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

interface AnalysisProduct {
  sku: string;
  name: string;
  cost: number;
  units: number;
  costTimesUnits: number;
  percentage: number;
  allocatedExpense: number;
  operationalCostPerUnit: number;
  groupId: number | null;
  groupName: string | null;
  groupSpu: string | null;
  groupType: string | null;
}

interface AnalysisData {
  month: string;
  totalExpenses: number;
  totalCostTimesUnits: number;
  products: AnalysisProduct[];
  kitInfo: Record<string, any>;
}

export default function AnalisePage() {
  const [selectedMonth, setSelectedMonth] = useState("");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<keyof AnalysisProduct>("operationalCostPerUnit");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"individual" | "grouped">("individual");
  const [groupKitsByFamily, setGroupKitsByFamily] = useState(true);

  // Generate month options (last 6 months)
  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    const monthNames = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    
    for (let i = 0; i < 6; i++) {
      const year = today.getFullYear();
      const monthIndex = today.getMonth() - i;
      
      let targetYear = year;
      let targetMonth = monthIndex;
      
      if (targetMonth < 0) {
        targetYear = year - 1;
        targetMonth = 12 + monthIndex;
      }
      
      const month = String(targetMonth + 1).padStart(2, "0");
      const value = `${targetYear}-${month}`;
      const label = `${monthNames[targetMonth]}/${targetYear}`;
      
      options.push({ value, label });
    }
    return options;
  };

  const fetchAnalysis = async () => {
    if (!selectedMonth) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/operational-cost/analysis/${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setAnalysisData(data);
      } else {
        setError(data.error || "Erro ao buscar análise");
        setAnalysisData(null);
      }
    } catch (error) {
      setError("Erro ao conectar com o servidor");
      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  // Process data based on view mode
  const processedProducts = (() => {
    if (!analysisData?.products) return [];

    let products = [...analysisData.products];

    // Group products if in grouped mode
    if (viewMode === "grouped") {
      const groupedMap: Record<number, AnalysisProduct> = {};
      const ungroupedProducts: AnalysisProduct[] = [];

      products.forEach((product) => {
        if (product.groupId && product.groupName) {
          if (!groupedMap[product.groupId]) {
            groupedMap[product.groupId] = {
              sku: product.groupSpu || `GROUP_${product.groupId}`,
              name: `${product.groupName}`,
              cost: product.cost,
              units: product.units,
              costTimesUnits: product.costTimesUnits,
              percentage: product.percentage,
              allocatedExpense: product.allocatedExpense,
              operationalCostPerUnit: product.operationalCostPerUnit,
              groupId: product.groupId,
              groupName: product.groupName,
              groupSpu: product.groupSpu,
              groupType: product.groupType,
            };
          } else {
            // Accumulate units and recalculate weighted average cost
            const existing = groupedMap[product.groupId];
            const totalUnits = existing.units + product.units;
            const totalCostTimesUnits = existing.costTimesUnits + product.costTimesUnits;
            const weightedAvgCost = totalUnits > 0 ? totalCostTimesUnits / totalUnits : 0;

            groupedMap[product.groupId] = {
              ...existing,
              units: totalUnits,
              cost: weightedAvgCost,
              costTimesUnits: totalCostTimesUnits,
              percentage: existing.percentage + product.percentage,
              allocatedExpense: existing.allocatedExpense + product.allocatedExpense,
              operationalCostPerUnit: totalUnits > 0 
                ? (existing.allocatedExpense + product.allocatedExpense) / totalUnits 
                : 0,
            };
          }
        } else {
          ungroupedProducts.push(product);
        }
      });

      products = [...Object.values(groupedMap), ...ungroupedProducts];

      // Handle kit reconstruction for composition groups when toggle is enabled
      if (groupKitsByFamily && analysisData.kitInfo) {
        const compositionGroupKits: Record<number, any[]> = {};
        
        // Group all kits by their groupId (only for composition type)
        Object.entries(analysisData.kitInfo).forEach(([kitSku, kitData]: [string, any]) => {
          if (kitData.groupId && kitData.groupType === "composicao") {
            if (!compositionGroupKits[kitData.groupId]) {
              compositionGroupKits[kitData.groupId] = [];
            }
            compositionGroupKits[kitData.groupId].push({ sku: kitSku, ...kitData });
          }
        });

        // Process each composition group
        Object.entries(compositionGroupKits).forEach(([groupId, kits]) => {
          const groupIdNum = Number(groupId);
          
          // Remove component aggregation for this group
          products = products.filter(p => p.groupId !== groupIdNum);

          // Calculate totals for all kits in this group
          let totalUnits = 0;
          let totalCostTimesUnits = 0;
          
          kits.forEach((kit) => {
            totalUnits += kit.units || 0;
            totalCostTimesUnits += kit.cost * kit.units;
          });

          // Calculate weighted average cost
          const weightedAvgCost = totalUnits > 0 ? totalCostTimesUnits / totalUnits : 0;

          // Calculate percentage and allocated expense
          const totalCostTimesUnitsGlobal = analysisData.totalCostTimesUnits || 0;
          const percentage = totalCostTimesUnitsGlobal > 0 ? totalCostTimesUnits / totalCostTimesUnitsGlobal : 0;
          const allocatedExpense = (analysisData.totalExpenses || 0) * percentage;
          const operationalCostPerUnit = totalUnits > 0 ? allocatedExpense / totalUnits : 0;

          // Get group info from first kit
          const firstKit = kits[0];
          
          // Add reconstructed group entry
          products.push({
            sku: firstKit.groupSpu || `GROUP_${groupIdNum}`,
            name: firstKit.groupName || `Grupo ${groupIdNum}`,
            cost: weightedAvgCost,
            units: totalUnits,
            costTimesUnits: totalCostTimesUnits,
            percentage,
            allocatedExpense,
            operationalCostPerUnit,
            groupId: groupIdNum,
            groupName: firstKit.groupName,
            groupSpu: firstKit.groupSpu,
            groupType: "composicao",
          });
        });
      }
    }

    return products;
  })();

  // Filter and sort processed products
  const filteredAndSortedProducts = useMemo(() => {
    let products = processedProducts.filter((product) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query)
      );
    });

    products.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
    });

    return products;
  }, [processedProducts, searchQuery, sortBy, sortOrder]);

  const handleExport = (format: "excel" | "csv") => {
    if (!analysisData) return;

    const exportData = analysisData.products.map((p) => ({
      SKU: p.sku,
      Produto: p.name,
      "Preço Custo": p.cost,
      "Qtd Vendas": p.units,
      "Custo × Vendas": p.costTimesUnits,
      "% do Total": (p.percentage * 100).toFixed(2),
      "Despesa Alocada": p.allocatedExpense.toFixed(2),
      "Custo Operacional/Un": p.operationalCostPerUnit.toFixed(2),
    }));

    if (format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custo Operacional");
      
      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
        { wch: 18 },
        { wch: 22 },
      ];
      
      XLSX.writeFile(workbook, `custo-operacional-${selectedMonth}.xlsx`);
    } else {
      const headers = Object.keys(exportData[0]);
      const rows = exportData.map(row => Object.values(row).map(v => `"${v}"`).join(","));
      const csvContent = [headers.join(","), ...rows].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `custo-operacional-${selectedMonth}.csv`);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Análise de Custo Operacional</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Calcule o custo operacional por unidade de cada produto
          </p>
        </div>
        {analysisData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                Exportar para Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Exportar para CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Month Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Selecione o Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="month">Mês de Referência</Label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um mês</option>
                {getMonthOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={fetchAnalysis} disabled={!selectedMonth || loading}>
              {loading ? "Calculando..." : "Calcular"}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {analysisData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total de Despesas</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      R$ {analysisData.totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Custo × Vendas Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      R$ {analysisData.totalCostTimesUnits.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total de Produtos</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analysisData.products.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <CardTitle>Análise por Produto</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Layers className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Visualização:</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${viewMode === "individual" ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}>
                          Individual
                        </span>
                        <Switch
                          checked={viewMode === "grouped"}
                          onCheckedChange={(checked) => setViewMode(checked ? "grouped" : "individual")}
                        />
                        <span className={`text-sm font-medium ${viewMode === "grouped" ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}>
                          Agrupado
                        </span>
                      </div>
                    </div>

                    {viewMode === "grouped" && analysisData && Object.keys(analysisData.kitInfo || {}).length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm text-purple-600 dark:text-purple-400">Mostrar kits composição:</span>
                        <Switch
                          checked={groupKitsByFamily}
                          onCheckedChange={setGroupKitsByFamily}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Buscar por SKU ou produto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Ordenar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSortBy("operationalCostPerUnit"); setSortOrder("desc"); }}>
                        Custo Op. (Maior → Menor)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy("operationalCostPerUnit"); setSortOrder("asc"); }}>
                        Custo Op. (Menor → Maior)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy("units"); setSortOrder("desc"); }}>
                        Vendas (Mais → Menos)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy("cost"); setSortOrder("desc"); }}>
                        Custo (Maior → Menor)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        {viewMode === "grouped" ? "SPU" : "SKU"}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                        Produto
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        Preço Custo
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        Qtd Vendas
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                        Custo Operacional/Un
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAndSortedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-gray-500 font-medium">Nenhum resultado encontrado</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedProducts.map((product, index) => (
                        <tr
                          key={`${product.sku}-${product.groupId || 'none'}-${index}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <code className="text-xs font-mono px-2 py-1 rounded text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700">
                              {product.sku}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                              {product.groupId && viewMode === "individual" && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                  Grupo
                                </span>
                              )}
                              {viewMode === "grouped" && product.groupId && product.groupType === "composicao" && (
                                <span className="ml-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">
                                  Agrupado/Composição
                                </span>
                              )}
                              {viewMode === "grouped" && product.groupId && product.groupType !== "composicao" && (
                                <span className="ml-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">
                                  Agrupado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-gray-900 dark:text-white">
                              R$ {product.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-gray-900 dark:text-white font-medium">
                              {product.units.toLocaleString("pt-BR")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              R$ {product.operationalCostPerUnit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
