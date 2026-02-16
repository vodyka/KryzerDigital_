import { useState, useEffect } from "react";
import { useOutletContext } from "react-router";
import {
  AlertTriangle,
  TrendingDown,
  Package,
  CheckCircle2,
  Printer,
  Calendar,
  BarChart3,
  Clock,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import ProductImageHover from "@/react-app/components/ProductImageHover";

interface ForecastItem {
  sku: string;
  productName: string;
  productImage: string | null;
  currentStock: number;
  avgDailySales: number;
  last30DaysSales: number;
  quantityNeeded: number;
  abcCurve: "A" | "B" | "C";
  reason: string;
  priorityScore: number;
  isInProduction: boolean;
}

interface ForecastResponse {
  items: ForecastItem[];
  total: number;
  in_production: number;
  latest_data_month: string;
}

export default function SupplierPortalPrevisao() {
  const { supplier } = useOutletContext<{ supplier: any }>();
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "with_tag" | "without_tag">("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showOutOfStockOnly, setShowOutOfStockOnly] = useState(false);

  useEffect(() => {
    loadForecast();
  }, [supplier, filter]);

  // Reset selections when filter changes to prevent ghost selections
  useEffect(() => {
    setSelectedItems(new Set());
  }, [filter, showOutOfStockOnly]);

  const loadForecast = async () => {
    if (!supplier?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("portal_token");
      const response = await fetch(
        `/api/portal/forecast?filter=${filter}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setForecastData(data);
    } catch (error) {
      console.error("Error loading forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkProduction = async () => {
    if (selectedItems.size === 0) {
      alert("Selecione pelo menos um produto");
      return;
    }

    try {
      const token = localStorage.getItem("portal_token");
      const response = await fetch(
        `/api/portal/forecast/mark-production`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ skus: Array.from(selectedItems) }),
        }
      );

      if (response.ok) {
        setSelectedItems(new Set());
        await loadForecast();
        alert("Produtos marcados como em produção!");
      }
    } catch (error) {
      console.error("Error marking production:", error);
      alert("Erro ao marcar produtos");
    }
  };

  const handleUnmarkProduction = async (sku: string) => {
    try {
      const token = localStorage.getItem("portal_token");
      const response = await fetch(
        `/api/portal/forecast/unmark-production`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ skus: [sku] }),
        }
      );

      if (response.ok) {
        await loadForecast();
      }
    } catch (error) {
      console.error("Error unmarking production:", error);
    }
  };

  const handleGeneratePDF = () => {
    const items = filteredItems.filter((item) => selectedItems.has(item.sku));
    
    if (items.length === 0) {
      alert("Selecione pelo menos um produto");
      return;
    }

    // Create printable HTML
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const supplierName = supplier.trade_name || supplier.company_name || supplier.name;
    const today = new Date().toLocaleDateString("pt-BR");

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Lista de Produção - ${supplierName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 210mm;
              margin: 0 auto;
            }
            h1 {
              text-align: center;
              color: #333;
              margin-bottom: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 10px;
              border-bottom: 2px solid #333;
            }
            .info {
              color: #666;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px 8px;
              text-align: left;
              vertical-align: middle;
            }
            th {
              background-color: #f5f5f5;
              font-weight: bold;
            }
            .sku { font-family: monospace; font-weight: bold; }
            .product-image {
              width: 50px;
              height: 50px;
              object-fit: cover;
              border-radius: 4px;
              border: 1px solid #ddd;
            }
            .no-image {
              width: 50px;
              height: 50px;
              background-color: #f5f5f5;
              border: 1px solid #ddd;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              font-size: 10px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Lista de Produção</h1>
            <div class="info">
              <strong>${supplierName}</strong><br>
              Data: ${today} | Total de Produtos: ${items.length}
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 70px;">Imagem</th>
                <th>SKU</th>
                <th>Produto</th>
                <th style="width: 120px; text-align: center;">Quantidade Necessária</th>
              </tr>
            </thead>
            <tbody>
    `;

    items.forEach((item) => {
      const imageCell = item.productImage
        ? `<img src="${item.productImage}" alt="${item.productName}" class="product-image" />`
        : `<div class="no-image">Sem foto</div>`;
      
      html += `
        <tr>
          <td style="text-align: center;">${imageCell}</td>
          <td class="sku">${item.sku}</td>
          <td>${item.productName}</td>
          <td style="text-align: center;"><strong>${item.quantityNeeded}</strong></td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
          
          <div class="footer">
            Produtos ordenados por prioridade de produção
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const toggleItemSelection = (sku: string, event?: React.MouseEvent) => {
    // Prevent row click from triggering if clicking on checkbox
    if (event) {
      event.stopPropagation();
    }
    
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(sku)) {
        newSelected.delete(sku);
      } else {
        newSelected.add(sku);
      }
      return newSelected;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.sku)));
    }
  };

  if (!supplier) {
    return <div className="p-6">Carregando...</div>;
  }

  const items = forecastData?.items || [];
  
  const filteredItems = showOutOfStockOnly
    ? items.filter((item) => item.currentStock === 0)
    : items;

  const outOfStockCount = items.filter((item) => item.currentStock === 0).length;
  const curveACount = items.filter((item) => item.abcCurve === "A").length;
  const curveBCount = items.filter((item) => item.abcCurve === "B").length;
  const curveCCount = items.filter((item) => item.abcCurve === "C").length;

  const formatMonthYear = (monthYear: string) => {
    if (!monthYear) return "";
    const [year, month] = monthYear.split("-");
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Previsão de Produção
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Produtos que precisam ser produzidos com base em vendas e estoque
        </p>
        {forecastData?.latest_data_month && (
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>Dados de vendas: {formatMonthYear(forecastData.latest_data_month)}</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {items.length}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sem Estoque</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {outOfStockCount}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Em Produção</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {forecastData?.in_production || 0}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Curva A/B/C</p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {curveACount}/{curveBCount}/{curveCCount}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filter === "all"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilter("without_tag")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filter === "without_tag"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Sem Tag
                </button>
                <button
                  onClick={() => setFilter("with_tag")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    filter === "with_tag"
                      ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Com Tag
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={showOutOfStockOnly}
                  onCheckedChange={(checked) =>
                    setShowOutOfStockOnly(checked === true)
                  }
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Apenas sem estoque
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={selectedItems.size === 0}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Lista
              </Button>
              <Button
                onClick={handleMarkProduction}
                disabled={selectedItems.size === 0}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar Produção ({selectedItems.size})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Produtos para Produção</CardTitle>
            {filteredItems.length > 0 && (
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedItems.size === filteredItems.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="py-3 px-4 text-left">
                    <Checkbox
                      checked={
                        filteredItems.length > 0 &&
                        selectedItems.size === filteredItems.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Prioridade
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Imagem
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    SKU
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Produto
                  </th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Estoque
                  </th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Qtd. Necessária
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Motivo
                  </th>
                  <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      Carregando previsão...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500 font-medium">
                        {forecastData?.items && forecastData.items.length === 0
                          ? "Nenhum produto precisa de produção no momento"
                          : "Nenhum produto encontrado com os filtros aplicados"}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Dados baseados em produtos com mais de 10 vendas nos últimos 30
                        dias
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => {
                    const getCurveColor = (curve: string) => {
                      switch (curve) {
                        case "A":
                          return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300";
                        case "B":
                          return "bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300";
                        default:
                          return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300";
                      }
                    };

                    const getReasonText = (reason: string) => {
                      if (reason === "sem_estoque") return "Sem estoque";
                      return "Estoque baixo (< 7 dias)";
                    };

                    return (
                      <tr
                        key={item.sku}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedItems.has(item.sku)}
                            onCheckedChange={() => toggleItemSelection(item.sku)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center">
                              <span className="text-xs text-white font-bold">
                                #{index + 1}
                              </span>
                            </div>
                            <Badge className={getCurveColor(item.abcCurve)}>
                              Curva {item.abcCurve}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <ProductImageHover
                            imageUrl={item.productImage}
                            productName={item.productName}
                            size="sm"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {item.sku}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.productName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Média diária: {item.avgDailySales.toFixed(1)} un/dia
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.currentStock === 0 ? (
                            <Badge className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                              0
                            </Badge>
                          ) : (
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.currentStock}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                            {item.quantityNeeded}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            {item.reason === "sem_estoque" ? (
                              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {getReasonText(item.reason)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.isInProduction ? (
                            <button
                              onClick={() => handleUnmarkProduction(item.sku)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/40 transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Em Produção
                            </button>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      {items.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-semibold mb-2">Como funciona a previsão:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>
                    Mostra produtos com <strong>mais de 10 vendas nos últimos 30 dias</strong>
                  </li>
                  <li>
                    <strong>Sem estoque:</strong> produtos zerados que ainda têm demanda
                  </li>
                  <li>
                    <strong>Estoque baixo:</strong> produtos com menos de 7 dias de cobertura
                  </li>
                  <li>
                    <strong>Curva ABC:</strong> A (maior receita) → B (média) → C (menor)
                  </li>
                  <li>
                    <strong>Quantidade necessária:</strong> calculada para 30 dias de estoque
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
