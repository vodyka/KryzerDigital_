import { useState, useEffect } from "react";
import {
  Search,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";
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


export default function FinanceiroPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/accounts-payable");
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts-payable/${accountId}/pay`, {
        method: "PATCH",
      });
      
      if (response.ok) {
        loadAccounts();
      } else {
        alert("Erro ao marcar como pago");
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
      alert("Erro ao marcar como pago");
    }
  };

  const handleMarkAsUnpaid = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts-payable/${accountId}/unpay`, {
        method: "PATCH",
      });
      
      if (response.ok) {
        loadAccounts();
      } else {
        alert("Erro ao marcar como pendente");
      }
    } catch (error) {
      console.error("Error marking as unpaid:", error);
      alert("Erro ao marcar como pendente");
    }
  };

  const handleDelete = async (accountId: number) => {
    if (!confirm("Deseja realmente excluir esta conta?")) return;
    
    try {
      const response = await fetch(`/api/accounts-payable/${accountId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        loadAccounts();
      } else {
        alert("Erro ao excluir conta");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Erro ao excluir conta");
    }
  };

  const getSupplierName = (account: any) => {
    if (account.person_type === "fisica") {
      return account.name || "—";
    }
    return account.trade_name || account.company_name || "—";
  };

  const calculateStats = () => {
    const stats = {
      total: accounts.length,
      pending: accounts.filter(a => a.is_paid === 0).length,
      paid: accounts.filter(a => a.is_paid === 1).length,
      totalPending: accounts
        .filter(a => a.is_paid === 0)
        .reduce((sum, a) => sum + parseFloat(a.amount), 0),
      totalPaid: accounts
        .filter(a => a.is_paid === 1)
        .reduce((sum, a) => sum + parseFloat(a.amount), 0),
      overdue: accounts.filter(a => 
        a.is_paid === 0 && new Date(a.due_date) < new Date()
      ).length,
    };
    return stats;
  };

  const stats = calculateStats();

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = searchQuery === "" ||
      getSupplierName(account).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "" || 
      (statusFilter === "paid" && account.is_paid === 1) ||
      (statusFilter === "pending" && account.is_paid === 0);
    
    return matchesSearch && matchesStatus;
  });



  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Main Content */}
      <div>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
              <p className="text-gray-600 dark:text-gray-400">Gerencie contas a pagar</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadAccounts}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total de Contas</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">A Pagar</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      R$ {stats.totalPending.toFixed(2)}
                    </h3>
                    <p className="text-xs text-gray-500">{stats.pending} contas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pagas</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      R$ {stats.totalPaid.toFixed(2)}
                    </h3>
                    <p className="text-xs text-gray-500">{stats.paid} contas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vencidas</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accounts Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle>Contas a Pagar</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Buscar fornecedor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                  >
                    <option value="">Todos Status</option>
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Fornecedor</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Valor</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Vencimento</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Agrupado</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Pedidos</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Carregando contas...
                        </td>
                      </tr>
                    ) : filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          Nenhuma conta encontrada
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((account) => {
                        const dueDate = new Date(account.due_date);
                        const isOverdue = account.is_paid === 0 && dueDate < new Date();
                        const orderIds = account.order_ids ? account.order_ids.split(',') : [];
                        
                        return (
                          <tr key={account.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {getSupplierName(account)}
                              </div>
                              {account.payment_method && (
                                <div className="text-xs text-gray-500">{account.payment_method}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                              R$ {parseFloat(account.amount).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <div className={`text-gray-700 dark:text-gray-300 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                                {dueDate.toLocaleDateString('pt-BR')}
                              </div>
                              {isOverdue && (
                                <div className="text-xs text-red-600 dark:text-red-400">Vencida</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {account.is_grouped === 1 ? (
                                <Badge className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                                  Sim
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300">
                                  Não
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {orderIds.length} pedido{orderIds.length !== 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-gray-500">
                                {account.total_pieces || 0} peças
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {account.is_paid === 1 ? (
                                <Badge className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                                  Pago
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
                                  Pendente
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <ChevronDown className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {account.is_paid === 0 ? (
                                    <DropdownMenuItem onClick={() => handleMarkAsPaid(account.id)}>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Marcar como Pago
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleMarkAsUnpaid(account.id)}>
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Marcar como Pendente
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(account.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 mt-8">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <p>© 2026 Kryzer Digital</p>
              <p>All rights reserved</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
