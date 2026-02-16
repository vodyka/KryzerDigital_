import { useEffect, useState } from "react";
import {
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  Award,
  PieChart,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const CURVE_COLORS: { [key: string]: string } = {
  A: COLORS.success,
  B: COLORS.warning,
  C: COLORS.danger,
};

const ROTATION_COLORS: { [key: string]: string } = {
  Alta: COLORS.success,
  Média: COLORS.primary,
  Baixa: COLORS.warning,
  Crítica: COLORS.danger,
};

export default function AnalyticsTab() {
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [restockRecommendations, setRestockRecommendations] = useState<any[]>([]);
  const [supplierPerformance, setSupplierPerformance] = useState<any[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [inventoryHealth, setInventoryHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "trends" | "restock" | "suppliers" | "costs" | "health"
  >("trends");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [trendsRes, restockRes, suppliersRes, costsRes, healthRes] =
        await Promise.all([
          fetch("/api/purchase-order-v3/analytics/monthly-trends"),
          fetch("/api/purchase-order-v3/analytics/restock-recommendations"),
          fetch("/api/purchase-order-v3/analytics/supplier-performance"),
          fetch("/api/purchase-order-v3/analytics/cost-analysis"),
          fetch("/api/purchase-order-v3/analytics/inventory-health"),
        ]);

      const [trends, restock, suppliers, costs, health] = await Promise.all([
        trendsRes.json(),
        restockRes.json(),
        suppliersRes.json(),
        costsRes.json(),
        healthRes.json(),
      ]);

      setMonthlyTrends(trends.trends || []);
      setRestockRecommendations(restock.recommendations || []);
      setSupplierPerformance(suppliers.suppliers || []);
      setCostAnalysis(costs);
      setInventoryHealth(health);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat("pt-BR", {
      month: "short",
      year: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("trends")}
            className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "trends"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Tendências Mensais
          </button>
          <button
            onClick={() => setActiveTab("restock")}
            className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "restock"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Reposição Recomendada
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "suppliers"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Award className="w-4 h-4" />
            Performance de Fornecedores
          </button>
          <button
            onClick={() => setActiveTab("costs")}
            className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "costs"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <PieChart className="w-4 h-4" />
            Análise de Custos
          </button>
          <button
            onClick={() => setActiveTab("health")}
            className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === "health"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            <Activity className="w-4 h-4" />
            Saúde do Estoque
          </button>
        </div>
      </div>

      {/* Monthly Trends Tab */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Tendências de Compras - Últimos 6 Meses
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Acompanhe a evolução de pedidos e gastos ao longo do tempo
            </p>
          </div>

          {monthlyTrends.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Dados insuficientes para gerar tendências
              </p>
            </div>
          ) : (
            <>
              {/* Spending Trend Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Gastos Mensais
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      stroke="#9ca3af"
                    />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      labelFormatter={(label: any) => formatMonth(label)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total_spent"
                      stroke={COLORS.primary}
                      name="Total Gasto"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_order_value"
                      stroke={COLORS.success}
                      name="Valor Médio do Pedido"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Order Count Trend Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Volume de Pedidos
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      stroke="#9ca3af"
                    />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip labelFormatter={(label: any) => formatMonth(label)} />
                    <Legend />
                    <Bar
                      dataKey="order_count"
                      fill={COLORS.primary}
                      name="Número de Pedidos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Restock Recommendations Tab */}
      {activeTab === "restock" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Produtos que Precisam de Reposição
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Produtos abaixo do estoque mínimo de 30 dias, ordenados por urgência
            </p>
          </div>

          {restockRecommendations.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <Package className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-900 dark:text-white font-medium mb-1">
                Todos os produtos estão com estoque adequado!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nenhuma reposição urgente necessária no momento
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Estoque
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Faltam
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Qtde Recomendada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Dias até Esgotamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Custo Estimado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Urgência
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {restockRecommendations.map((rec: any) => (
                      <tr key={rec.sku} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {rec.product_image_url && (
                              <img
                                src={rec.product_image_url}
                                alt={rec.title}
                                className="w-10 h-10 object-cover rounded border border-gray-300 dark:border-gray-600"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {rec.sku}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {rec.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {rec.current_stock}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Mín: {rec.min_stock_30d}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-red-600 dark:text-red-400">
                            {rec.shortage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {rec.recommended_order_qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {rec.days_until_stockout} dias
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(parseFloat(rec.estimated_cost))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              rec.urgency === "high"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : rec.urgency === "medium"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            }`}
                          >
                            {rec.urgency === "high"
                              ? "Alta"
                              : rec.urgency === "medium"
                              ? "Média"
                              : "Baixa"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Supplier Performance Tab */}
      {activeTab === "suppliers" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Performance de Fornecedores
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Avaliação de fornecedores com base em pedidos e taxa de conclusão
            </p>
          </div>

          {supplierPerformance.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                Nenhum fornecedor com pedidos registrados
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {supplierPerformance.map((supplier: any) => (
                <div
                  key={supplier.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {supplier.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {supplier.products_supplied} produtos fornecidos
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full ${
                        supplier.performance_rating === "excellent"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : supplier.performance_rating === "good"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : supplier.performance_rating === "fair"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {supplier.performance_rating === "excellent"
                        ? "Excelente"
                        : supplier.performance_rating === "good"
                        ? "Bom"
                        : supplier.performance_rating === "fair"
                        ? "Regular"
                        : "Ruim"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Total de Pedidos
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {supplier.total_orders}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Total Gasto
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(supplier.total_spent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Valor Médio
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(supplier.avg_order_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Taxa de Conclusão
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {supplier.completion_rate}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        {supplier.completed_orders}
                      </span>{" "}
                      <span className="text-green-600 dark:text-green-400">
                        Completos
                      </span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {supplier.production_orders}
                      </span>{" "}
                      <span className="text-blue-600 dark:text-blue-400">
                        Em Produção
                      </span>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                      <span className="text-yellow-700 dark:text-yellow-300 font-medium">
                        {supplier.pending_orders}
                      </span>{" "}
                      <span className="text-yellow-600 dark:text-yellow-400">
                        Pendentes
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cost Analysis Tab */}
      {activeTab === "costs" && costAnalysis && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Análise de Custos - Últimos 3 Meses
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Distribuição de gastos por categoria e produtos top
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By ABC Curve */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                Gastos por Curva ABC
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={costAnalysis.byCurve}
                    dataKey="total_spent"
                    nameKey="curve"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry: any) =>
                      `${entry.curve}: ${formatCurrency(entry.total_spent)}`
                    }
                  >
                    {costAnalysis.byCurve.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CURVE_COLORS[entry.curve] || COLORS.primary}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </RechartsPie>
              </ResponsiveContainer>
            </div>

            {/* By Rotation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                Gastos por Rotatividade
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costAnalysis.byRotation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rotation" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="total_spent" name="Total Gasto">
                    {costAnalysis.byRotation.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ROTATION_COLORS[entry.rotation] || COLORS.primary}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
              Top 20 Produtos por Gasto
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Curva
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Rotatividade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Pedidos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Unidades
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Total Gasto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {costAnalysis.topProducts.map((product: any) => (
                    <tr key={product.sku}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {product.product_image_url && (
                            <img
                              src={product.product_image_url}
                              alt={product.title}
                              className="w-8 h-8 object-cover rounded"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.sku}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {product.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            product.curve === "A"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : product.curve === "B"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {product.curve}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {product.rotation}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {product.order_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {product.total_units}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(product.total_spent)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Health Tab */}
      {activeTab === "health" && inventoryHealth && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Saúde do Estoque
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visão geral da distribuição e status do catálogo de produtos
            </p>
          </div>

          {/* Overall Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total de Produtos
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {inventoryHealth.overallMetrics.total_products}
                  </p>
                </div>
                <Package className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Produtos Ativos
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {inventoryHealth.overallMetrics.active_products}
                  </p>
                </div>
                <Activity className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sem Vendas
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {inventoryHealth.overallMetrics.no_sales_products}
                  </p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Custos Pendentes
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {inventoryHealth.overallMetrics.pending_cost_count}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rotation Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                Distribuição por Rotatividade
              </h4>
              <div className="space-y-3">
                {inventoryHealth.rotationBreakdown.map((item: any) => (
                  <div key={item.rotation} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            ROTATION_COLORS[item.rotation] || COLORS.primary,
                        }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.rotation}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count} produtos ({item.in_stock} em estoque,{" "}
                      {item.out_of_stock} esgotados)
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Curve Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                Distribuição por Curva ABC
              </h4>
              <div className="space-y-3">
                {inventoryHealth.curveBreakdown.map((item: any) => (
                  <div key={item.curve} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: CURVE_COLORS[item.curve] || COLORS.primary,
                        }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Curva {item.curve}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.count} produtos ({item.pending_cost_count} com custo
                      pendente)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
