import { useEffect, useState } from "react";
import { TrendingUp, Package, DollarSign, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Badge } from "@/react-app/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  currentMonth: {
    total: number;
    month: string;
  };
  previousMonth: {
    total: number;
    month: string;
  };
  annual: {
    total: number;
    year: number;
  };
  dailyEvolution: Array<{ date: string; total: number }>;
  prevDailyEvolution: Array<{ date: string; total: number }>;
  annualEvolution: Array<{ month: string; total: number }>;
  topProducts: Array<{
    product_name: string;
    sku: string;
    image_url: string | null;
    total_quantity: number;
    total_amount: number;
  }>;
  punctualityRate: number;
}

export default function PortalDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    if (token) {
      loadDashboardData(token);
    }
  }, [selectedMonth]);

  const loadDashboardData = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/portal-dashboard?month=${selectedMonth}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
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

  const formatMonthYear = (dateString: string) => {
    const [year, month] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const changeMonth = (direction: "prev" | "next") => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newMonth = month;
    let newYear = year;

    if (direction === "prev") {
      newMonth = month === 1 ? 12 : month - 1;
      newYear = month === 1 ? year - 1 : year;
    } else {
      newMonth = month === 12 ? 1 : month + 1;
      newYear = month === 12 ? year + 1 : year;
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  // Prepare comparison chart data
  const comparisonChartData = dashboardData
    ? Array.from(
        new Set([
          ...dashboardData.dailyEvolution.map((d) => parseInt(d.date.split("-")[2])),
          ...dashboardData.prevDailyEvolution.map((d) => parseInt(d.date.split("-")[2])),
        ])
      )
        .sort((a, b) => a - b)
        .map((day) => {
          const currentDay = dashboardData.dailyEvolution.find(
            (d) => parseInt(d.date.split("-")[2]) === day
          );
          const prevDay = dashboardData.prevDailyEvolution.find(
            (d) => parseInt(d.date.split("-")[2]) === day
          );

          return {
            day: day.toString(),
            mesAtual: currentDay?.total || 0,
            mesAnterior: prevDay?.total || 0,
          };
        })
    : [];

  // Prepare annual chart data
  const annualChartData = dashboardData
    ? Array.from({ length: 12 }, (_, i) => {
        const monthNum = String(i + 1).padStart(2, "0");
        const monthData = dashboardData.annualEvolution.find((m) => m.month === monthNum);
        return {
          month: new Date(2024, i).toLocaleDateString("pt-BR", { month: "short" }),
          total: monthData?.total || 0,
        };
      })
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Month Selector */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Acompanhe suas vendas e desempenho
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeMonth("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="px-4 py-2 bg-card border border-border rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {formatMonthYear(selectedMonth)}
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => changeMonth("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Compras do Mês</p>
                <p className="text-2xl font-bold text-foreground truncate">
                  {formatCurrency(dashboardData?.currentMonth.total || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Mês Anterior</p>
                <p className="text-2xl font-bold text-foreground truncate">
                  {formatCurrency(dashboardData?.previousMonth.total || 0)}
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
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Total Anual</p>
                <p className="text-2xl font-bold text-foreground truncate">
                  {formatCurrency(dashboardData?.annual.total || 0)}
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
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Pontualidade</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-foreground">
                    {dashboardData?.punctualityRate.toFixed(1) || "0.0"}%
                  </p>
                  <Badge
                    className={
                      (dashboardData?.punctualityRate || 0) >= 90
                        ? "bg-green-600 hover:bg-green-700"
                        : (dashboardData?.punctualityRate || 0) >= 70
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-red-600 hover:bg-red-700"
                    }
                  >
                    {(dashboardData?.punctualityRate || 0) >= 90
                      ? "Excelente"
                      : (dashboardData?.punctualityRate || 0) >= 70
                      ? "Bom"
                      : "Atenção"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução: Mês Atual vs Mês Anterior</CardTitle>
            <p className="text-sm text-muted-foreground">Comparação diária de compras</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="day" 
                  label={{ value: "Dia", position: "insideBottom", offset: -5 }} 
                  className="text-muted-foreground"
                />
                <YAxis className="text-muted-foreground" />
                <Tooltip
                  formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : "R$ 0,00"}
                  labelFormatter={(label) => `Dia ${label}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="mesAtual"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Mês Atual"
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="mesAnterior"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Mês Anterior"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Annual Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Anual</CardTitle>
            <p className="text-sm text-muted-foreground">
              Compras por mês em {dashboardData?.annual.year || new Date().getFullYear()}
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={annualChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip 
                  formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : "R$ 0,00"}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar 
                  dataKey="total" 
                  fill="hsl(var(--chart-1))" 
                  name="Total de Compras" 
                  radius={[8, 8, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Top 10 Produtos Mais Comprados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Produtos mais comprados em {dashboardData?.annual.year || new Date().getFullYear()}
              </p>
            </div>
            <Package className="w-6 h-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground w-12">
                    Imagem
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Produto
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">
                    SKU
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Quantidade
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">
                    Valor Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                  dashboardData.topProducts.map((product, index) => (
                    <tr
                      key={index}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="w-8 h-8 object-cover rounded border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded border border-border flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {product.product_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                        {product.sku}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-foreground">
                        {product.total_quantity.toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-primary">
                        {formatCurrency(product.total_amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Nenhum produto encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
