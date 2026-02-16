import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Package,
  LogOut,
  RefreshCw,
  Eye,
  Download,
  Bell,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { generateOrderPDF } from "@/react-app/components/OrderPDF";

export default function SupplierPortalPage() {
  const navigate = useNavigate();
  const { portalId } = useParams();
  const [supplierName, setSupplierName] = useState("Fornecedor");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    // If accessing via URL with portalId
    if (portalId) {
      const extractedId = portalId.split('-')[0];
      const id = parseInt(extractedId);
      if (isNaN(id)) {
        navigate("/portal");
        return;
      }
      loadSupplierFromId(id);
    } else {
      // If accessing via /portal/fornecedor (after login)
      const supplierStr = localStorage.getItem("supplier");
      if (!supplierStr) {
        navigate("/portal");
        return;
      }
      
      try {
        const supplierData = JSON.parse(supplierStr);
        setSupplierName(supplierData.trade_name || supplierData.company_name || supplierData.name || "Fornecedor");
        setSupplierId(supplierData.id);
        loadOrders(supplierData.id);
      } catch (e) {
        console.error("Erro ao carregar dados do fornecedor", e);
        navigate("/portal");
      }
    }
  }, [navigate, portalId]);

  const loadSupplierFromId = async (id: number) => {
    try {
      const response = await fetch(`/api/suppliers/${id}`);
      const data = await response.json();
      
      if (!response.ok || !data.supplier) {
        navigate("/portal");
        return;
      }
      
      const supplier = data.supplier;
      setSupplierName(supplier.trade_name || supplier.company_name || supplier.name || "Fornecedor");
      setSupplierId(supplier.id);
      
      // Store in localStorage for future use
      localStorage.setItem("supplier", JSON.stringify(supplier));
      
      loadOrders(supplier.id);
    } catch (error) {
      console.error("Error loading supplier:", error);
      navigate("/portal");
    }
  };

  const loadOrders = async (supplierId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders/by-supplier/${supplierId}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("supplier");
    navigate("/portal");
  };

  const handleRefresh = () => {
    if (supplierId) {
      loadOrders(supplierId);
    }
  };

  const handlePrintPDF = async (orderId: number) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      
      if (data.order && data.items) {
        generateOrderPDF({
          order: data.order,
          items: data.items,
          supplierName,
        });
      }
    } catch (error) {
      console.error("Error loading order for PDF:", error);
      alert("Erro ao gerar PDF");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      "Pendente": {
        label: "Pendente",
        className: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300",
        icon: Clock,
      },
      "Produção": {
        label: "Produção",
        className: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300",
        icon: Package,
      },
      "Trânsito": {
        label: "Trânsito",
        className: "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300",
        icon: Truck,
      },
      "Completo": {
        label: "Completo",
        className: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300",
        icon: CheckCircle2,
      },
      "Cancelado": {
        label: "Cancelado",
        className: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300",
        icon: XCircle,
      },
    };

    const config = statusConfig[status] || statusConfig["Pendente"];
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const calculateStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === "Pendente").length,
      production: orders.filter(o => o.status === "Produção").length,
      transit: orders.filter(o => o.status === "Trânsito").length,
      completed: orders.filter(o => o.status === "Completo").length,
      totalValue: orders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0),
    };
    return stats;
  };

  const stats = calculateStats();

  const filteredOrders = orders.filter(order => {
    if (statusFilter === "") return true;
    return order.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Portal do Fornecedor</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{supplierName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pendentes</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Produção</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.production}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Trânsito</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.transit}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completos</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Meus Pedidos</CardTitle>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
              >
                <option value="">Todos Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Produção">Produção</option>
                <option value="Trânsito">Trânsito</option>
                <option value="Completo">Completo</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Pedido</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Itens</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Total</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Pagamento</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        Carregando pedidos...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const createdDate = new Date(order.created_at);
                      
                      return (
                        <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-3 px-4">
                            <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                              {order.order_number}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                            {createdDate.toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.total_pieces || 0} peças
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                            R$ {parseFloat(order.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {order.payment_method}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.payment_type}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(order.status)}
                          </td>
                          <td className="py-3 px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Ações
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintPDF(order.id)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Imprimir PDF
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

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 mt-6 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Atualizações em Tempo Real
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-200">
                  Esta página mostra todos os pedidos atribuídos a você. Os status são atualizados automaticamente 
                  quando a equipe faz alterações. Use o botão "Atualizar" para sincronizar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
