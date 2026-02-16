import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Upload,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  FileUp,
  MoreHorizontal,
  PenLine,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  History,
  Trash2,
  X,
  PieChart as PieChartIcon,
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
import { Checkbox } from "@/react-app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { LancamentosFiltersBar, type LancamentosFilters } from "@/react-app/components/LancamentosFilters";
import { ImportOFXDialog } from "@/react-app/components/ImportOFXDialog";
import { NovoLancamentoDialog } from "@/react-app/components/NovoLancamentoDialog";
import { ExportLancamentosDialog } from "@/react-app/components/ExportLancamentosDialog";
import { LancamentoDetailsDialog } from "@/react-app/components/LancamentoDetailsDialog";
import { TransactionHistoryDialog } from "@/react-app/components/TransactionHistoryDialog";
import { LancamentosCharts } from "@/react-app/components/LancamentosCharts";
import { RecurringTransactionsDialog } from "@/react-app/components/RecurringTransactionsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";

interface Transaction {
  id: number;
  type: "income" | "expense";
  transaction_date: string;
  paid_date: string | null;
  created_date: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  cost_center: string | null;
  bank_account: string | null;
  bank_account_id: number | null;
  payment_method: string | null;
  amount: number;
  is_paid: number;
  person_name: string | null;
  origin: string;
  status: "received" | "paid" | "pending";
  outstanding_amount?: number;
  total_paid?: number;
}

export default function LancamentosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [filters, setFilters] = useState<LancamentosFilters>({
    startDate: "",
    endDate: "",
    categoryId: "",
    costCenter: "",
    person: "",
    bankAccountId: "",
    paymentMethod: "",
    status: "",
    origin: "",
    type: "",
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, activeTab]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/lancamentos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, showSign = false) => {
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
    
    return showSign ? (value >= 0 ? `+${formatted}` : formatted) : formatted;
  };

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    const confirmMsg = `Confirma a exclusão de ${selectedIds.size} ${selectedIds.size === 1 ? 'lançamento' : 'lançamentos'}?`;
    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem("token");
      const selectedTransactions = filteredTransactions.filter(t => selectedIds.has(t.id));
      
      for (const transaction of selectedTransactions) {
        const endpoint = transaction.type === "income" 
          ? `/api/accounts-receivable/${transaction.id}`
          : `/api/accounts-payable/${transaction.id}`;
        
        await fetch(endpoint, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      setSelectedIds(new Set());
      fetchTransactions();
    } catch (error) {
      console.error("Erro ao excluir lançamentos:", error);
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedIds.size === 0) return;

    const selectedTransactions = filteredTransactions.filter(t => 
      selectedIds.has(t.id) && t.type === "expense" && !t.is_paid
    );

    if (selectedTransactions.length === 0) {
      alert("Selecione apenas lançamentos de saída não pagos");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      for (const transaction of selectedTransactions) {
        await fetch(`/api/accounts-payable/${transaction.id}/pay`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bank_account_id: transaction.bank_account_id || null }),
        });
      }

      setSelectedIds(new Set());
      fetchTransactions();
    } catch (error) {
      console.error("Erro ao marcar como pago:", error);
    }
  };

  const handleClearAllFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      categoryId: "",
      costCenter: "",
      person: "",
      bankAccountId: "",
      paymentMethod: "",
      status: "",
      origin: "",
      type: "",
    });
  };

  // Apply all filters
  const filteredTransactions = transactions.filter((t) => {
    // Search filter
    const matchesSearch = !searchQuery || 
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.person_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Tab filter
    const matchesTab = 
      activeTab === "all" ||
      (activeTab === "receive" && t.type === "income") ||
      (activeTab === "pay" && t.type === "expense");
    
    // Date range filter
    let matchesDateRange = true;
    if (filters.startDate || filters.endDate) {
      const transactionDate = new Date(t.transaction_date);
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (transactionDate < startDate) matchesDateRange = false;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        if (transactionDate > endDate) matchesDateRange = false;
      }
    }
    
    // Category filter
    const matchesCategory = !filters.categoryId || 
      t.category_id?.toString() === filters.categoryId;
    
    // Cost center filter
    const matchesCostCenter = !filters.costCenter || 
      t.cost_center === filters.costCenter;
    
    // Person filter
    const matchesPerson = !filters.person || 
      t.person_name === filters.person;
    
    // Bank account filter
    const matchesBankAccount = !filters.bankAccountId || 
      t.bank_account_id?.toString() === filters.bankAccountId;
    
    // Payment method filter
    const matchesPaymentMethod = !filters.paymentMethod || 
      t.payment_method === filters.paymentMethod;
    
    // Status filter
    const matchesStatus = !filters.status || 
      t.status === filters.status;
    
    // Origin filter
    const matchesOrigin = !filters.origin || 
      t.origin === filters.origin;
    
    // Type filter
    const matchesType = !filters.type || 
      t.type === filters.type;
    
    return (
      matchesSearch &&
      matchesTab &&
      matchesDateRange &&
      matchesCategory &&
      matchesCostCenter &&
      matchesPerson &&
      matchesBankAccount &&
      matchesPaymentMethod &&
      matchesStatus &&
      matchesOrigin &&
      matchesType
    );
  });

  // Calculate filtered totals
  const filteredTotals = filteredTransactions.reduce(
    (acc, t) => {
      const amount = Math.abs(parseFloat(t.amount.toString()));
      
      if (t.type === "income") {
        acc.total_income += amount;
        acc.count_income++;
        if (t.is_paid) {
          acc.total_income_received += amount;
          acc.count_income_received++;
        } else {
          acc.total_income_pending += amount;
          acc.count_income_pending++;
        }
      } else {
        acc.total_expense += amount;
        acc.count_expense++;
        if (t.is_paid) {
          acc.total_expense_paid += amount;
          acc.count_expense_paid++;
        } else {
          acc.total_expense_pending += amount;
          acc.count_expense_pending++;
        }
      }
      
      return acc;
    },
    {
      total_income: 0,
      total_income_received: 0,
      total_income_pending: 0,
      count_income: 0,
      count_income_received: 0,
      count_income_pending: 0,
      total_expense: 0,
      total_expense_paid: 0,
      total_expense_pending: 0,
      count_expense: 0,
      count_expense_paid: 0,
      count_expense_pending: 0,
      balance: 0,
      balance_realized: 0,
      balance_pending: 0,
      total_count: filteredTransactions.length,
    }
  );

  filteredTotals.balance = filteredTotals.total_income - filteredTotals.total_expense;
  filteredTotals.balance_realized = filteredTotals.total_income_received - filteredTotals.total_expense_paid;
  filteredTotals.balance_pending = filteredTotals.total_income_pending - filteredTotals.total_expense_pending;

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const getStatusBadge = (transaction: Transaction) => {
    if (transaction.status === "received") {
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-0.5 text-[10px] whitespace-nowrap">
          <Check className="h-3 w-3" />
          Recebido
        </Badge>
      );
    }
    if (transaction.status === "paid") {
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-0.5 text-[10px] whitespace-nowrap">
          <Check className="h-3 w-3" />
          Pago
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground border-muted-foreground/20 text-[10px] whitespace-nowrap">
        Previsto
      </Badge>
    );
  };

  const getOriginBadge = (origin: string) => {
    if (origin === "import") {
      return (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/10 text-blue-600">
          <FileUp className="h-3 w-3" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground">
        <PenLine className="h-3 w-3" />
      </span>
    );
  };

  return (
    <div className="p-4 pb-24 md:pb-6 md:p-6 lg:p-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">Lançamentos</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTotals.total_count} registros
              <span className="hidden sm:inline"> — </span>
              <span className="block sm:inline text-success">{filteredTotals.count_income} entradas</span>
              <span className="mx-1">•</span>
              <span className="text-primary">{filteredTotals.count_expense} saídas</span>
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <ImportOFXDialog
              onImportComplete={fetchTransactions}
              trigger={
                <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
              }
            />
            <ExportLancamentosDialog
              transactions={filteredTransactions}
              trigger={
                <Button variant="outline" className="gap-2 flex-1 sm:flex-none" disabled={filteredTransactions.length === 0}>
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              }
            />
            <RecurringTransactionsDialog />
            <TransactionHistoryDialog
              trigger={
                <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Histórico</span>
                </Button>
              }
            />
            <NovoLancamentoDialog
              onSuccess={fetchTransactions}
              trigger={
                <Button className="gap-2 flex-1 sm:flex-none">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo lançamento</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              }
            />
          </div>
        </div>

        {/* Charts Toggle */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCharts(!showCharts)}
            className="gap-2"
          >
            <PieChartIcon className="h-4 w-4" />
            {showCharts ? "Ocultar gráficos" : "Mostrar gráficos"}
          </Button>
        </div>

        {/* Charts */}
        {showCharts && (
          <LancamentosCharts transactions={filteredTransactions} />
        )}

        {/* Summary Cards */}
        <div className="grid gap-2 sm:gap-3 grid-cols-3">
          <div className="rounded-xl border bg-card p-2 sm:p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Entradas</p>
              <span className="text-[9px] sm:text-xs text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded shrink-0">
                {filteredTotals.count_income}
              </span>
            </div>
            <p className="text-xs sm:text-xl font-bold text-success truncate" title={formatCurrency(filteredTotals.total_income)}>
              <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.total_income)}</span>
              <span className="hidden sm:inline">{formatCurrency(filteredTotals.total_income)}</span>
            </p>
            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-dashed space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between text-[9px] sm:text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0"></span>
                  <span className="truncate">Recebido</span>
                  <span className="text-muted-foreground/60 hidden sm:inline">({filteredTotals.count_income_received})</span>
                </span>
                <span className="text-success font-medium truncate ml-1" title={formatCurrency(filteredTotals.total_income_received)}>
                  <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.total_income_received)}</span>
                  <span className="hidden sm:inline">{formatCurrency(filteredTotals.total_income_received)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="truncate">A receber</span>
                  <span className="text-muted-foreground/60 hidden sm:inline">({filteredTotals.count_income_pending})</span>
                </span>
                <span className="text-amber-600 font-medium truncate ml-1" title={formatCurrency(filteredTotals.total_income_pending)}>
                  <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.total_income_pending)}</span>
                  <span className="hidden sm:inline">{formatCurrency(filteredTotals.total_income_pending)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-2 sm:p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Saídas</p>
              <span className="text-[9px] sm:text-xs text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded shrink-0">
                {filteredTotals.count_expense}
              </span>
            </div>
            <p className="text-xs sm:text-xl font-bold text-primary truncate" title={formatCurrency(filteredTotals.total_expense)}>
              <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.total_expense)}</span>
              <span className="hidden sm:inline">{formatCurrency(filteredTotals.total_expense)}</span>
            </p>
            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-dashed space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between text-[9px] sm:text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                  <span className="truncate">Pago</span>
                  <span className="text-muted-foreground/60 hidden sm:inline">({filteredTotals.count_expense_paid})</span>
                </span>
                <span className="text-primary font-medium truncate ml-1" title={formatCurrency(filteredTotals.total_expense_paid)}>
                  <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.total_expense_paid)}</span>
                  <span className="hidden sm:inline">{formatCurrency(filteredTotals.total_expense_paid)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="truncate">A pagar</span>
                  <span className="text-muted-foreground/60 hidden sm:inline">({filteredTotals.count_expense_pending})</span>
                </span>
                <span className="text-amber-600 font-medium truncate ml-1" title={formatCurrency(filteredTotals.total_expense_pending)}>
                  <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.total_expense_pending)}</span>
                  <span className="hidden sm:inline">{formatCurrency(filteredTotals.total_expense_pending)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-2 sm:p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-1">
              <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Saldo</p>
              <span className="text-[9px] sm:text-xs text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded shrink-0">
                {filteredTotals.total_count}
              </span>
            </div>
            <p className={`text-xs sm:text-xl font-bold truncate ${filteredTotals.balance >= 0 ? 'text-success' : 'text-destructive'}`} title={formatCurrency(filteredTotals.balance)}>
              <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.balance)}</span>
              <span className="hidden sm:inline">{formatCurrency(filteredTotals.balance)}</span>
            </p>
            <div className="mt-1 sm:mt-2 pt-1 sm:pt-2 border-t border-dashed space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between text-[9px] sm:text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0"></span>
                  <span className="truncate">Realizado</span>
                </span>
                <span className={`font-medium truncate ml-1 ${filteredTotals.balance_realized >= 0 ? 'text-success' : 'text-destructive'}`} title={formatCurrency(filteredTotals.balance_realized)}>
                  <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.balance_realized)}</span>
                  <span className="hidden sm:inline">{formatCurrency(filteredTotals.balance_realized)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span className="truncate">Previsto</span>
                </span>
                <span className={`font-medium truncate ml-1 ${filteredTotals.balance_pending >= 0 ? 'text-amber-600' : 'text-destructive'}`} title={formatCurrency(filteredTotals.balance_pending)}>
                  <span className="sm:hidden">{formatCurrencyCompact(filteredTotals.balance_pending)}</span>
                  <span className="hidden sm:inline">{formatCurrency(filteredTotals.balance_pending)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Bulk Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkMarkAsPaid}
                className="h-8"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Marcar como pago
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                className="h-8"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Excluir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-8"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Filters */}
        <LancamentosFiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          onClearAll={handleClearAllFilters}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="receive">Recebimentos</TabsTrigger>
            <TabsTrigger value="pay">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="rounded-xl border bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 pl-3">
                        <Checkbox
                          checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead className="w-10 pl-3">
                        <span className="sr-only">Tipo</span>
                      </TableHead>
                      <TableHead className="w-[200px] min-w-[150px]">
                        <span className="text-sm font-medium">Descrição</span>
                      </TableHead>
                      <TableHead className="w-[82px]">
                        <Button variant="ghost" className="h-8 px-2 -ml-2 font-medium hover:bg-transparent">
                          Venc.
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[82px]">
                        <Button variant="ghost" className="h-8 px-2 -ml-2 font-medium hover:bg-transparent">
                          Pgto.
                          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[82px]">
                        <Button variant="ghost" className="h-8 px-2 -ml-2 font-medium hover:bg-transparent">
                          Criação
                          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <span className="text-sm font-medium">Categoria</span>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <span className="text-sm font-medium">C. Custos</span>
                      </TableHead>
                      <TableHead className="w-[110px]">
                        <span className="text-sm font-medium">Pessoa</span>
                      </TableHead>
                      <TableHead className="w-[110px]">
                        <span className="text-sm font-medium">Conta</span>
                      </TableHead>
                      <TableHead className="w-[100px]">
                        <span className="text-sm font-medium">Forma</span>
                      </TableHead>
                      <TableHead className="w-[100px] text-right">
                        <Button variant="ghost" className="h-8 px-2 -ml-2 font-medium hover:bg-transparent justify-end">
                          Valor
                          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[80px]">
                        <Button variant="ghost" className="h-8 px-2 -ml-2 font-medium hover:bg-transparent">
                          Status
                          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-[50px]">
                        <Button variant="ghost" className="h-8 px-2 -ml-2 font-medium hover:bg-transparent">
                          Orig.
                          <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-10 pr-3">
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : paginatedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center py-12 text-muted-foreground">
                          Nenhum lançamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransactions.map((transaction) => (
                        <TableRow 
                          key={`${transaction.type}-${transaction.id}`}
                          className="hover:bg-muted/50 group cursor-pointer"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setDetailsOpen(true);
                          }}
                        >
                          <TableCell className="pl-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(transaction.id)}
                              onCheckedChange={() => toggleSelect(transaction.id)}
                              aria-label={`Selecionar ${transaction.description}`}
                            />
                          </TableCell>
                          <TableCell className="pl-3 py-2">
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                              transaction.type === "income" 
                                ? "bg-success/10 text-success" 
                                : "bg-primary/10 text-primary"
                            }`}>
                              {transaction.type === "income" ? (
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-medium text-sm truncate">{transaction.description}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs py-2">
                            {formatDate(transaction.transaction_date)}
                          </TableCell>
                          <TableCell className="py-2">
                            {transaction.paid_date ? (
                              <span className="text-xs text-success">
                                {formatDate(transaction.paid_date)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-muted-foreground text-xs">
                              {formatDate(transaction.created_date)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-muted-foreground text-xs">
                              {transaction.category_name || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-muted-foreground text-xs">
                              {transaction.cost_center || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-muted-foreground text-xs">
                              {transaction.person_name || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-muted-foreground text-xs">
                              {transaction.bank_account || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-muted-foreground text-xs">
                              {transaction.payment_method || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <span className={`font-semibold text-xs ${
                              transaction.type === "income" ? "text-success" : "text-foreground"
                            }`}>
                              {transaction.type === "income" ? "+" : ""}{formatCurrency(transaction.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="py-2">
                            {getStatusBadge(transaction)}
                          </TableCell>
                          <TableCell className="py-2">
                            {getOriginBadge(transaction.origin)}
                          </TableCell>
                          <TableCell className="pr-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTransaction(transaction);
                                    setDetailsOpen(true);
                                  }}
                                >
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={async () => {
                                    if (confirm(`Confirma a exclusão de "${transaction.description}"?`)) {
                                      const token = localStorage.getItem("token");
                                      const endpoint = transaction.type === "income" 
                                        ? `/api/accounts-receivable/${transaction.id}`
                                        : `/api/accounts-payable/${transaction.id}`;
                                      await fetch(endpoint, {
                                        method: "DELETE",
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                        },
                                      });
                                      fetchTransactions();
                                    }
                                  }}
                                >
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            {filteredTransactions.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <span className="text-xs sm:text-sm text-muted-foreground">Por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <span className="text-xs sm:text-sm text-muted-foreground mr-1">
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    title="Primeira página"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Próxima página"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Última página"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile FAB */}
      <NovoLancamentoDialog
        onSuccess={fetchTransactions}
        trigger={
          <Button
            className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg md:hidden"
            size="icon"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Novo lançamento</span>
          </Button>
        }
      />

      {/* Transaction Details Dialog */}
      <LancamentoDetailsDialog
        transaction={selectedTransaction}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={fetchTransactions}
        onDelete={fetchTransactions}
      />
    </div>
  );
}
