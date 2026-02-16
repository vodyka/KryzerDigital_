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
  AlertCircle,
  Download,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  ArrowUp,
  ArrowDown,
  AlignJustify,
  Image,
} from "lucide-react";
import { Switch } from "@/react-app/components/ui/switch";
import { Label } from "@/react-app/components/ui/label";
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
import AnalyticsTab from "@/react-app/components/AnalyticsTab";
import PontoEquilibrioTab from "@/react-app/components/PontoEquilibrioTab";

type PeriodFilter = "7D" | "15D" | "30D" | "60D" | "90D" | "3M";
type ActiveTab = "sales" | "restock" | "advanced" | "breakeven";

interface SpreadsheetData {
  sku: string;
  name: string;
  units: number;
  revenue: number;
  avgPrice: number;
  notFound?: boolean;
}

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

interface SlotData {
  slotNumber: 1 | 2 | 3;
  monthLabel: string;
  data: SpreadsheetData[];
  uploadedAt: Date | null;
}

// Helper function outside component to calculate expected months
// Only returns COMPLETE months (months that have already ended)
function getExpectedMonths() {
  const today = new Date();
  const months = [];
  
  // Start from the last complete month (previous month)
  // We always go back 1 month because the current month is not complete yet
  const lastCompleteMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  
  // Get the 3 most recent complete months
  for (let i = 0; i < 3; i++) {
    const date = new Date(lastCompleteMonth.getFullYear(), lastCompleteMonth.getMonth() - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    months.push({
      month,
      year,
      label: `${monthNames[date.getMonth()]}/${year}`,
      slotNumber: (3 - i) as 1 | 2 | 3,
    });
  }
  
  return months;
}

export default function AnalyticsPage() {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30D");
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("sales");
  const [restockRecommendations, setRestockRecommendations] = useState<RestockRecommendation[]>([]);
  const [loadingRestock, setLoadingRestock] = useState(false);
  const [restockPeriod, setRestockPeriod] = useState<PeriodFilter>("30D");
  
  // Restock filters
  const [restockSearch, setRestockSearch] = useState("");
  const [daysFilter, setDaysFilter] = useState<"all" | "below" | "above">("all");
  const [daysValue, setDaysValue] = useState(7);
  const [includeInactive, setIncludeInactive] = useState(false);
  
  // Multi-SKU search for restock
  const [showRestockMultiSearchModal, setShowRestockMultiSearchModal] = useState(false);
  const [restockMultiSearchText, setRestockMultiSearchText] = useState("");
  const [activeRestockMultiSearch, setActiveRestockMultiSearch] = useState(false);
  
  // Restock sorting
  type RestockSortField = "sku" | "name" | "abc_curve" | "current_stock" | "days_of_stock" | "avg_daily_sales" | "needed_for_target" | "shortage" | "urgency";
  const [restockSortBy, setRestockSortBy] = useState<RestockSortField>("days_of_stock");
  const [restockSortOrder, setRestockSortOrder] = useState<"asc" | "desc">("asc");
  const [curveFilter, setCurveFilter] = useState<Set<"A" | "B" | "C">>(new Set());
  const [urgencyFilter, setUrgencyFilter] = useState<Set<"high" | "medium" | "low">>(new Set());
  
  const [slots, setSlots] = useState<SlotData[]>([
    { slotNumber: 1, monthLabel: "Mês 1", data: [], uploadedAt: null },
    { slotNumber: 2, monthLabel: "Mês 2", data: [], uploadedAt: null },
    { slotNumber: 3, monthLabel: "Mês 3", data: [], uploadedAt: null },
  ]);
  const [needsNewUpload, setNeedsNewUpload] = useState(false);

  // Table filtering and sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"revenue" | "units" | "avgPrice">("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Multi-SKU search
  const [showMultiSearchModal, setShowMultiSearchModal] = useState(false);
  const [multiSearchText, setMultiSearchText] = useState("");
  const [activeMultiSearch, setActiveMultiSearch] = useState(false);

  // Fetch filtered data from API based on period
  const [filteredData, setFilteredData] = useState<SpreadsheetData[]>([]);

  const loadProducts = async () => {
    try {
      const response = await fetch(`/api/analytics/products?period=${periodFilter}`);
      const data = await response.json();
      setFilteredData(data.products || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [periodFilter]);

  // Calculate metrics - handle undefined values
  const totalRevenue = filteredData.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalUnits = filteredData.reduce((sum, p) => sum + (p.units || 0), 0);
  const avgTicket = totalUnits > 0 ? totalRevenue / totalUnits : 0;

  // Top 30 products by units - handle undefined values
  const top30Products = [...filteredData]
    .sort((a, b) => (b.units || 0) - (a.units || 0))
    .slice(0, 30);

  // Filter and sort products for table
  const filteredAndSortedProducts = filteredData
    .filter((product) => {
      // Multi-SKU search takes priority
      if (activeMultiSearch && multiSearchText.trim()) {
        const skus = multiSearchText.split('\n').map(s => s.trim().toUpperCase()).filter(s => s);
        return skus.some(sku => product.sku.toUpperCase().includes(sku));
      }
      
      // Regular search
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

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProducts.length / pageSize);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder, pageSize]);

  const handleFileUpload = async (slotNumber: 1 | 2 | 3, file: File) => {
    try {
      // Validate file name
      if (!file.name.startsWith("Sales_by_Variant_")) {
        alert("O nome do arquivo deve começar com 'Sales_by_Variant_'");
        return;
      }

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        alert("A planilha está vazia ou não contém dados");
        return;
      }
      
      // Fetch products from /produtos to get titles
      let productsMap: Record<string, string> = {};
      try {
        const productsResponse = await fetch("/api/products");
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

      // Parse data (skip header row)
      const parsedData: SpreadsheetData[] = [];
      let skippedRows = 0;
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Column indexes (0-based):
        // C(2)=SKU
        // D(3)=Fallback title
        // I(8)=Unidades Vendidas
        // J(9)=Pagamento Recebidos (Revenue)
        
        const sku = row[2]?.toString().trim();
        const fallbackTitle = row[3]?.toString().trim() || "Produto sem nome";
        const units = parseInt(row[8]?.toString().replace(/[^0-9-]/g, "") || "0");
        const revenue = parseFloat(row[9]?.toString().replace(/[^0-9.,-]/g, "").replace(",", ".") || "0");
        
        // Get title from products table, fallback to column D
        const productFound = !!(productsMap[sku || ""]);
        const name = productsMap[sku || ""] || fallbackTitle;
        
        // Calculate average price
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
          skippedRows++;
        }
      }

      if (parsedData.length === 0) {
        alert("Nenhum dado válido encontrado na planilha. Verifique se as colunas estão corretas.");
        return;
      }

      // Extract month from filename (e.g., "Sales_by_Variant_11_2025.xlsx" -> "Nov/2025")
      const fileNameParts = file.name.replace("Sales_by_Variant_", "").replace(".xlsx", "").split("_");
      let monthLabel = `Slot ${slotNumber}`;
      let monthYear = "";
      
      if (fileNameParts.length >= 2) {
        const month = parseInt(fileNameParts[0]);
        const year = fileNameParts[1];
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        if (month >= 1 && month <= 12) {
          monthLabel = `${monthNames[month - 1]}/${year}`;
          // Format as YYYY-MM for database
          monthYear = `${year}-${String(month).padStart(2, '0')}`;
        }
      }
      
      if (!monthYear) {
        alert("Não foi possível extrair mês/ano do nome do arquivo. Use o formato: Sales_by_Variant_MM_AAAA.xlsx");
        return;
      }

      // Send to backend
      const response = await fetch(`/api/analytics/spreadsheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthYear, monthLabel, data: parsedData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload spreadsheet");
      }

      // Reload data
      await loadData();
      await loadProducts();
      
      alert(`Planilha importada com sucesso!\n${parsedData.length} produtos carregados${skippedRows > 0 ? `\n${skippedRows} linhas ignoradas (sem SKU ou unidades)` : ""}`);
      setShowImportModal(false);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Erro ao importar planilha: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const handleRemoveSpreadsheet = async (slotNumber: 1 | 2 | 3) => {
    const slot = slots.find(s => s.slotNumber === slotNumber);
    if (!slot) return;
    
    if (!confirm(`Tem certeza que deseja remover a planilha do ${slot.monthLabel}? Todos os dados deste mês serão excluídos.`)) {
      return;
    }

    try {
      // Calculate monthYear from monthLabel (e.g., "Nov/2025" -> "2025-11")
      const [monthName, year] = slot.monthLabel.split('/');
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const monthIndex = monthNames.indexOf(monthName);
      
      if (monthIndex === -1) {
        alert("Não foi possível identificar o mês para remover.");
        return;
      }
      
      const monthYear = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      
      const response = await fetch(`/api/analytics/spreadsheets/${monthYear}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove spreadsheet");
      }

      await loadData();
      await loadProducts();
      alert("Planilha removida com sucesso!");
    } catch (error) {
      console.error("Error removing spreadsheet:", error);
      alert("Erro ao remover planilha. Tente novamente.");
    }
  };

  const loadData = async () => {
    try {
      const expectedMonths = getExpectedMonths();
      
      // Load slots info
      const slotsResponse = await fetch("/api/analytics/spreadsheets");
      const slotsData = await slotsResponse.json();
      
      if (slotsData.spreadsheets) {
        setSlots(expectedMonths.map((expected) => {
          const dbSlot = slotsData.spreadsheets.find(
            (s: any) => s.slot_number === expected.slotNumber
          );
          return {
            slotNumber: expected.slotNumber,
            monthLabel: expected.label,
            data: [],
            uploadedAt: dbSlot ? new Date(dbSlot.uploaded_at) : null,
          };
        }));
      } else {
        setSlots(expectedMonths.map((expected) => ({
          slotNumber: expected.slotNumber,
          monthLabel: expected.label,
          data: [],
          uploadedAt: null,
        })));
      }

      // Check rotation
      const rotationResponse = await fetch("/api/analytics/check-rotation");
      const rotationData = await rotationResponse.json();
      
      if (rotationData.needsRotation) {
        await fetch("/api/analytics/rotate", { method: "POST" });
        setNeedsNewUpload(true);
        await loadData(); // Reload after rotation
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadRestockRecommendations = async () => {
    setLoadingRestock(true);
    try {
      const response = await fetch(`/api/analytics/restock-recommendations?period=${restockPeriod}&includeInactive=${includeInactive}`);
      const data = await response.json();
      setRestockRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error loading restock recommendations:", error);
    } finally {
      setLoadingRestock(false);
    }
  };

  useEffect(() => {
    if (activeTab === "restock") {
      loadRestockRecommendations();
    }
  }, [activeTab, restockPeriod, includeInactive]);

  // Handle restock column sort
  const handleRestockSort = (field: RestockSortField) => {
    if (restockSortBy === field) {
      // Toggle order if clicking same column
      setRestockSortOrder(restockSortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setRestockSortBy(field);
      setRestockSortOrder("asc");
    }
  };

  // Filter and sort restock recommendations
  const filteredRestockRecommendations = restockRecommendations
    .filter((rec) => {
      // Multi-SKU search takes priority
      if (activeRestockMultiSearch && restockMultiSearchText.trim()) {
        const skus = restockMultiSearchText.split('\n').map(s => s.trim().toUpperCase()).filter(s => s);
        return skus.some(sku => rec.sku.toUpperCase().includes(sku));
      }
      
      // Search filter (SKU or name)
      if (restockSearch) {
        const query = restockSearch.toLowerCase();
        const matchesSku = rec.sku.toLowerCase().includes(query);
        const matchesName = rec.name.toLowerCase().includes(query);
        if (!matchesSku && !matchesName) return false;
      }
      
      // Days filter
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
        // Sort A > B > C
        const curveOrder = { A: 1, B: 2, C: 3 };
        aVal = curveOrder[a.abc_curve];
        bVal = curveOrder[b.abc_curve];
      } else if (restockSortBy === "urgency") {
        // Sort High > Medium > Low
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
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Multi-SKU Search Modal - Sales Tab */}
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
                  setSearchQuery(""); // Clear regular search
                  setShowMultiSearchModal(false);
                }}
              >
                Buscar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-SKU Search Modal - Restock Tab */}
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
                  setRestockSearch(""); // Clear regular search
                  setShowRestockMultiSearchModal(false);
                }}
              >
                Buscar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                Importar Planilhas de Vendas
              </h5>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {needsNewUpload && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <p className="font-semibold mb-1">Atenção: Nova planilha necessária</p>
                    <p>O sistema removeu automaticamente a planilha mais antiga. Por favor, anexe a planilha do mês mais recente no Slot 3.</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {slots.map((slot) => (
                  <div
                    key={slot.slotNumber}
                    className={`border rounded-lg p-4 ${
                      needsNewUpload && slot.slotNumber === 3
                        ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h6 className="font-semibold text-gray-900 dark:text-white">
                          Slot {slot.slotNumber}: {slot.monthLabel}
                        </h6>
                        {slot.uploadedAt && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Enviado em: {slot.uploadedAt.toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {needsNewUpload && slot.slotNumber === 3 && (
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-1">
                            ⚠ Upload necessário
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {slot.uploadedAt && (
                          <>
                            <Badge className="bg-green-500 text-white">
                              Carregado
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveSpreadsheet(slot.slotNumber)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <Input
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(slot.slotNumber, e.target.files[0]);
                          e.target.value = ""; // Reset input
                        }
                      }}
                      className="w-full"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <strong>Formato esperado:</strong> Sales_by_Variant_MM_AAAA.xlsx
                      <br />
                      <strong>Colunas:</strong> C=SKU, D=Título, I=Unidades Vendidas, J=Pagamento Recebidos
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-semibold mb-2">Como funciona o sistema de slots:</p>
                    <p className="font-semibold mb-2 text-xs">Estrutura da Planilha (Obrigatório):</p>
                    <ul className="space-y-1 text-xs mb-3 ml-4">
                      <li>• <strong>Coluna C:</strong> SKU do produto (ex: 504GB02)</li>
                      <li>• <strong>Coluna D:</strong> Título do produto (usado se SKU não for encontrado em /produtos)</li>
                      <li>• <strong>Coluna I:</strong> Unidades Vendidas (quantidade numérica)</li>
                      <li>• <strong>Coluna J:</strong> Pagamento Recebidos (valor em R$)</li>
                      <li>• O <strong>título do produto</strong> será buscado automaticamente na aba /produtos usando o SKU</li>
                      <li>• Se não encontrado, usa a <strong>Coluna D</strong> e marca a linha em vermelho</li>
                      <li>• O <strong>preço médio</strong> será calculado automaticamente (Receita ÷ Unidades)</li>
                    </ul>
                    
                    <p className="font-semibold mb-2 text-xs">Sistema de Slots:</p>
                    <ul className="space-y-1 text-xs mb-3 ml-4">
                      <li>• <strong>Slot 1 (Mês mais antigo):</strong> Dados usados para análise de 90 dias e 3 meses</li>
                      <li>• <strong>Slot 2 (Mês intermediário):</strong> Dados usados para análise de 60 dias</li>
                      <li>• <strong>Slot 3 (Mês mais recente):</strong> Dados usados para análise de 30 dias</li>
                      <li>• <strong>Rotação automática:</strong> Todo dia 1º do mês às 23:59, o Slot 1 é removido automaticamente e os slots são reorganizados (Slot 2 → Slot 1, Slot 3 → Slot 2)</li>
                      <li>• <strong>Agregação inteligente:</strong> SKUs duplicados na mesma planilha ou entre planilhas são agrupados automaticamente e suas unidades somadas</li>
                      <li>• <strong>Formato do arquivo:</strong> Use o padrão Sales_by_Variant_MM_AAAA.xlsx (ex: Sales_by_Variant_11_2025.xlsx)</li>
                    </ul>
                    <p className="mt-3 text-xs font-semibold">Exemplo prático:</p>
                    <p className="text-xs mt-1">Atualmente, você deve importar:</p>
                    <ul className="space-y-0.5 text-xs mt-1 ml-4">
                      {getExpectedMonths().map((month) => (
                        <li key={month.slotNumber}>
                          → Slot {month.slotNumber}: Sales_by_Variant_{String(month.month).padStart(2, '0')}_{month.year}.xlsx ({month.label})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="p-4 lg:p-6 bg-[#f7f8fa] min-h-screen">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex gap-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab("sales")}
                className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "sales"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Vendas por Variante
              </button>
              <button
                onClick={() => setActiveTab("restock")}
                className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "restock"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                Reposição Recomendada
              </button>
              <button
                onClick={() => setActiveTab("advanced")}
                className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "advanced"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Analytics Avançado
              </button>
              <button
                onClick={() => setActiveTab("breakeven")}
                className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === "breakeven"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <DollarSign className="w-4 h-4" />
                Ponto de Equilíbrio
              </button>
            </div>
          </div>

          {/* Sales Tab Content */}
          {activeTab === "sales" && (
            <div>
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Analytics Dashboard Variant
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Analiser de vendas por variação do UpSeller de 30, 60 e 90D
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {/* Period Filter Buttons */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(["30D", "60D", "90D", "3M"] as PeriodFilter[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setPeriodFilter(period)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      periodFilter === period
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
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

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              title="Anúncios Vendidos"
              value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={`Período: ${periodFilter}`}
              icon={DollarSign}
              iconColor="text-green-600 dark:text-green-400"
              iconBgColor="bg-green-100 dark:bg-green-900/20"
              trend={{
                value: periodFilter,
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Product List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Lista de Produtos Importados</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Buscar por título ou SKU..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setActiveMultiSearch(false); // Disable multi-search when typing
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
                                {product.notFound && (
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

                {/* Pagination */}
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
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Top 30 Produtos</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Por unidades vendidas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 lg:p-4">
                {top30Products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 font-medium">Aguardando dados</p>
                    <p className="text-sm text-gray-400 mt-1 text-center">
                      Importe planilhas para ver o ranking
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[800px] overflow-y-auto">
                    {top30Products.map((product, index) => {
                      const medalColors = [
                        "from-yellow-400 to-yellow-600", // 1st - Gold
                        "from-gray-300 to-gray-500", // 2nd - Silver
                        "from-orange-400 to-orange-600", // 3rd - Bronze
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
          )}

          {/* Restock Tab Content */}
          {activeTab === "restock" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Análise de Estoque e Reposição
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
                            setActiveRestockMultiSearch(false); // Disable multi-search when typing
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
          )}

          {/* Advanced Analytics Tab Content */}
          {activeTab === "advanced" && <AnalyticsTab />}

          {/* Ponto de Equilibrio Tab Content */}
          {activeTab === "breakeven" && <PontoEquilibrioTab />}
      </div>
    </div>
  );
}
