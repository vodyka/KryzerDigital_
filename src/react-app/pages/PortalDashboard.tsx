import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, LogOut, TrendingUp, Package, DollarSign, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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
    total_quantity: number;
    total_amount: number;
  }>;
  punctualityRate: number;
}

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    const supplierId = localStorage.getItem("supplier_id");

    if (!token || !supplierId) {
      navigate("/portal");
      return;
    }

    // Verify token and load supplier data
    fetch(`/api/portal/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Invalid token");
        }
        return res.json();
      })
      .then((data) => {
        setSupplier(data.supplier);
        loadDashboardData(token);
      })
      .catch(() => {
        localStorage.removeItem("portal_token");
        localStorage.removeItem("supplier_id");
        navigate("/portal");
      });
  }, [navigate]);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    if (token && supplier) {
      loadDashboardData(token);
    }
  }, [selectedMonth]);

  const loadDashboardData = async (token: string) => {
    try {
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

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("supplier_id");
    navigate("/portal");
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Portal do Fornecedor
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {supplier?.person_type === "fisica"
                    ? supplier?.name
                    : supplier?.trade_name || supplier?.company_name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">ID: {supplier?.portal_id}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Selector */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => changeMonth("prev")}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Compras do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(dashboardData?.currentMonth.total || 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatMonthYear(dashboardData?.currentMonth.month || selectedMonth)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Mês Anterior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(dashboardData?.previousMonth.total || 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatMonthYear(dashboardData?.previousMonth.month || "")}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Anual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(dashboardData?.annual.total || 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {dashboardData?.annual.year || new Date().getFullYear()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Taxa de Pontualidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardData?.punctualityRate.toFixed(1) || "0.0"}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pagamentos no prazo</p>
                </div>
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
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Evolução: Mês Atual vs Mês Anterior
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">Comparação diária de compras</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: "Dia", position: "insideBottom", offset: -5 }} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : "R$ 0,00"}
                    labelFormatter={(label) => `Dia ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="mesAtual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Mês Atual"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mesAnterior"
                    stroke="#94a3b8"
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
              <CardTitle className="text-lg font-semibold">Evolução Anual</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Compras por mês em {dashboardData?.annual.year || new Date().getFullYear()}
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={annualChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : "R$ 0,00"} />
                  <Bar dataKey="total" fill="#3b82f6" name="Total de Compras" radius={[8, 8, 0, 0]} />
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
                <CardTitle className="text-lg font-semibold">Top 10 Produtos Mais Comprados</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Produtos mais comprados em {dashboardData?.annual.year || new Date().getFullYear()}
                </p>
              </div>
              <Package className="w-6 h-6 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      #
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Produto
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      SKU
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Quantidade
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Valor Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.topProducts && dashboardData.topProducts.length > 0 ? (
                    dashboardData.topProducts.map((product, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {product.product_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {product.sku}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {product.total_quantity.toLocaleString("pt-BR")}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(product.total_amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
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
    </div>
  );
}
