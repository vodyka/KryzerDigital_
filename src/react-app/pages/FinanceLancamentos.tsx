import { useState, useMemo } from "react";
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Calendar,
  X,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Input } from "@/react-app/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { formatCurrency, formatDate } from "@/react-app/lib/finance-utils";

interface CombinedTransaction {
  id: string;
  type: "receita" | "despesa";
  description: string;
  amount: number;
  date: string;
  bankId: string;
  bankName: string;
  categoryId: string;
  categoryName: string;
  paymentMethod: string;
  status: "pago" | "recebido" | "pendente";
  isPaid: boolean;
}

export default function FinanceLancamentosPage() {
  const {
    categories,
    banks,
    payables,
    receivables,
  } = useFinanceData();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Combine all transactions
  const allTransactions = useMemo<CombinedTransaction[]>(() => {
    const transactions: CombinedTransaction[] = [];

    // Add payables
    payables.forEach((p) => {
      const bank = banks.find((b) => b.id === p.bankId);
      const category = categories.find((c) => c.id === p.categoryId);
      transactions.push({
        id: `payable-${p.id}`,
        type: "despesa",
        description: p.description,
        amount: p.amount,
        date: p.dueDate,
        bankId: p.bankId,
        bankName: bank?.accountName || "—",
        categoryId: p.categoryId,
        categoryName: category?.name || "—",
        paymentMethod: p.paymentMethod,
        status: p.status as "pago" | "pendente",
        isPaid: p.status === "pago",
      });
    });

    // Add receivables
    receivables.forEach((r) => {
      const bank = banks.find((b) => b.id === r.bankId);
      const category = categories.find((c) => c.id === r.categoryId);
      transactions.push({
        id: `receivable-${r.id}`,
        type: "receita",
        description: r.description,
        amount: r.amount,
        date: r.receiptDate,
        bankId: r.bankId,
        bankName: bank?.accountName || "—",
        categoryId: r.categoryId,
        categoryName: category?.name || "—",
        paymentMethod: "",
        status: r.status as "recebido" | "pendente",
        isPaid: r.status === "recebido",
      });
    });

    return transactions.sort((a, b) => b.date.localeCompare(a.date));
  }, [payables, receivables, banks, categories]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Tab filter
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "receitas" && t.type === "receita") ||
        (activeTab === "despesas" && t.type === "despesa");

      // Date range filter
      let matchesDateRange = true;
      if (startDate || endDate) {
        const transactionDate = new Date(t.date);
        if (startDate) {
          const start = new Date(startDate);
          if (transactionDate < start) matchesDateRange = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (transactionDate > end) matchesDateRange = false;
        }
      }

      // Bank filter
      const matchesBank = !selectedBankId || t.bankId === selectedBankId;

      // Category filter
      const matchesCategory =
        !selectedCategoryId || t.categoryId === selectedCategoryId;

      // Payment method filter
      const matchesPaymentMethod =
        !selectedPaymentMethod || t.paymentMethod === selectedPaymentMethod;

      // Status filter
      const matchesStatus = !selectedStatus || t.status === selectedStatus;

      return (
        matchesSearch &&
        matchesTab &&
        matchesDateRange &&
        matchesBank &&
        matchesCategory &&
        matchesPaymentMethod &&
        matchesStatus
      );
    });
  }, [
    allTransactions,
    searchQuery,
    activeTab,
    startDate,
    endDate,
    selectedBankId,
    selectedCategoryId,
    selectedPaymentMethod,
    selectedStatus,
  ]);

  // Calculate totals
  const totals = useMemo(() => {
    const result = {
      receitas: 0,
      receitasRecebidas: 0,
      receitasPendentes: 0,
      despesas: 0,
      despesasPagas: 0,
      despesasPendentes: 0,
      countReceitas: 0,
      countReceitasRecebidas: 0,
      countReceitasPendentes: 0,
      countDespesas: 0,
      countDespesasPagas: 0,
      countDespesasPendentes: 0,
    };

    filteredTransactions.forEach((t) => {
      if (t.type === "receita") {
        result.receitas += t.amount;
        result.countReceitas++;
        if (t.status === "recebido") {
          result.receitasRecebidas += t.amount;
          result.countReceitasRecebidas++;
        } else {
          result.receitasPendentes += t.amount;
          result.countReceitasPendentes++;
        }
      } else {
        result.despesas += t.amount;
        result.countDespesas++;
        if (t.status === "pago") {
          result.despesasPagas += t.amount;
          result.countDespesasPagas++;
        } else {
          result.despesasPendentes += t.amount;
          result.countDespesasPendentes++;
        }
      }
    });

    return result;
  }, [filteredTransactions]);

  const saldo = totals.receitas - totals.despesas;
  const saldoRealizado = totals.receitasRecebidas - totals.despesasPagas;
  const saldoPendente = totals.receitasPendentes - totals.despesasPendentes;

  const formatCurrencyCompact = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000000) {
      return `R$ ${(abs / 1000000).toFixed(1)} mi`;
    }
    if (abs >= 1000) {
      return `R$ ${(abs / 1000).toFixed(1)} mil`;
    }
    return formatCurrency(value);
  };

  const hasActiveFilters =
    startDate ||
    endDate ||
    selectedBankId ||
    selectedCategoryId ||
    selectedPaymentMethod ||
    selectedStatus;

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedBankId("");
    setSelectedCategoryId("");
    setSelectedPaymentMethod("");
    setSelectedStatus("");
  };

  const getStatusBadge = (status: string) => {
    if (status === "recebido") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-0.5 text-[10px] whitespace-nowrap">
          <Check className="h-3 w-3" />
          Recebido
        </Badge>
      );
    }
    if (status === "pago") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-0.5 text-[10px] whitespace-nowrap">
          <Check className="h-3 w-3" />
          Pago
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] whitespace-nowrap"
      >
        Pendente
      </Badge>
    );
  };

  const paymentMethods = [
    { value: "pix", label: "Pix" },
    { value: "credito", label: "Cartão de Crédito" },
    { value: "boleto", label: "Boleto" },
    { value: "transferencia", label: "Transferência" },
    { value: "deposito", label: "Depósito" },
    { value: "dinheiro", label: "Dinheiro" },
  ];

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Lançamentos</h1>
        <p className="text-sm text-muted-foreground">
          {filteredTransactions.length} registros
          <span className="mx-1">•</span>
          <span className="text-green-600">{totals.countReceitas} entradas</span>
          <span className="mx-1">•</span>
          <span className="text-red-600">{totals.countDespesas} saídas</span>
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-3">
        <div className="rounded-xl border bg-card p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Entradas</p>
            <span className="text-[9px] sm:text-xs text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded">
              {totals.countReceitas}
            </span>
          </div>
          <p className="text-sm sm:text-xl font-bold text-green-600 truncate mt-1">
            <span className="sm:hidden">{formatCurrencyCompact(totals.receitas)}</span>
            <span className="hidden sm:inline">{formatCurrency(totals.receitas)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-dashed space-y-1">
            <div className="flex items-center justify-between text-[9px] sm:text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                Recebido ({totals.countReceitasRecebidas})
              </span>
              <span className="text-green-600 font-medium truncate">
                <span className="sm:hidden">{formatCurrencyCompact(totals.receitasRecebidas)}</span>
                <span className="hidden sm:inline">{formatCurrency(totals.receitasRecebidas)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] sm:text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                A receber ({totals.countReceitasPendentes})
              </span>
              <span className="text-amber-600 font-medium truncate">
                <span className="sm:hidden">{formatCurrencyCompact(totals.receitasPendentes)}</span>
                <span className="hidden sm:inline">{formatCurrency(totals.receitasPendentes)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Saídas</p>
            <span className="text-[9px] sm:text-xs text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded">
              {totals.countDespesas}
            </span>
          </div>
          <p className="text-sm sm:text-xl font-bold text-red-600 truncate mt-1">
            <span className="sm:hidden">{formatCurrencyCompact(totals.despesas)}</span>
            <span className="hidden sm:inline">{formatCurrency(totals.despesas)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-dashed space-y-1">
            <div className="flex items-center justify-between text-[9px] sm:text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                Pago ({totals.countDespesasPagas})
              </span>
              <span className="text-red-600 font-medium truncate">
                <span className="sm:hidden">{formatCurrencyCompact(totals.despesasPagas)}</span>
                <span className="hidden sm:inline">{formatCurrency(totals.despesasPagas)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] sm:text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                A pagar ({totals.countDespesasPendentes})
              </span>
              <span className="text-amber-600 font-medium truncate">
                <span className="sm:hidden">{formatCurrencyCompact(totals.despesasPendentes)}</span>
                <span className="hidden sm:inline">{formatCurrency(totals.despesasPendentes)}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Saldo</p>
            <span className="text-[9px] sm:text-xs text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded">
              {filteredTransactions.length}
            </span>
          </div>
          <p
            className={`text-sm sm:text-xl font-bold truncate mt-1 ${
              saldo >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            <span className="sm:hidden">{formatCurrencyCompact(saldo)}</span>
            <span className="hidden sm:inline">{formatCurrency(saldo)}</span>
          </p>
          <div className="mt-2 pt-2 border-t border-dashed space-y-1">
            <div className="flex items-center justify-between text-[9px] sm:text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                Realizado
              </span>
              <span
                className={`font-medium truncate ${
                  saldoRealizado >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                <span className="sm:hidden">{formatCurrencyCompact(saldoRealizado)}</span>
                <span className="hidden sm:inline">{formatCurrency(saldoRealizado)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] sm:text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Previsto
              </span>
              <span
                className={`font-medium truncate ${
                  saldoPendente >= 0 ? "text-amber-600" : "text-red-600"
                }`}
              >
                <span className="sm:hidden">{formatCurrencyCompact(saldoPendente)}</span>
                <span className="hidden sm:inline">{formatCurrency(saldoPendente)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            placeholder="Data inicial"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-muted-foreground">até</span>
          <Input
            type="date"
            placeholder="Data final"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <Select value={selectedBankId} onValueChange={setSelectedBankId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Conta bancária" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as contas</SelectItem>
            {banks.map((bank) => (
              <SelectItem key={bank.id} value={bank.id}>
                {bank.accountName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Forma de pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as formas</SelectItem>
            {paymentMethods.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os status</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="recebido">Recebido</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <span className="sr-only">Tipo</span>
                    </TableHead>
                    <TableHead className="min-w-[200px]">Descrição</TableHead>
                    <TableHead className="w-[100px]">
                      <Button
                        variant="ghost"
                        className="h-8 px-2 -ml-2 font-medium hover:bg-transparent"
                      >
                        Data
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[150px]">Categoria</TableHead>
                    <TableHead className="w-[150px]">Conta</TableHead>
                    <TableHead className="w-[130px]">Forma de Pgto</TableHead>
                    <TableHead className="w-[120px] text-right">Valor</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-12 text-muted-foreground"
                      >
                        Nenhum lançamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow
                        key={transaction.id}
                        className="hover:bg-muted/50 group cursor-pointer"
                      >
                        <TableCell className="py-3">
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                              transaction.type === "receita"
                                ? "bg-green-500/10 text-green-600"
                                : "bg-red-500/10 text-red-600"
                            }`}
                          >
                            {transaction.type === "receita" ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="font-medium text-sm">
                            {transaction.description}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">
                          {transaction.categoryName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">
                          {transaction.bankName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs py-3">
                          {transaction.paymentMethod || "—"}
                        </TableCell>
                        <TableCell className="text-right py-3">
                          <span
                            className={`font-semibold text-sm ${
                              transaction.type === "receita"
                                ? "text-green-600"
                                : "text-foreground"
                            }`}
                          >
                            {transaction.type === "receita" ? "+" : ""}
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3">
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
