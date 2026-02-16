import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Users,
  Package,
  Search,
  Upload,
  Download,
  UserPlus,
  Pencil,
  Trash2,
  MoreVertical,
  CheckCircle,
  RefreshCw,
  Copy,
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
import SupplierForm from "@/react-app/components/SupplierForm";
import { apiGet, apiDelete, apiPost } from "@/react-app/lib/api";

export default function FornecedoresPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [distributionData, setDistributionData] = useState<{
    purchasesBySupplier: Array<{ name: string; value: number }>;
    ordersBySupplier: Array<{ name: string; count: number }>;
  }>({
    purchasesBySupplier: [],
    ordersBySupplier: []
  });
  const [loadingDistribution, setLoadingDistribution] = useState(false);

  // Load suppliers and activities
  useEffect(() => {
    loadSuppliers();
    loadActivities();
    loadDistributionData();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await apiGet("/api/suppliers");
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const data = await apiGet("/api/activity?limit=5");
      setActivities(data.activities || []);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadDistributionData = async () => {
    setLoadingDistribution(true);
    try {
      const data = await apiGet("/api/supplier-distribution");
      setDistributionData({
        purchasesBySupplier: data.purchasesBySupplier || [],
        ordersBySupplier: data.ordersBySupplier || []
      });
    } catch (error) {
      console.error("Error loading distribution data:", error);
    } finally {
      setLoadingDistribution(false);
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;
    
    try {
      await apiDelete(`/api/suppliers/${id}`);
      loadSuppliers();
      loadActivities();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      alert("Erro ao excluir fornecedor");
    }
  };

  const handleResetPortal = async (id: number) => {
    if (!confirm("Deseja sincronizar o Portal ID deste fornecedor?")) return;
    
    try {
      const data = await apiPost(`/api/suppliers/${id}/reset-portal`);
      alert(data.message);
      loadSuppliers();
      loadActivities();
    } catch (error) {
      console.error("Error resetting portal:", error);
      alert("Erro ao sincronizar portal");
    }
  };

  const copyPortalLink = (supplier: any) => {
    const domain = window.location.hostname;
    const portalUrl = `https://${domain}/portal/${supplier.portal_id}`;
    navigator.clipboard.writeText(portalUrl);
    alert("Link do portal copiado!");
  };

  // Calculate stats
  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === "Ativo").length;
  const inactiveSuppliers = suppliers.filter(s => s.status === "Inativo").length;

  const filteredSuppliers = suppliers.filter((supplier) => {
    const displayName = supplier.person_type === "fisica" ? supplier.name : supplier.company_name;
    const matchesSearch = searchQuery === "" || 
      (displayName && displayName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (supplier.contact_email && supplier.contact_email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "" || supplier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 lg:p-6 bg-[#f7f8fa] min-h-screen">
      {/* Supplier Form Modal */}
      {showForm && (
        <SupplierForm
          onClose={() => {
            setShowForm(false);
            setEditingSupplier(null);
          }}
          onSuccess={() => {
            loadSuppliers();
            loadActivities();
          }}
          supplier={editingSupplier}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestão de Fornecedores
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie fornecedores, produtos e relacionamentos
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Fornecedor
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Fornecedores</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalSuppliers}</h3>
                <p className="text-sm text-gray-500">Cadastrados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Fornecedores Ativos</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{activeSuppliers}</h3>
                <p className="text-sm text-gray-500">Em operação</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/20 rounded-xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Inativos</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{inactiveSuppliers}</h3>
                <p className="text-sm text-gray-500">Desativados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Taxa de Atividade</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">75%</h3>
                <p className="text-sm text-gray-500">Últimas 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Growth Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tendências de Cadastro</CardTitle>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {["7D", "30D", "90D"].map((period) => (
                <button
                  key={period}
                  className="px-3 py-1 text-sm font-medium rounded-md transition-colors hover:bg-white dark:hover:bg-gray-700"
                >
                  {period}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[250px] bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">Gráfico de Tendências</p>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Por Status de Compra (R$)</h6>
                {loadingDistribution ? (
                  <div className="w-full h-[143px] flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Carregando...</p>
                  </div>
                ) : distributionData.purchasesBySupplier.length === 0 ? (
                  <div className="w-full h-[143px] flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-400 text-sm">Sem dados de compras</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={143}>
                    <PieChart>
                      <Pie
                        data={distributionData.purchasesBySupplier}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {distributionData.purchasesBySupplier.map((_entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={['#6366f1', '#10b981', '#f59e0b', '#06b6d4'][index % 4]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              <div>
                <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Por Fornecedor</h6>
                {loadingDistribution ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : distributionData.ordersBySupplier.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-gray-400 text-sm">Nenhum pedido registrado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {distributionData.ordersBySupplier.map((supplier, idx) => {
                      const colors = ['bg-indigo-500', 'bg-green-500', 'bg-amber-500', 'bg-cyan-500'];
                      const maxCount = Math.max(...distributionData.ordersBySupplier.map(s => s.count), 1);
                      return (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]" title={supplier.name}>
                            {supplier.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${colors[idx % 4]}`} 
                                style={{ width: `${(supplier.count / maxCount) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-500 w-4">{supplier.count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Atividade Recente</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadActivities}
              disabled={loadingActivities}
            >
              <RefreshCw className={`w-4 h-4 ${loadingActivities ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingActivities ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Carregando atividades...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Nenhuma atividade registrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {activities.map((activity, idx) => {
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case "create": return UserPlus;
                      case "update": return Pencil;
                      case "sync": return RefreshCw;
                      case "delete": return Trash2;
                      default: return Package;
                    }
                  };
                  
                  const getActivityColor = (type: string) => {
                    switch (type) {
                      case "create": return { text: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20" };
                      case "update": return { text: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" };
                      case "sync": return { text: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20" };
                      case "delete": return { text: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" };
                      default: return { text: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" };
                    }
                  };
                  
                  const getTimeAgo = (dateString: string) => {
                    const date = new Date(dateString);
                    const now = new Date();
                    const diffMs = now.getTime() - date.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    
                    if (diffMins < 1) return "Agora mesmo";
                    if (diffMins < 60) return `${diffMins} minuto${diffMins > 1 ? 's' : ''} atrás`;
                    if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
                    return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
                  };
                  
                  const Icon = getActivityIcon(activity.action_type);
                  const colors = getActivityColor(activity.action_type);
                  
                  return (
                    <div key={idx} className="flex items-start gap-3 p-4">
                      <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getTimeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-2"
                onClick={() => setShowForm(true)}
              >
                <UserPlus className="w-5 h-5" />
                <span className="text-sm">Adicionar</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-2">
                <Upload className="w-5 h-5" />
                <span className="text-sm">Importar</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-2">
                <Download className="w-5 h-5" />
                <span className="text-sm">Exportar</span>
              </Button>
              <Button variant="outline" className="h-auto py-3 flex-col gap-2">
                <Package className="w-5 h-5" />
                <span className="text-sm">Relatório</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Diretório de Fornecedores</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar fornecedores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-[200px]"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os Status</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Pendente">Pendente</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Produtos
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Último Pedido
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-gray-500">Carregando fornecedores...</p>
                    </td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500 font-medium">Nenhum fornecedor encontrado</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Ajuste seus filtros ou adicione novos fornecedores
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => {
                    const displayName = supplier.person_type === "fisica" 
                      ? supplier.name 
                      : supplier.trade_name || supplier.company_name;
                    const displayDoc = supplier.person_type === "fisica"
                      ? supplier.cpf
                      : supplier.cnpj;
                    
                    return (
                      <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-white">
                                {displayName ? displayName.substring(0, 2).toUpperCase() : "FN"}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {displayName || "Nome não informado"}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {displayDoc || "Doc não informado"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {supplier.contact_email || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {supplier.contact_phone || "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            {supplier.product_count || 0}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={
                            supplier.status === "Ativo" ? "bg-green-500 text-white" :
                            "bg-gray-500 text-white"
                          }>
                            {supplier.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {new Date(supplier.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyPortalLink(supplier)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Link do Portal
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPortal(supplier.id)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Sincronizar Portal
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDelete(supplier.id)}
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando 1 a {filteredSuppliers.length} de {filteredSuppliers.length} resultados
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
              <Button variant="default" size="sm">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
