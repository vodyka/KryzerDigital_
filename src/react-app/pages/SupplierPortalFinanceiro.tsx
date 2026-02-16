import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Package,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Badge } from "@/react-app/components/ui/badge";

interface AccountPayable {
  id: number;
  grouped_order_number: string | null;
  order_number: string | null;
  description: string;
  amount: number;
  due_date: string;
  competence_date: string;
  payment_date: string | null;
  is_paid: number;
  payment_status: string;
  days_until_due: number;
  order_ids: string | null;
  is_grouped: number;
}

interface GroupedOrderDetail {
  order_id: number;
  order_number: string;
  order_date: string;
  total_amount: number;
  items: any[];
}

export default function SupplierPortalFinanceiro() {
  const [accountsPayable, setAccountsPayable] = useState<AccountPayable[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total_pending: 0,
    total_overdue: 0,
    total_paid_this_month: 0,
  });
  const [selectedGroupedOrder, setSelectedGroupedOrder] = useState<AccountPayable | null>(null);
  const [groupedOrderDetails, setGroupedOrderDetails] = useState<GroupedOrderDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    if (token) {
      loadFinancialData(token);
    }
  }, []);

  useEffect(() => {
    applyFilter();
  }, [activeFilter, accountsPayable]);

  const loadFinancialData = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/portal/financeiro", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAccountsPayable(data.accounts_payable || []);
        setStats(data.stats || { total_pending: 0, total_overdue: 0, total_paid_this_month: 0 });
      }
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (!activeFilter) {
      setFilteredAccounts(accountsPayable);
      return;
    }

    const filtered = accountsPayable.filter(
      (account) => account.payment_status === activeFilter
    );
    setFilteredAccounts(filtered);
  };

  const handleFilterClick = (status: string) => {
    // Play sound effect
    const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE=");
    audio.volume = 0.3;
    audio.play().catch(() => {});

    if (activeFilter === status) {
      setActiveFilter(null);
    } else {
      setActiveFilter(status);
    }
  };

  const handleGroupedOrderClick = async (account: AccountPayable) => {
    if (!account.is_grouped || !account.order_ids) return;

    setSelectedGroupedOrder(account);
    setLoadingDetails(true);

    try {
      const token = localStorage.getItem("portal_token");
      const orderIds = account.order_ids.split(",");
      const details: GroupedOrderDetail[] = [];

      for (const orderId of orderIds) {
        const response = await fetch(`/api/portal/grouped-order/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          details.push(data);
        }
      }

      setGroupedOrderDetails(details);
    } catch (error) {
      console.error("Error loading grouped order details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Não definida";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return {
          label: "Pago",
          icon: CheckCircle2,
          color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        };
      case "overdue":
        return {
          label: "Vencido",
          icon: AlertTriangle,
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        };
      case "pending":
      default:
        return {
          label: "Pendente",
          icon: Clock,
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        };
    }
  };

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
          <p className="text-gray-600 dark:text-gray-400">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Acompanhe os pagamentos e contas a receber
        </p>
      </div>

      {/* Summary Cards - Smaller */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeFilter === "pending" ? "ring-2 ring-yellow-500" : ""
          }`}
          onClick={() => handleFilterClick("pending")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Pendentes
                </p>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(stats.total_pending)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeFilter === "overdue" ? "ring-2 ring-red-500" : ""
          }`}
          onClick={() => handleFilterClick("overdue")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Vencidos
                </p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(stats.total_overdue)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            activeFilter === "paid" ? "ring-2 ring-green-500" : ""
          }`}
          onClick={() => handleFilterClick("paid")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Pagos este Mês
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.total_paid_this_month)}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Indicator */}
      {activeFilter && (
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Filtrando por: {getStatusConfig(activeFilter).label}
          </Badge>
          <button
            onClick={() => setActiveFilter(null)}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Limpar filtro
          </button>
        </div>
      )}

      {/* Accounts Payable Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Contas a Receber</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Histórico de pagamentos e contas pendentes
          </p>
        </CardHeader>
        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {activeFilter ? "Nenhum resultado" : "Nenhuma conta encontrada"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {activeFilter
                  ? "Não há registros com este status."
                  : "Não há registros financeiros para este fornecedor."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Pedido
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Descrição
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Valor
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Lançamento
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Vencimento
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Pagamento
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => {
                    const config = getStatusConfig(account.payment_status);
                    const StatusIcon = config.icon;
                    const isGrouped = account.is_grouped === 1;
                    const displayOrderNumber = isGrouped
                      ? account.grouped_order_number
                      : account.order_number;

                    return (
                      <tr
                        key={account.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                          {displayOrderNumber ? (
                            isGrouped ? (
                              <button
                                onClick={() => handleGroupedOrderClick(account)}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                #{displayOrderNumber}
                              </button>
                            ) : (
                              `#${displayOrderNumber}`
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {account.description}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(Math.abs(account.amount))}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(account.competence_date)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(account.due_date)}
                          </div>
                          {account.payment_status === "pending" && account.days_until_due !== null && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {account.days_until_due > 0
                                ? `${account.days_until_due} dias restantes`
                                : account.days_until_due === 0
                                ? "Vence hoje"
                                : `${Math.abs(account.days_until_due)} dias atrasado`}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {account.is_paid ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="w-4 h-4" />
                              {formatDate(account.payment_date)}
                            </div>
                          ) : (
                            <span className="text-gray-400">Pendente</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={config.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grouped Order Details Modal */}
      {selectedGroupedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Detalhes do Agrupamento #{selectedGroupedOrder.grouped_order_number}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedGroupedOrder.description}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedGroupedOrder(null);
                  setGroupedOrderDetails([]);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="text-center py-8">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
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
                  <p className="text-gray-600 dark:text-gray-400">Carregando detalhes...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedOrderDetails.map((detail) => (
                    <div
                      key={detail.order_id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Pedido #{detail.order_number}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Data: {formatDate(detail.order_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(detail.total_amount)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {detail.items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900/50 rounded"
                          >
                            <div className="flex-shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.product_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.product_name}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                SKU: {item.sku}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.quantity}x
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {formatCurrency(item.total_price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSelectedGroupedOrder(null);
                  setGroupedOrderDetails([]);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
