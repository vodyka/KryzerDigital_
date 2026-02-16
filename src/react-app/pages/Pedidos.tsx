import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Plus,
  Eye,
  Trash2,
  DollarSign,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Search,
  ChevronDown,
  Package,
  ShoppingBag,
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
import CreateOrderModal from "@/react-app/components/CreateOrderModal";
import OrderDetailsModal from "@/react-app/components/OrderDetailsModal";
import ReceiveOrderModal from "@/react-app/components/ReceiveOrderModal";
import OrderTypeSelectionModal from "@/react-app/components/OrderTypeSelectionModal";
import SmartOrderModal from "@/react-app/components/SmartOrderModal";
import SpreadsheetOrderModal from "@/react-app/components/SpreadsheetOrderModal";
import ConfirmDialog from "@/react-app/components/ConfirmDialog";
import CreatePayablesModal from "@/react-app/components/CreatePayablesModal";
import * as ExcelJS from "exceljs";
import { apiGet, apiDelete, apiRequest } from "@/react-app/lib/api";
import { generateOrderPDF } from "@/react-app/lib/orderPdfGenerator";
import { Printer } from "lucide-react";

interface DialogState {
  open: boolean;
  type: "confirm" | "alert" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function PedidosPage() {
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSmartOrderModal, setShowSmartOrderModal] = useState(false);
  const [showSpreadsheetModal, setShowSpreadsheetModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showCreatePayablesModal, setShowCreatePayablesModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [hasUserTemplate, setHasUserTemplate] = useState(false);
  const [hasSystemTemplate, setHasSystemTemplate] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "alert",
    title: "",
    message: "",
  });

  useEffect(() => {
    loadOrders();
    checkTemplate();
  }, []);

  const showDialog = (
    type: "confirm" | "alert" | "success" | "error",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setDialog({ open: true, type, title, message, onConfirm });
  };

  const closeDialog = () => {
    setDialog({ ...dialog, open: false });
  };

  const checkTemplate = async () => {
    try {
      const systemData = await apiGet("/api/export-templates/order_receipt/system");
      setHasSystemTemplate(!!systemData.template_url);

      const token = localStorage.getItem("token");
      if (token) {
        const userData = await apiGet("/api/export-templates/order_receipt");
        setHasUserTemplate(!!userData.template);
      }
    } catch (error) {
      console.error("Error checking template:", error);
    }
  };

  const handleUploadTemplate = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "order_receipt");

      const response = await apiRequest("/api/export-templates", {
        method: "POST",
        body: formData,
        headers: {}, // Remove Content-Type to let browser set it with boundary
      });

      if (response.ok) {
        await checkTemplate();
        setShowTemplateUpload(false);
        showDialog("success", "Sucesso", "Modelo carregado com sucesso!");
      } else {
        showDialog("error", "Erro", "Erro ao carregar modelo");
      }
    } catch (error) {
      console.error("Error uploading template:", error);
      showDialog("error", "Erro", "Erro ao carregar modelo");
    }
  };

  const handleDeleteTemplate = async () => {
    showDialog(
      "confirm",
      "Confirmar exclusão",
      "Deseja realmente excluir o modelo personalizado? Você voltará a usar o template do sistema.",
      async () => {
        try {
          await apiDelete("/api/export-templates/order_receipt");
          await checkTemplate();
          showDialog("success", "Sucesso", "Modelo excluído com sucesso!");
        } catch (error) {
          console.error("Error deleting template:", error);
          showDialog("error", "Erro", "Erro ao excluir modelo");
        }
      }
    );
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/orders");

      const ordersWithReceipts = await Promise.all(
        (data.orders || []).map(async (order: any) => {
          try {
            const receiptData = await apiGet(`/api/order-receipts/${order.id}`);
            return {
              ...order,
              has_receipts: receiptData.receipts && receiptData.receipts.length > 0,
            };
          } catch {
            return { ...order, has_receipts: false };
          }
        })
      );

      setOrders(ordersWithReceipts);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderCreated = () => loadOrders();

  const handleDeleteOrder = async (orderId: number) => {
    showDialog("confirm", "Confirmar exclusão", "Deseja realmente excluir este pedido?", async () => {
      try {
        await apiDelete(`/api/orders/${orderId}`);
        loadOrders();
        showDialog("success", "Sucesso", "Pedido excluído com sucesso!");
      } catch (error) {
        console.error("Error deleting order:", error);
        showDialog("error", "Erro", "Erro ao excluir pedido");
      }
    });
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const response = await apiRequest(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        loadOrders();
        showDialog("success", "Sucesso", "Status atualizado com sucesso!");
      } else {
        const data = await response.json();
        showDialog("error", "Erro ao atualizar status", data.error || "Erro ao atualizar status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showDialog("error", "Erro", "Erro ao atualizar status");
    }
  };

  const handleCreatePayables = (order: any) => {
    setSelectedOrder(order);
    setShowCreatePayablesModal(true);
  };

  const handleRemovePayables = async (orderId: number) => {
    showDialog("confirm", "Remover contas a pagar", "Deseja remover as contas a pagar deste pedido?", async () => {
      try {
        await apiDelete(`/api/orders/${orderId}/remove-payables`);
        showDialog("success", "Sucesso", "Contas a pagar removidas com sucesso!");
        loadOrders();
      } catch (error) {
        console.error("Error removing payables:", error);
        showDialog("error", "Erro", "Erro ao remover contas a pagar");
      }
    });
  };

  const handleToggleUrgency = async (orderId: number, currentUrgent: boolean) => {
    try {
      const response = await apiRequest(`/api/orders/${orderId}/urgency`, {
        method: "PATCH",
        body: JSON.stringify({ is_urgent: !currentUrgent }),
      });

      if (response.ok) {
        loadOrders();
        showDialog("success", "Sucesso", currentUrgent ? "Urgência removida!" : "Pedido marcado como urgente!");
      } else {
        showDialog("error", "Erro", "Erro ao atualizar urgência");
      }
    } catch (error) {
      console.error("Error updating urgency:", error);
      showDialog("error", "Erro", "Erro ao atualizar urgência");
    }
  };

  const handlePrintOrder = async (orderId: number) => {
    try {
      const data = await apiGet(`/api/orders/${orderId}`);
      
      if (!data.order || !data.items) {
        showDialog("error", "Erro", "Não foi possível carregar os dados do pedido");
        return;
      }

      const order = data.order;
      const items = data.items;

      const getSupplierName = () => {
        if (order.person_type === "fisica") {
          return order.name || "—";
        }
        return order.trade_name || order.company_name || "—";
      };

      // Buscar dados da empresa
      let companyName = "—";
      try {
        const companiesData = await apiGet("/api/companies");
        if (companiesData.companies && companiesData.companies.length > 0) {
          const company = companiesData.companies[0];
          companyName = company.razao_social || company.name || "—";
        }
      } catch (error) {
        console.error("Error loading company data:", error);
      }

      generateOrderPDF({
        order_number: order.order_number,
        supplier_name: getSupplierName(),
        supplier_code: order.supplier_id,
        created_at: order.created_at,
        items: items.map((item: any) => ({
          sku: item.sku,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
          subtotal: parseFloat(item.subtotal),
          image_url: item.image_url,
        })),
        total_amount: parseFloat(order.total_amount),
        company_name: companyName,
      });
    } catch (error) {
      console.error("Error printing order:", error);
      showDialog("error", "Erro", "Erro ao gerar PDF do pedido");
    }
  };

  const handleExportReceipt = async (orderId: number) => {
    try {
      const result = await apiGet(`/api/order-receipts/${orderId}/export-xlsx`);

      if (!result.success) {
        showDialog("error", "Erro", result.error || "Erro ao exportar dados de recebimento");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      let worksheet: ExcelJS.Worksheet;

      if (result.templateBase64) {
        const binaryString = atob(result.templateBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

        await workbook.xlsx.load(bytes.buffer);
        worksheet = workbook.worksheets[0];
        if (!worksheet) throw new Error("Template XLSX sem planilha");

        const rowCount = worksheet.rowCount;
        if (rowCount > 1) worksheet.spliceRows(2, rowCount - 1);

        let currentRow = 2;
        result.dataRows.forEach((rowData: any) => {
          const row = worksheet.getRow(currentRow);
          row.getCell(1).value = rowData.supplier_id;
          row.getCell(2).value = rowData.sku;
          row.getCell(3).value = rowData.quantity;
          row.getCell(4).value = rowData.currency;
          row.getCell(5).value = rowData.unit_cost;
          row.getCell(6).value = rowData.supplier_name;
          row.getCell(7).value = rowData.discount;
          row.getCell(8).value = rowData.shipping;
          row.getCell(9).value = rowData.other_costs;
          row.getCell(10).value = rowData.tracking_code;
          row.getCell(11).value = rowData.notes;
          row.commit();
          currentRow++;
        });
      } else {
        worksheet = workbook.addWorksheet("Recebimento");
        const headerRow = worksheet.getRow(1);
        headerRow.values = [
          "ID\nFornecedor", "SKU", "Quantidade", "Moeda", "Custo\nUnitário",
          "Nome do\nFornecedor", "Desconto", "Custo de\nFrete", "Outros\nCustos",
          "Código de\nRastreio", "Observação",
        ];
        headerRow.font = { bold: true };
        headerRow.alignment = { wrapText: true, vertical: "top" };
        headerRow.height = 40;
        worksheet.columns = [
          { width: 12 }, { width: 15 }, { width: 12 }, { width: 10 }, { width: 12 },
          { width: 20 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 25 },
        ];
        result.dataRows.forEach((rowData: any) => {
          worksheet.addRow([
            rowData.supplier_id, rowData.sku, rowData.quantity, rowData.currency, rowData.unit_cost,
            rowData.supplier_name, rowData.discount, rowData.shipping, rowData.other_costs,
            rowData.tracking_code, rowData.notes,
          ]);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      
      showDialog("success", "Sucesso", "Planilha exportada com sucesso!");
    } catch (error) {
      console.error("Error exporting receipt:", error);
      showDialog("error", "Erro", "Erro ao exportar planilha");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string } } = {
      Pendente: { bg: "bg-yellow-50 dark:bg-yellow-900/15", text: "text-yellow-700 dark:text-yellow-300" },
      Produção: { bg: "bg-orange-50 dark:bg-orange-900/15", text: "text-orange-700 dark:text-orange-300" },
      Trânsito: { bg: "bg-blue-50 dark:bg-blue-900/15", text: "text-blue-700 dark:text-blue-300" },
      Completo: { bg: "bg-green-50 dark:bg-green-900/15", text: "text-green-700 dark:text-green-300" },
      Cancelado: { bg: "bg-red-50 dark:bg-red-900/15", text: "text-red-700 dark:text-red-300" },
    };
    const config = statusConfig[status] || statusConfig.Pendente;
    return (
      <Badge className={`${config.bg} ${config.text} hover:${config.bg} border border-black/5 dark:border-white/10`}>
        {status}
      </Badge>
    );
  };

  const getSupplierName = (order: any) => {
    if (order.person_type === "fisica") return order.name || "—";
    return order.trade_name || order.company_name || "—";
  };

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "Pendente").length,
      inTransit: orders.filter((o) => o.status === "Trânsito").length,
      completed: orders.filter((o) => o.status === "Completo").length,
      totalRevenue,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        q === "" ||
        String(order.order_number || "").toLowerCase().includes(q) ||
        getSupplierName(order).toLowerCase().includes(q);
      const matchesStatus = statusFilter === "" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  return (
    <div className="p-4 lg:p-6 bg-[#f7f8fa] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">Pedidos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Gerencie pedidos e acompanhe compras</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {hasUserTemplate ? (
            <Button variant="outline" onClick={handleDeleteTemplate} className="h-9">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Remover Meu Template
            </Button>
          ) : hasSystemTemplate ? (
            <Button variant="outline" onClick={() => setShowTemplateUpload(true)} className="h-9">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Usar Meu Template
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setShowTemplateUpload(true)} className="h-9">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Carregar Modelo XLSX
            </Button>
          )}
          <Button variant="outline" onClick={loadOrders} className="h-9">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowTypeSelection(true)} className="h-9">
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/15 rounded-lg flex items-center justify-center border border-black/5 dark:border-white/10">
                <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total de Pedidos</p>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-amber-50 dark:bg-amber-900/15 rounded-lg flex items-center justify-center border border-black/5 dark:border-white/10">
                <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Pendentes</p>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pending}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-cyan-50 dark:bg-cyan-900/15 rounded-lg flex items-center justify-center border border-black/5 dark:border-white/10">
                <Package className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Em Trânsito</p>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.inTransit}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-green-50 dark:bg-green-900/15 rounded-lg flex items-center justify-center border border-black/5 dark:border-white/10">
                <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Valor Total</p>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(stats.totalRevenue)}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200/60 dark:border-gray-800/60 shadow-sm overflow-hidden">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <CardTitle className="text-base">Pedidos</CardTitle>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[220px] h-9 border-gray-200/60 dark:border-gray-800/60"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200/60 dark:border-gray-800/60 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 h-9"
              >
                <option value="">Todos os Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Produção">Produção</option>
                <option value="Trânsito">Trânsito</option>
                <option value="Completo">Completo</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200/60 dark:border-gray-800/60 bg-gray-50/70 dark:bg-gray-900/40">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Pedido
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Fornecedor
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Itens
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500 text-sm">
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500 text-sm">
                      Nenhum pedido encontrado
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100/70 dark:border-gray-800/60 hover:bg-gray-50/70 dark:hover:bg-gray-900/40"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                          {order.order_number}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {getSupplierName(order)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-gray-900 dark:text-white text-sm">{order.item_count || 0} itens</div>
                        <div className="text-xs text-gray-500">{order.total_pieces || 0} peças</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-white text-sm">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          parseFloat(order.total_amount)
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(order.status)}
                          {order.has_payables_created === 1 && (
                            <Badge className="bg-blue-50 dark:bg-blue-900/15 text-blue-700 dark:text-blue-300 hover:bg-blue-50 border border-black/5 dark:border-white/10">
                              Lançado
                            </Badge>
                          )}
                          {order.is_urgent === 1 && (
                            <Badge className="bg-red-50 dark:bg-red-900/15 text-red-700 dark:text-red-300 hover:bg-red-50 border border-black/5 dark:border-white/10">
                              <AlertCircle className="w-3.5 h-3.5 mr-1" />
                              Urgência
                            </Badge>
                          )}
                          {order.has_receipts && (
                            <Badge className="bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-300 hover:bg-green-50 border border-black/5 dark:border-white/10">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Recebido
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 text-sm">
                        {new Date(order.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3.5 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 px-2">
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setShowDetailsModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handlePrintOrder(order.id)}>
                              <Printer className="w-4 h-4 mr-2" />
                              Imprimir Pedido
                            </DropdownMenuItem>

                            {order.status !== "Completo" && order.status !== "Cancelado" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setShowReceiveModal(true);
                                }}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                Receber Pedido
                              </DropdownMenuItem>
                            )}

                            {order.has_receipts && (
                              <DropdownMenuItem onClick={() => handleExportReceipt(order.id)}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Exportar XLSX
                              </DropdownMenuItem>
                            )}

                            {order.status === "Completo" && order.has_payables_created !== 1 && (
                              <DropdownMenuItem onClick={() => handleCreatePayables(order)}>
                                <DollarSign className="w-4 h-4 mr-2" />
                                Lançar Contas
                              </DropdownMenuItem>
                            )}

                            {order.has_payables_created === 1 && (
                              <DropdownMenuItem onClick={() => handleRemovePayables(order.id)}>
                                <DollarSign className="w-4 h-4 mr-2" />
                                Remover Contas
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "Pendente")}>
                              Mudar para Pendente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "Produção")}>
                              Mudar para Produção
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "Trânsito")}>
                              Mudar para Trânsito
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "Completo")}>
                              Mudar para Completo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(order.id, "Cancelado")}>
                              Mudar para Cancelado
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {order.status === "Produção" && (
                              <DropdownMenuItem onClick={() => handleToggleUrgency(order.id, order.is_urgent === 1)}>
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {order.is_urgent === 1 ? "Remover Urgência" : "Marca Urgente"}
                              </DropdownMenuItem>
                            )}

                            {order.status === "Produção" && <DropdownMenuSeparator />}

                            <DropdownMenuItem onClick={() => handleDeleteOrder(order.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir Pedido
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showTypeSelection && (
        <OrderTypeSelectionModal
          onClose={() => setShowTypeSelection(false)}
          onSelectType={(type) => {
            setShowTypeSelection(false);
            if (type === "manual") setShowCreateModal(true);
            else if (type === "smart") setShowSmartOrderModal(true);
            else if (type === "spreadsheet") setShowSpreadsheetModal(true);
          }}
        />
      )}

      {showCreateModal && <CreateOrderModal onClose={() => setShowCreateModal(false)} onOrderCreated={handleOrderCreated} />}
      {showSmartOrderModal && <SmartOrderModal onClose={() => setShowSmartOrderModal(false)} onOrderCreated={handleOrderCreated} />}
      {showSpreadsheetModal && <SpreadsheetOrderModal onClose={() => setShowSpreadsheetModal(false)} onOrderCreated={handleOrderCreated} />}

      {showDetailsModal && selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedOrderId(null);
          }}
          onOrderUpdated={handleOrderCreated}
        />
      )}

      {showReceiveModal && selectedOrderId && (
        <ReceiveOrderModal
          orderId={selectedOrderId}
          onClose={() => {
            setShowReceiveModal(false);
            setSelectedOrderId(null);
          }}
          onReceiptComplete={handleOrderCreated}
        />
      )}

      {showCreatePayablesModal && selectedOrder && (
        <CreatePayablesModal
          orderId={selectedOrder.id}
          orderTotal={parseFloat(selectedOrder.total_amount)}
          orderDate={selectedOrder.created_at.split('T')[0]}
          isGrouped={selectedOrder.is_grouped === 1}
          onClose={() => {
            setShowCreatePayablesModal(false);
            setSelectedOrder(null);
          }}
          onSuccess={() => {
            loadOrders();
            setShowCreatePayablesModal(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {showTemplateUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200/60 dark:border-gray-800/60">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Carregar Modelo XLSX</h3>
              <button
                onClick={() => setShowTemplateUpload(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Faça upload de uma planilha Excel (.xlsx) para usar como modelo. A formatação da primeira linha (rich
                text) será preservada, e os dados serão inseridos a partir da linha 2.
              </p>
              <Input
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadTemplate(file);
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={dialog.open}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
      />
    </div>
  );
}
