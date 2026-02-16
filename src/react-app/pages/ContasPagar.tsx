import { useState, useEffect } from "react";
import NovoPagamentoModal from "@/react-app/components/NovoPagamentoModal";
import AgendarPagamentoModal from "@/react-app/components/AgendarPagamentoModal";
import PagarModal from "@/react-app/components/PagarModal";
import { getFirstDayOfMonth, getLastDayOfMonth, formatDateBR } from "@/react-app/utils/date-helpers";
import {
  Search,
  Plus,
  Filter,
  Download,
  Edit,
  DollarSign,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";

interface AccountPayable {
  id: number;
  due_date: string;
  paid_date: string | null;
  competence_date: string | null;
  company_name: string;
  description: string;
  category_id: number | null;
  cost_center: string | null;
  bank_account_id: number | null;
  bank_account: string;
  amount: number;
  outstanding_amount: number;
  total_paid: number;
  is_grouped: number;
  order_ids: string;
  total_pieces: number;
  is_paid: number;
  parent_id: number | null;
  installment_number: number | null;
  total_installments: number | null;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

export default function ContasPagarPage() {
  const firstDay = getFirstDayOfMonth();
  const lastDay = getLastDayOfMonth();

  const [viewType, setViewType] = useState<"competencia" | "caixa">("caixa");
  const [statusFilter, setStatusFilter] = useState<"pending" | "paid" | "all">("pending");
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedContact, setSelectedContact] = useState("");
  const [descriptionFilter, setDescriptionFilter] = useState("");
  const [amountFilter, setAmountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [agendarModalOpen, setAgendarModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pagarModalOpen, setPagarModalOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(firstDay);
  const [tempEndDate, setTempEndDate] = useState(lastDay);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [payingAccountId, setPayingAccountId] = useState<number | null>(null);

  useEffect(() => {
    fetchPayables();
    fetchCategories();
  }, [statusFilter]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const expenseCategories = (data.categories || []).filter(
          (cat: Category) => cat.type === "expense"
        );
        setCategories(expenseCategories);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const fetchPayables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/accounts-payable?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with accounts property
        setPayables(Array.isArray(data) ? data : (data.accounts || []));
      }
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayAccount = (accountId: number) => {
    setPayingAccountId(accountId);
    setPagarModalOpen(true);
  };

  const handleDeletePayable = async (accountId: number) => {
    if (!confirm("Excluir este pagamento? Esta ação não pode ser desfeita.")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/accounts-payable/${accountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchPayables();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Erro ao excluir");
      }
    } catch (error) {
      console.error("Erro ao excluir conta a pagar:", error);
      alert("Erro ao excluir");
    } finally {
      setLoading(false);
    }
  };

  const handleReversePayable = async (accountId: number) => {
    if (!confirm("Deseja estornar este pagamento? A conta voltará para o status 'A Pagar'.")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/accounts-payable/${accountId}/reverse`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchPayables();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Erro ao estornar pagamento");
      }
    } catch (error) {
      console.error("Erro ao estornar pagamento:", error);
      alert("Erro ao estornar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  const handleClearFilters = () => {
    const firstDay = getFirstDayOfMonth();
    const lastDay = getLastDayOfMonth();
    setTempStartDate(firstDay);
    setTempEndDate(lastDay);
    setStartDate(firstDay);
    setEndDate(lastDay);
    setStatusFilter("pending");
    setSelectedContact("");
    setDescriptionFilter("");
    setAmountFilter("");
    setCategoryFilter("all");
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const filteredPayables = payables.filter((item) => {
    // For competencia view, use competence_date. For caixa view, use paid_date if available, otherwise due_date
    let itemDateStr: string;
    if (viewType === "competencia") {
      itemDateStr = (item.competence_date || item.due_date).split("T")[0];
    } else {
      itemDateStr = (item.paid_date || item.due_date).split("T")[0];
    }
    
    const startDateStr = startDate.split("T")[0];
    const endDateStr = endDate.split("T")[0];

    const dateMatch = itemDateStr >= startDateStr && itemDateStr <= endDateStr;
    const contactMatch =
      !selectedContact || item.company_name.toLowerCase().includes(selectedContact.toLowerCase());
    const descriptionMatch =
      !descriptionFilter || (item.description || "").toLowerCase().includes(descriptionFilter.toLowerCase());
    const amountMatch = !amountFilter || Math.abs(item.amount).toString().includes(amountFilter);

    return dateMatch && contactMatch && descriptionMatch && amountMatch;
  });

  const totalCategoryAmount = filteredPayables.reduce((sum, item) => sum + item.amount, 0);
  const totalOutstanding = filteredPayables.reduce((sum, item) => sum + item.outstanding_amount, 0);

  return (
    <div className="p-4 lg:p-6 bg-[#f7f8fa] min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas a Pagar</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie e acompanhe seus pagamentos</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => setAgendarModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Agendar Pagamento
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Tabs value={viewType} onValueChange={(v) => setViewType(v as "competencia" | "caixa")}>
                <TabsList>
                  <TabsTrigger value="competencia">Competência</TabsTrigger>
                  <TabsTrigger value="caixa">Caixa</TabsTrigger>
                </TabsList>
              </Tabs>

              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "pending" | "paid" | "all")}>
                <TabsList>
                  <TabsTrigger value="pending">A Pagar</TabsTrigger>
                  <TabsTrigger value="paid">Pagas</TabsTrigger>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {viewType === "competencia" ? "Data previsto para - De" : "Data de vencimento - De"}
                </label>
                <Input type="date" value={tempStartDate} onChange={(e) => setTempStartDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Até</label>
                <Input type="date" value={tempEndDate} onChange={(e) => setTempEndDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                <Input
                  placeholder="Selecione um contato..."
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                />
              </div>

              <div className="space-y-2 flex items-end gap-2">
                <Button onClick={handleSearch} className="flex-1 h-11">
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </Button>
                <Button variant="outline" onClick={handleClearFilters} className="flex-1 h-11">
                  <Filter className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição ou Referência
                </label>
                <Input
                  placeholder="Filtrar por descrição..."
                  value={descriptionFilter}
                  onChange={(e) => setDescriptionFilter(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Valor pago</label>
                <Input placeholder="Filtrar por valor..." value={amountFilter} onChange={(e) => setAmountFilter(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>

                  <SelectContent className="max-h-[320px] overflow-y-auto">
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-600 dark:text-gray-400">{filteredPayables.length} itens selecionados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Centro de custo</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor categoria/centro de custo</TableHead>
                  <TableHead className="text-right">Valor pago</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Nenhum pagamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayables.map((item) => {
                    // Determine which date to display based on viewType
                    const displayDate = viewType === "competencia" 
                      ? (item.competence_date || item.due_date)
                      : (item.paid_date || item.due_date);
                    
                    return (
                      <TableRow 
                        key={item.id}
                        className={item.is_paid ? "bg-[#1ed41538]" : ""}
                      >
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {item.is_paid && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            {formatDateBR(displayDate)}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.company_name}</TableCell>
                        <TableCell className="max-w-[420px]">
                          <div className="truncate">
                            {item.description}
                            {item.installment_number && item.total_installments && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({item.installment_number}/{item.total_installments})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{item.cost_center || "-"}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{item.bank_account || "-"}</TableCell>

                        <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                          ({formatCurrency(Math.abs(item.amount))})
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-700 dark:text-red-300">
                          ({formatCurrency(Math.abs(item.outstanding_amount))})
                        </TableCell>

                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-44">
                              {!item.is_paid ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingAccountId(item.id);
                                      setEditModalOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handlePayAccount(item.id)}
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Pagar
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => handleDeletePayable(item.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Excluir
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleReversePayable(item.id)}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  Estornar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {filteredPayables.length > 0 && (
                  <TableRow className="bg-gray-50 dark:bg-gray-800 font-bold">
                    <TableCell colSpan={6}>Total</TableCell>
                    <TableCell className="text-right text-red-600 dark:text-red-400">
                      ({formatCurrency(Math.abs(totalCategoryAmount))})
                    </TableCell>
                    <TableCell className="text-right text-red-700 dark:text-red-300">
                      ({formatCurrency(Math.abs(totalOutstanding))})
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NovoPagamentoModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) setEditingAccountId(null);
        }}
        accountId={editingAccountId}
        onSaved={fetchPayables}
      />

      <AgendarPagamentoModal
        open={agendarModalOpen}
        onOpenChange={setAgendarModalOpen}
        onSaved={fetchPayables}
      />

      <PagarModal
        open={pagarModalOpen}
        onOpenChange={(open) => {
          setPagarModalOpen(open);
          if (!open) setPayingAccountId(null);
        }}
        payableId={payingAccountId || undefined}
        onSaved={fetchPayables}
      />
    </div>
  );
}
