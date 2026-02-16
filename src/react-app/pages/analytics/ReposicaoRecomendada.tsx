import { useState, useEffect } from "react";
import {
  Package,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  AlignJustify,
  Image,
} from "lucide-react";
import { Switch } from "@/react-app/components/ui/switch";
import { Label } from "@/react-app/components/ui/label";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Input } from "@/react-app/components/ui/input";

type PeriodFilter = "7D" | "15D" | "30D" | "60D" | "90D";

interface RestockRecommendation {
  sku: string;
  name: string;
  abc_curve: "A" | "B" | "C";
  current_stock: number;
  needed_for_target: number;
  shortage: number;
  days_of_stock: number;
  stock_status: "critical" | "low" | "medium" | "good";
  avg_daily_sales: number;
  total_units_sold: number;
  product_status?: string;
  image_url?: string | null;
  urgency: "high" | "medium" | "low";
}

type RestockSortField = "sku" | "name" | "abc_curve" | "current_stock" | "days_of_stock" | "avg_daily_sales" | "needed_for_target" | "shortage" | "urgency";

export default function ReposicaoRecomendadaPage() {
  const [restockRecommendations, setRestockRecommendations] = useState<RestockRecommendation[]>([]);
  const [loadingRestock, setLoadingRestock] = useState(false);
  const [restockPeriod, setRestockPeriod] = useState<PeriodFilter>("30D");
  const [restockSearch, setRestockSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState<"all" | "below" | "above">("all");
  const [daysValue, setDaysValue] = useState(7);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showRestockMultiSearchModal, setShowRestockMultiSearchModal] = useState(false);
  const [restockMultiSearchText, setRestockMultiSearchText] = useState("");
  const [activeRestockMultiSearch, setActiveRestockMultiSearch] = useState(false);
  const [restockSortBy, setRestockSortBy] = useState<RestockSortField>("days_of_stock");
  const [restockSortOrder, setRestockSortOrder] = useState<"asc" | "desc">("asc");
  const [curveFilter, setCurveFilter] = useState<Set<"A" | "B" | "C">>(new Set());
  const [urgencyFilter, setUrgencyFilter] = useState<Set<"high" | "medium" | "low">>(new Set());

  const loadRestockRecommendations = async () => {
    setLoadingRestock(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/analytics/restock-recommendations?period=${restockPeriod}&includeInactive=${includeInactive}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setRestockRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error loading restock recommendations:", error);
    } finally {
      setLoadingRestock(false);
    }
  };

  useEffect(() => {
    loadRestockRecommendations();
  }, [restockPeriod, includeInactive]);

  const handleRestockSort = (field: RestockSortField) => {
    if (restockSortBy === field) {
      setRestockSortOrder(restockSortOrder === "asc" ? "desc" : "asc");
    } else {
      setRestockSortBy(field);
      setRestockSortOrder("asc");
    }
  };

  const filteredRestockRecommendations = restockRecommendations
    .filter((rec) => {
      if (activeRestockMultiSearch && restockMultiSearchText.trim()) {
        const skus = restockMultiSearchText.split('\n').map(s => s.trim().toUpperCase()).filter(s => s);
        return skus.some(sku => rec.sku.toUpperCase().includes(sku));
      }
      
      if (restockSearch) {
        const query = restockSearch.toLowerCase();
        const matchesSku = rec.sku.toLowerCase().includes(query);
        const matchesName = rec.name.toLowerCase().includes(query);
        if (!matchesSku && !matchesName) return false;
      }
      
      if (daysFilter === "below" && rec.days_of_stock > daysValue) return false;
      if (daysFilter === "above" && rec.days_of_stock <= daysValue) return false;
      
      if (curveFilter.size > 0 && !curveFilter.has(rec.abc_curve)) return false;
      if (urgencyFilter.size > 0 && !urgencyFilter.has(rec.urgency)) return false;
      
      return true;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      if (restockSortBy === "abc_curve") {
        const curveOrder = { A: 1, B: 2, C: 3 };
        aVal = curveOrder[a.abc_curve];
        bVal = curveOrder[b.abc_curve];
      } else if (restockSortBy === "urgency") {
        const urgencyOrder = { high: 1, medium: 2, low: 3 };
        aVal = urgencyOrder[a.urgency];
        bVal = urgencyOrder[b.urgency];
      } else if (restockSortBy === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (restockSortBy === "sku") {
        aVal = a.sku.toLowerCase();
        bVal = b.sku.toLowerCase();
      } else {
        aVal = a[restockSortBy];
        bVal = b[restockSortBy];
      }
      
      if (restockSortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 lg:p-6">
      {/* Multi-SKU Search Modal */}
      {showRestockMultiSearchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Busca Múltipla por SKU
              </h5>
              <button
                onClick={() => setShowRestockMultiSearchModal(false)}
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
                value={restockMultiSearchText}
                onChange={(e) => setRestockMultiSearchText(e.target.value)}
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
                  setRestockMultiSearchText("");
                  setActiveRestockMultiSearch(false);
                  setShowRestockMultiSearchModal(false);
                }}
              >
                Limpar
              </Button>
              <Button
                onClick={() => {
                  setActiveRestockMultiSearch(true);
                  setRestockSearch("");
                  setShowRestockMultiSearchModal(false);
                }}
              >
                Buscar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Reposição Recomendada
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Produtos classificados por curva ABC e dias de estoque disponível
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
              <Switch
                id="include-inactive"
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
              />
              <Label htmlFor="include-inactive" className="text-sm font-medium cursor-pointer">
                Considerar produtos inativos
              </Label>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(["7D", "15D", "30D", "60D", "90D"] as PeriodFilter[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setRestockPeriod(period)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    restockPeriod === period
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Buscar por SKU ou Título
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Digite SKU ou título..."
                    value={restockSearch}
                    onChange={(e) => {
                      setRestockSearch(e.target.value);
                      setActiveRestockMultiSearch(false);
                    }}
                    className="pl-10"
                    disabled={activeRestockMultiSearch}
                  />
                  {activeRestockMultiSearch && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Badge className="bg-blue-500 text-white text-xs">
                        Multi
                      </Badge>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowRestockMultiSearchModal(true)}
                  title="Busca múltipla por SKU"
                >
                  <AlignJustify className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filtrar por Dias de Estoque
              </label>
              <div className="flex gap-2">
                <select
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(e.target.value as "all" | "below" | "above")}
                  className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos</option>
                  <option value="below">Até</option>
                  <option value="above">Acima de</option>
                </select>
                <Input
                  type="number"
                  min="0"
                  value={daysValue}
                  onChange={(e) => setDaysValue(parseInt(e.target.value) || 0)}
                  disabled={daysFilter === "all"}
                  className="w-24"
                  placeholder="dias"
                />
              </div>
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Curva ABC
              </label>
              <div className="flex gap-2">
                {(["A", "B", "C"] as const).map((curve) => (
                  <button
                    key={curve}
                    onClick={() => {
                      const newSet = new Set(curveFilter);
                      if (newSet.has(curve)) {
                        newSet.delete(curve);
                      } else {
                        newSet.add(curve);
                      }
                      setCurveFilter(newSet);
                    }}
                    className={`flex-1 h-10 rounded-md font-semibold text-sm transition-all ${
                      curveFilter.has(curve)
                        ? curve === "A" 
                          ? "bg-blue-500 text-white shadow-md"
                          : curve === "B"
                          ? "bg-purple-500 text-white shadow-md"
                          : "bg-gray-500 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {curve}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Urgência
              </label>
              <div className="flex gap-2">
                {[
                  { value: "high" as const, label: "Alta", color: "red" },
                  { value: "medium" as const, label: "Média", color: "yellow" },
                  { value: "low" as const, label: "Baixa", color: "green" },
                ].map((urgency) => (
                  <button
                    key={urgency.value}
                    onClick={() => {
                      const newSet = new Set(urgencyFilter);
                      if (newSet.has(urgency.value)) {
                        newSet.delete(urgency.value);
                      } else {
                        newSet.add(urgency.value);
                      }
                      setUrgencyFilter(newSet);
                    }}
                    className={`flex-1 h-10 rounded-md font-medium text-sm transition-all ${
                      urgencyFilter.has(urgency.value)
                        ? urgency.color === "red"
                          ? "bg-red-500 text-white shadow-md"
                          : urgency.color === "yellow"
                          ? "bg-yellow-500 text-white shadow-md"
                          : "bg-green-500 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {urgency.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-1 lg:col-span-1 flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRestockSearch("");
                  setDaysFilter("all");
                  setDaysValue(7);
                  setRestockMultiSearchText("");
                  setActiveRestockMultiSearch(false);
                  setCurveFilter(new Set());
                  setUrgencyFilter(new Set());
                }}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
          
          {(restockSearch || daysFilter !== "all" || curveFilter.size > 0 || urgencyFilter.size > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando <span className="font-semibold text-gray-900 dark:text-white">{filteredRestockRecommendations.length}</span> de {restockRecommendations.length} produtos
                </p>
                {curveFilter.size > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Curva:</span>
                    {Array.from(curveFilter).map(curve => (
                      <Badge key={curve} className={`text-xs ${
                        curve === "A" ? "bg-blue-500" : curve === "B" ? "bg-purple-500" : "bg-gray-500"
                      } text-white`}>
                        {curve}
                      </Badge>
                    ))}
                  </div>
                )}
                {urgencyFilter.size > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Urgência:</span>
                    {Array.from(urgencyFilter).map(urgency => (
                      <Badge key={urgency} className={`text-xs ${
                        urgency === "high" ? "bg-red-500" : urgency === "medium" ? "bg-yellow-500" : "bg-green-500"
                      } text-white`}>
                        {urgency === "high" ? "Alta" : urgency === "medium" ? "Média" : "Baixa"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {loadingRestock ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredRestockRecommendations.length === 0 && restockRecommendations.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 dark:text-white font-medium mb-1">
              Nenhum produto encontrado
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tente ajustar seus filtros de busca
            </p>
          </div>
        ) : restockRecommendations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-900 dark:text-white font-medium mb-1">
              Nenhum produto encontrado
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Importe planilhas de vendas e adicione produtos para ver a análise
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("sku")}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Produto
                        {restockSortBy === "sku" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("abc_curve")}
                        className="flex items-center gap-1 mx-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Curva
                        {restockSortBy === "abc_curve" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("urgency")}
                        className="flex items-center gap-1 mx-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Urgência
                        {restockSortBy === "urgency" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("current_stock")}
                        className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Estoque Atual
                        {restockSortBy === "current_stock" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("days_of_stock")}
                        className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Dias de Estoque
                        {restockSortBy === "days_of_stock" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("avg_daily_sales")}
                        className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Vendas/Dia
                        {restockSortBy === "avg_daily_sales" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("needed_for_target")}
                        className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Necessário ({restockPeriod})
                        {restockSortBy === "needed_for_target" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleRestockSort("shortage")}
                        className="flex items-center gap-1 ml-auto hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                      >
                        Faltam
                        {restockSortBy === "shortage" ? (
                          restockSortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRestockRecommendations.map((rec) => {
                    const stockColorClass = 
                      rec.stock_status === "critical" ? "bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500" :
                      rec.stock_status === "low" ? "bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-500" :
                      rec.stock_status === "medium" ? "bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500" :
                      "bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500";
                    
                    return (
                      <tr key={rec.sku} className={`hover:opacity-90 transition-opacity ${stockColorClass}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                              {rec.image_url ? (
                                <img 
                                  src={rec.image_url} 
                                  alt={rec.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center w-full h-full">
                                  <Image className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {rec.sku}
                                </div>
                                {rec.product_status === "Inativo" && (
                                  <Badge variant="outline" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                    Inativo
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {rec.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Total vendido: {rec.total_units_sold} unidades
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            rec.abc_curve === "A" ? "bg-blue-500 text-white" :
                            rec.abc_curve === "B" ? "bg-purple-500 text-white" :
                            "bg-gray-500 text-white"
                          }`}>
                            {rec.abc_curve}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={`${
                            rec.urgency === "high" ? "bg-red-500 text-white" :
                            rec.urgency === "medium" ? "bg-yellow-500 text-white" :
                            "bg-green-500 text-white"
                          }`}>
                            {rec.urgency === "high" ? "Alta" : rec.urgency === "medium" ? "Média" : "Baixa"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {rec.current_stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-bold ${
                            rec.stock_status === "critical" ? "text-red-600 dark:text-red-400" :
                            rec.stock_status === "low" ? "text-yellow-600 dark:text-yellow-400" :
                            rec.stock_status === "medium" ? "text-orange-600 dark:text-orange-400" :
                            "text-green-600 dark:text-green-400"
                          }`}>
                            {rec.days_of_stock} dias
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {rec.avg_daily_sales}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {rec.needed_for_target}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-semibold ${
                            rec.shortage > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                          }`}>
                            {rec.shortage > 0 ? rec.shortage : "✓"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
