import { useState, useMemo } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import {
  TrendingUp,
  Wallet,
  CircleAlert,
  Info,
  Landmark,
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
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { formatCurrency, formatDateBR, getBrazilToday, parseDateBrazil } from "@/react-app/lib/finance-utils";
import { CATEGORY_GROUPS } from "@/react-app/lib/finance-types";
import { MigrationBanner } from "@/react-app/components/MigrationBanner";

export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const { 
    payables, 
    receivables, 
    payments, 
    receipts, 
    banks, 
    categories,
    companies,
    activeCompanyId,
    getBankBalance,
  } = useFinanceData();

  const [selectedPeriod, setSelectedPeriod] = useState("30");
  
  // Filter states
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);

  const userName = user?.name || user?.email?.split("@")[0] || "Usuário";
  const activeCompany = companies.find(c => c.id === activeCompanyId);
  const companyName = activeCompany?.name || "sua empresa";

  // Filter payables and receivables by active company
  const companyPayables = useMemo(() => 
    payables.filter(p => p.companyId === activeCompanyId),
    [payables, activeCompanyId]
  );

  const companyReceivables = useMemo(() => 
    receivables.filter(r => r.companyId === activeCompanyId),
    [receivables, activeCompanyId]
  );

  const companyPayments = useMemo(() => 
    payments.filter(p => p.companyId === activeCompanyId),
    [payments, activeCompanyId]
  );

  const companyReceipts = useMemo(() => 
    receipts.filter(r => r.companyId === activeCompanyId),
    [receipts, activeCompanyId]
  );

  const companyBanks = useMemo(() => 
    banks.filter(b => b.companyId === activeCompanyId),
    [banks, activeCompanyId]
  );

  // Get date range based on filter
  const getDateRange = () => {
    const today = getBrazilToday();
    
    if (selectedDateFilter === "custom" && customStartDate && customEndDate) {
      return {
        start: parseDateBrazil(customStartDate),
        end: parseDateBrazil(customEndDate),
      };
    }
    
    const start = new Date(today);
    const end = new Date(today);
    
    switch (selectedDateFilter) {
      case "month":
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case "lastMonth":
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        break;
      case "last30":
        start.setDate(start.getDate() - 30);
        break;
      case "year":
        start.setMonth(0);
        start.setDate(1);
        end.setMonth(11);
        end.setDate(31);
        break;
      case "all":
        start.setFullYear(2000);
        end.setFullYear(2100);
        break;
    }
    
    return { start, end };
  };

  // Apply filters to data
  const filteredData = useMemo(() => {
    const { start, end } = getDateRange();
    
    const filterItem = (item: any, dateField: string) => {
      if (selectedBank !== "all" && item.bankId !== selectedBank) return false;
      if (selectedCategory !== "all" && item.categoryId !== selectedCategory) return false;
      if (selectedPaymentMethod !== "all" && item.paymentMethod !== selectedPaymentMethod) return false;
      
      const itemDate = new Date(item[dateField]);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate >= start && itemDate <= end;
    };

    return {
      payables: companyPayables.filter(p => filterItem(p, 'dueDate')),
      receivables: companyReceivables.filter(r => filterItem(r, 'receiptDate')),
      payments: companyPayments.filter(p => filterItem(p, 'date')),
      receipts: companyReceipts.filter(r => filterItem(r, 'date')),
    };
  }, [companyPayables, companyReceivables, companyPayments, companyReceipts, selectedBank, selectedCategory, selectedPaymentMethod, selectedDateFilter, customStartDate, customEndDate]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = filteredData.receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = filteredData.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalRevenue - totalExpenses;

    // Get items due in next 7 days
    const today = getBrazilToday();
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    const upcomingPayments = companyPayables.filter(p => {
      if (p.status !== 'pendente') return false;
      const dueDate = parseDateBrazil(p.dueDate);
      return dueDate >= today && dueDate <= in7Days;
    });

    const upcomingReceipts = companyReceivables.filter(r => {
      if (r.status !== 'pendente') return false;
      const receiptDate = parseDateBrazil(r.receiptDate);
      return receiptDate >= today && receiptDate <= in7Days;
    });

    return {
      totalRevenue,
      totalExpenses,
      balance,
      upcomingPaymentsCount: upcomingPayments.length,
      upcomingReceiptsCount: upcomingReceipts.length,
      upcomingPayments: upcomingPayments.slice(0, 5),
      upcomingReceipts: upcomingReceipts.slice(0, 5),
    };
  }, [filteredData, companyPayables, companyReceivables]);

  // Calculate projection data with filters applied
  const projectionData = useMemo(() => {
    const days = parseInt(selectedPeriod);
    const today = getBrazilToday();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    // Calculate current balance - if bank filter is selected, use only that bank, otherwise all
    const currentBalance = selectedBank === "all"
      ? companyBanks.reduce((sum, bank) => sum + getBankBalance(bank.id), 0)
      : getBankBalance(selectedBank);

    // Apply filters to pending items
    const filterPendingItem = (item: any, dateField: string) => {
      if (item.status !== 'pendente') return false;
      if (selectedBank !== "all" && item.bankId !== selectedBank) return false;
      if (selectedCategory !== "all" && item.categoryId !== selectedCategory) return false;
      if (selectedPaymentMethod !== "all" && item.paymentMethod !== selectedPaymentMethod) return false;
      
      const itemDate = parseDateBrazil(item[dateField]);
      return itemDate >= today && itemDate <= futureDate;
    };

    const pendingPayables = companyPayables.filter(p => filterPendingItem(p, 'dueDate'));
    const pendingReceivables = companyReceivables.filter(r => filterPendingItem(r, 'receiptDate'));

    // Calculate paid items for the selected bank (already paid, showing history)
    const paidPayables = companyPayables.filter(p => {
      if (p.status !== 'pago') return false;
      if (selectedBank !== "all" && p.bankId !== selectedBank) return false;
      if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
      if (selectedPaymentMethod !== "all" && p.paymentMethod !== selectedPaymentMethod) return false;
      return true;
    });

    const receivedItems = companyReceivables.filter(r => {
      if (r.status !== 'recebido') return false;
      if (selectedBank !== "all" && r.bankId !== selectedBank) return false;
      if (selectedCategory !== "all" && r.categoryId !== selectedCategory) return false;
      return true;
    });

    const totalPayables = pendingPayables.reduce((sum, p) => sum + p.amount, 0);
    const totalReceivables = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);
    const totalPaid = paidPayables.reduce((sum, p) => sum + p.amount, 0);
    const totalReceived = receivedItems.reduce((sum, r) => sum + r.amount, 0);
    const projectedBalance = currentBalance + totalReceivables - totalPayables;

    return {
      currentBalance,
      projectedBalance,
      totalPayables,
      totalReceivables,
      totalPaid,
      totalReceived,
      pendingCount: pendingPayables.length,
      paidCount: paidPayables.length,
    };
  }, [companyBanks, companyPayables, companyReceivables, selectedPeriod, selectedBank, selectedCategory, selectedPaymentMethod, getBankBalance]);

  // Generate chart data with filters applied
  const chartData = useMemo(() => {
    const days = parseInt(selectedPeriod);
    const today = getBrazilToday();
    
    const data = [];
    let accumulatedBalance = projectionData.currentBalance;

    for (let i = 0; i <= days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Apply filters to receivables
      const dayReceivables = companyReceivables.filter(r => {
        if (r.status !== 'pendente') return false;
        if (r.receiptDate !== dateStr) return false;
        if (selectedBank !== "all" && r.bankId !== selectedBank) return false;
        if (selectedCategory !== "all" && r.categoryId !== selectedCategory) return false;
        return true;
      });
      const entradas = dayReceivables.reduce((sum, r) => sum + r.amount, 0);

      // Apply filters to payables
      const dayPayables = companyPayables.filter(p => {
        if (p.status !== 'pendente') return false;
        if (p.dueDate !== dateStr) return false;
        if (selectedBank !== "all" && p.bankId !== selectedBank) return false;
        if (selectedCategory !== "all" && p.categoryId !== selectedCategory) return false;
        if (selectedPaymentMethod !== "all" && p.paymentMethod !== selectedPaymentMethod) return false;
        return true;
      });
      const saidas = dayPayables.reduce((sum, p) => sum + p.amount, 0);

      accumulatedBalance += entradas - saidas;

      data.push({
        date: dateStr,
        entradas,
        saidas,
        saldo: accumulatedBalance,
      });
    }

    return data;
  }, [companyPayables, companyReceivables, selectedPeriod, projectionData.currentBalance, selectedBank, selectedCategory, selectedPaymentMethod]);

  const clearFilters = () => {
    setSelectedBank("all");
    setSelectedCategory("all");
    setSelectedPaymentMethod("all");
    setSelectedDateFilter("month");
    setCustomStartDate("");
    setCustomEndDate("");
    setShowCustomDateInputs(false);
  };

  const handleDateFilterChange = (value: string) => {
    setSelectedDateFilter(value);
    setShowCustomDateInputs(value === "custom");
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Olá, {userName}! 👋</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Veja como está o financeiro da {companyName}</p>
      </div>

      {/* Migration Banner */}
      <MigrationBanner hasLocalData={companyPayables.length > 0 || companyReceivables.length > 0 || companyBanks.length > 1} />

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
              {companyBanks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.accountName}
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
              {CATEGORY_GROUPS.map(group => {
                const groupCategories = categories.filter(c => c.groupId === group.id);
                if (groupCategories.length === 0) return null;
                return (
                  <div key={group.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group.name}
                    </div>
                    {groupCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.type === "despesa" ? (
                            <ArrowDown className="h-3 w-3 text-red-600" />
                          ) : (
                            <ArrowUp className="h-3 w-3 text-green-600" />
                          )}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
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
        <Card className="bg-green-600/5 border-green-600/20">
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
                  {formatCurrency(kpis.totalRevenue)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {formatCurrency(kpis.totalRevenue)} confirmado
                </p>
              </div>
              <div className="rounded-lg p-1.5 sm:p-2 shrink-0 self-end sm:self-start order-1 sm:order-2 bg-green-600/10 text-green-600">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-600/5 border-red-600/20">
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
                  {formatCurrency(kpis.totalExpenses)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {formatCurrency(kpis.totalExpenses)} confirmado
                </p>
              </div>
              <div className="rounded-lg p-1.5 sm:p-2 shrink-0 self-end sm:self-start order-1 sm:order-2 bg-red-600/10 text-red-600">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 rotate-180" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#001429]/5 border-[#001429]/20">
          <CardContent className="p-3 sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 order-2 sm:order-1">
                <div className="flex items-center gap-1">
                  <p className="text-[11px] sm:text-sm font-medium text-muted-foreground line-clamp-1">
                    Saldo do período
                  </p>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help shrink-0" />
                </div>
                <p className={`text-base sm:text-2xl font-bold tracking-tight break-words ${kpis.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(kpis.balance)}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {kpis.balance >= 0 ? "Saldo positivo" : "Saldo negativo"}
                </p>
              </div>
              <div className="rounded-lg p-1.5 sm:p-2 shrink-0 self-end sm:self-start order-1 sm:order-2 bg-[#001429]/10 text-[#001429]">
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
                  {kpis.upcomingPaymentsCount} pagam.
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                  {kpis.upcomingReceiptsCount} recebim.
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
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#001429]" />
              Projeção de Saldo
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </CardTitle>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={selectedPeriod === "30" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("30")}
                className={`text-xs px-2 sm:px-3 ${selectedPeriod === "30" ? "bg-[#001429] hover:bg-[#001429]/90" : ""}`}
              >
                30 dias
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "60" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("60")}
                className={`text-xs px-2 sm:px-3 ${selectedPeriod === "60" ? "bg-[#001429] hover:bg-[#001429]/90" : ""}`}
              >
                60 dias
              </Button>
              <Button
                size="sm"
                variant={selectedPeriod === "90" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("90")}
                className={`text-xs px-2 sm:px-3 ${selectedPeriod === "90" ? "bg-[#001429] hover:bg-[#001429]/90" : ""}`}
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
                    return formatCurrency(value);
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
                  stroke="#001429" 
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
              <p className="text-xs sm:text-sm font-semibold">{formatCurrency(projectionData.currentBalance)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-[#001429]/10 rounded-lg text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Saldo em {selectedPeriod} dias</p>
              <p className={`text-xs sm:text-sm font-semibold ${projectionData.projectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(projectionData.projectedBalance)}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg text-center bg-green-600/10">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Entradas Previstas</p>
              <p className="text-xs sm:text-sm font-semibold text-green-600">+{formatCurrency(projectionData.totalReceivables)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-red-600/10 rounded-lg text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Saídas Previstas</p>
              <p className="text-xs sm:text-sm font-semibold text-red-600">-{formatCurrency(projectionData.totalPayables)}</p>
            </div>
          </div>

          {/* Detalhes adicionais quando filtros estão aplicados */}
          {(selectedBank !== "all" || selectedCategory !== "all" || selectedPaymentMethod !== "all") && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t">
              <div className="p-2 sm:p-3 bg-green-600/5 rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Já recebido (filtrado)</p>
                <p className="text-xs sm:text-sm font-semibold text-green-600">{formatCurrency(projectionData.totalReceived)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-red-600/5 rounded-lg">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Já pago (filtrado)</p>
                <p className="text-xs sm:text-sm font-semibold text-red-600">{formatCurrency(projectionData.totalPaid)}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">{projectionData.paidCount} pagamento(s)</p>
              </div>
            </div>
          )}

          <div className="text-center text-xs sm:text-sm text-muted-foreground pt-2 border-t">
            Variação no período: <span className={`font-medium ${(projectionData.totalReceivables - projectionData.totalPayables) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(projectionData.totalReceivables - projectionData.totalPayables) >= 0 ? '+' : ''}{formatCurrency(projectionData.totalReceivables - projectionData.totalPayables)}
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
                {kpis.upcomingReceiptsCount} pendentes
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {kpis.upcomingReceipts.length > 0 ? (
              <div className="divide-y">
                {kpis.upcomingReceipts.map((receipt) => (
                  <div key={receipt.id} className="px-3 sm:px-5 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{receipt.description}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatDateBR(receipt.receiptDate)}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-green-600">
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
                {kpis.upcomingPaymentsCount} pendentes
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {kpis.upcomingPayments.length > 0 ? (
              <div className="divide-y">
                {kpis.upcomingPayments.map((payment) => (
                  <div key={payment.id} className="px-3 sm:px-5 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-xs sm:text-sm font-medium">{payment.description}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatDateBR(payment.dueDate)}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-red-600">
                      {formatCurrency(payment.amount)}
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
