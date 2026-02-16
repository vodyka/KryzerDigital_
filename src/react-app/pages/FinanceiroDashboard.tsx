import { useState, useEffect } from "react";
import {
  TrendingUp,
  Wallet,
  CircleAlert,
  Info,
  Landmark,
  ArrowLeftRight,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Input } from "@/react-app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";

interface DashboardData {
  totalRevenue: number;
  totalExpenses: number;
  balance: number;
  upcomingPaymentsCount: number;
  upcomingReceiptsCount: number;
  upcomingPayments: any[];
  upcomingReceipts: any[];
}

export default function FinanceiroDashboardPage() {
  const [userName, setUserName] = useState("Usuário");
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filter states
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);
  
  // Projection data
  const [currentBalance, setCurrentBalance] = useState(0);
  const [projectedBalance, setProjectedBalance] = useState(0);
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [totalPayables, setTotalPayables] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || "Usuário");
      } catch (e) {
        console.error("Erro ao carregar dados do usuário", e);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchBankAccounts();
    fetchCategories();
    fetchProjectionData();
    fetchChartData();
  }, [selectedBank, selectedPeriod, selectedCategory, selectedPaymentMethod, selectedDateFilter, customStartDate, customEndDate]);

  const fetchProjectionData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBank !== "all") {
        params.append("bank_id", selectedBank);
      }
      if (selectedCategory !== "all") {
        params.append("category_id", selectedCategory);
      }
      if (selectedPaymentMethod !== "all") {
        params.append("payment_method", selectedPaymentMethod);
      }
      params.append("days", selectedPeriod);
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/financeiro-projection?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentBalance(data.currentBalance || 0);
        setProjectedBalance(data.projectedBalance || 0);
        setTotalReceivables(data.totalReceivables || 0);
        setTotalPayables(data.totalPayables || 0);
      }
    } catch (error) {
      console.error("Error fetching projection data:", error);
    }
  };

  const fetchChartData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBank !== "all") {
        params.append("bank_id", selectedBank);
      }
      if (selectedCategory !== "all") {
        params.append("category_id", selectedCategory);
      }
      if (selectedPaymentMethod !== "all") {
        params.append("payment_method", selectedPaymentMethod);
      }
      params.append("days", selectedPeriod);
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/financeiro-projection-chart?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        setChartData(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bank-accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const clearFilters = () => {
    setSelectedBank("all");
    setSelectedCategory("all");
    setSelectedPaymentMethod("all");
    setSelectedType("all");
    setSelectedDateFilter("month");
    setCustomStartDate("");
    setCustomEndDate("");
    setShowCustomDateInputs(false);
  };

  const handleDateFilterChange = (value: string) => {
    setSelectedDateFilter(value);
    setShowCustomDateInputs(value === "custom");
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedBank !== "all") {
        params.append("bank_id", selectedBank);
      }
      if (selectedCategory !== "all") {
        params.append("category_id", selectedCategory);
      }
      if (selectedPaymentMethod !== "all") {
        params.append("payment_method", selectedPaymentMethod);
      }
      if (selectedDateFilter !== "all") {
        params.append("date_filter", selectedDateFilter);
      }
      if (selectedDateFilter === "custom" && customStartDate && customEndDate) {
        params.append("start_date", customStartDate);
        params.append("end_date", customEndDate);
      }
      
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/financeiro-dashboard?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <div className="p-4 lg:p-6 bg-[#f7f8fa] min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Olá, {userName}! 👋</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Veja como está o seu financeiro</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Select value={selectedDateFilter} onValueChange={handleDateFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="lastMonth">Mês passado</SelectItem>
              <SelectItem value="last30">Últimos 30 dias</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Landmark className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {bankAccounts.map((bank) => (
                <SelectItem key={bank.id} value={bank.id.toString()}>
                  {bank.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center gap-2">
                    {category.type === "expense" ? (
                      <ArrowDown className="h-3 w-3 text-red-500" />
                    ) : (
                      <ArrowUp className="h-3 w-3 text-green-500" />
                    )}
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Wallet className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Forma pgto." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas formas</SelectItem>
              <SelectItem value="pix">Pix</SelectItem>
              <SelectItem value="credito">Cartão de Crédito</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
              <SelectItem value="deposito">Depósito</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowLeftRight className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="lancamento">Lançamento</SelectItem>
              <SelectItem value="transferencia">Transferências</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={clearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        </div>
        
        {showCustomDateInputs && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-muted-foreground">De:</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[140px] sm:w-[160px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs sm:text-sm text-muted-foreground">Até:</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[140px] sm:w-[160px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 order-2 sm:order-1">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] sm:text-sm font-medium text-muted-foreground line-clamp-1">
                    Receita do período
                  </p>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                </div>
                <p className="text-base sm:text-2xl font-bold tracking-tight break-words">
                  {loading ? "..." : formatCurrency(dashboardData?.totalRevenue || 0)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {loading ? "..." : formatCurrency(dashboardData?.totalRevenue || 0)} confirmado
                </p>
              </div>
              <div className="rounded-lg p-1.5 sm:p-2 shrink-0 self-end sm:self-start order-1 sm:order-2 bg-success/10 text-success">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 order-2 sm:order-1">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] sm:text-sm font-medium text-muted-foreground line-clamp-1">
                    Despesa do período
                  </p>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                </div>
                <p className="text-base sm:text-2xl font-bold tracking-tight break-words">
                  {loading ? "..." : formatCurrency(dashboardData?.totalExpenses || 0)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {loading ? "..." : formatCurrency(dashboardData?.totalExpenses || 0)} confirmado
                </p>
              </div>
              <div className="rounded-lg p-1.5 sm:p-2 shrink-0 self-end sm:self-start order-1 sm:order-2 bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 rotate-180" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 order-2 sm:order-1">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] sm:text-sm font-medium text-muted-foreground line-clamp-1">
                    Saldo do período (c/ inicial)
                  </p>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                </div>
                <p className="text-base sm:text-2xl font-bold tracking-tight break-words">
                  {loading ? "..." : formatCurrency(dashboardData?.balance || 0)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {!loading && dashboardData && dashboardData.balance >= 0 ? "Saldo positivo" : "Saldo negativo"}
                </p>
              </div>
              <div className="rounded-lg p-1.5 sm:p-2 shrink-0 self-end sm:self-start order-1 sm:order-2 bg-secondary/10 text-secondary">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 order-2 sm:order-1">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] sm:text-sm font-medium text-muted-foreground line-clamp-1">
                    A vencer (7 dias)
                  </p>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                </div>
                <p className="text-base sm:text-2xl font-bold tracking-tight break-words">
                  {loading ? "..." : `${dashboardData?.upcomingPaymentsCount || 0} pagam.`}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {loading ? "..." : `${dashboardData?.upcomingReceiptsCount || 0} recebim.`}
                </p>
              </div>
              <div className="rounded-lg p-1.5 sm:p-2 shrink-0 self-end sm:self-start order-1 sm:order-2 bg-muted text-foreground">
                <CircleAlert className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projeção de Saldo */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Projeção de Saldo
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={selectedPeriod === "30" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("30")}
                className="text-xs px-2 sm:px-3"
              >
                30 dias
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "60" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("60")}
                className="text-xs px-2 sm:px-3"
              >
                60 dias
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "90" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("90")}
                className="text-xs px-2 sm:px-3"
              >
                90 dias
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => {
                    return new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(value);
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("pt-BR");
                  }}
                  formatter={(value: number | undefined) => {
                    if (value === undefined) return "R$ 0,00";
                    return new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(value);
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: "12px" }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="entradas" 
                  name="Entradas previstas"
                  stroke="rgb(22, 163, 74)" 
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="saidas" 
                  name="Saídas previstas"
                  stroke="rgb(239, 68, 68)" 
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  name="Saldo acumulado"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Saldo Atual</p>
              <p className="text-xs sm:text-sm font-semibold">{formatCurrency(currentBalance)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Saldo em {selectedPeriod} dias</p>
              <p className={`text-xs sm:text-sm font-semibold ${projectedBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(projectedBalance)}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg text-center" style={{ backgroundColor: 'rgb(22 162 73 / 0.1)' }}>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Entradas Previstas</p>
              <p className="text-xs sm:text-sm font-semibold text-success">+{formatCurrency(totalReceivables)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-destructive/10 rounded-lg text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Saídas Previstas</p>
              <p className="text-xs sm:text-sm font-semibold text-destructive">-{formatCurrency(totalPayables)}</p>
            </div>
          </div>

          <div className="text-center text-xs sm:text-sm text-muted-foreground pt-2 border-t">
            Variação no período: <span className={`font-medium ${(totalReceivables - totalPayables) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {(totalReceivables - totalPayables) >= 0 ? '+' : ''}{formatCurrency(totalReceivables - totalPayables)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Recebimentos e Pagamentos */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b px-3 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Próximos recebimentos</CardTitle>
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                {loading ? "..." : `${dashboardData?.upcomingReceiptsCount || 0} pendentes`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-3 sm:px-5 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : dashboardData && dashboardData.upcomingReceipts.length > 0 ? (
              <div className="divide-y">
                {dashboardData.upcomingReceipts.map((receipt: any, index: number) => (
                  <div key={index} className="px-3 sm:px-5 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{receipt.customer_name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatDate(receipt.receipt_date)}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-success">
                      {formatCurrency(receipt.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 sm:px-5 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                Nenhum recebimento previsto
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b px-3 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base">Próximos pagamentos</CardTitle>
              <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                {loading ? "..." : `${dashboardData?.upcomingPaymentsCount || 0} pendentes`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="px-3 sm:px-5 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : dashboardData && dashboardData.upcomingPayments.length > 0 ? (
              <div className="divide-y">
                {dashboardData.upcomingPayments.map((payment: any, index: number) => (
                  <div key={index} className="px-3 sm:px-5 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{payment.company_name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatDate(payment.due_date)}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-destructive">
                      {formatCurrency(Math.abs(payment.amount))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 sm:px-5 py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                Nenhum pagamento previsto
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
