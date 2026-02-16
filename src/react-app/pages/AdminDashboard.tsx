import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Shield,
  Users,
  Store,
  Settings,
  BarChart3,
  Layout,
  FileText,
  Star,
  Upload,
  Menu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Check if user is logged in
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      
      if (!token || !userStr) {
        navigate("/login");
        return;
      }

      // Verify admin status with backend
      const response = await fetch("/api/admin/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.is_admin) {
          setIsAdmin(true);
        } else {
          alert("Acesso negado. Você não tem permissões de administrador.");
          navigate("/dashboard");
        }
      } else {
        alert("Erro ao verificar permissões de administrador.");
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Failed to check admin access:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const adminModules = [
    {
      title: "Pontos de Coleta",
      description: "Gerenciar pontos de coleta, horários e marketplaces",
      icon: MapPin,
      href: "/admin/collection-points",
      color: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "Importação em Massa",
      description: "Importar múltiplos pontos de coleta via planilha",
      icon: Upload,
      href: "/admin/collection-points/bulk-import",
      color: "from-teal-500 to-cyan-600",
      iconBg: "bg-teal-100",
      iconColor: "text-teal-600",
    },
    {
      title: "Avaliações",
      description: "Gerenciar avaliações dos pontos de coleta",
      icon: Star,
      href: "/admin/reviews",
      color: "from-amber-500 to-orange-600",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      title: "Templates de Exportação",
      description: "Gerenciar templates para exportação de dados",
      icon: FileText,
      href: "/admin/templates",
      color: "from-indigo-500 to-purple-600",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      title: "Configuração de Layout",
      description: "Personalizar aparência e layout do sistema",
      icon: Layout,
      href: "/admin/layout-config",
      color: "from-pink-500 to-rose-600",
      iconBg: "bg-pink-100",
      iconColor: "text-pink-600",
    },
    {
      title: "Hierarquia de Menus",
      description: "Configurar visibilidade de menus por plano e usuário",
      icon: Menu,
      href: "/admin/menu-visibility",
      color: "from-violet-500 to-purple-600",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      title: "Usuários",
      description: "Gerenciar usuários e permissões",
      icon: Users,
      href: "/admin/users",
      color: "from-blue-500 to-indigo-600",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      disabled: true,
    },
    {
      title: "Marketplaces",
      description: "Gerenciar marketplaces disponíveis",
      icon: Store,
      href: "/admin/marketplaces",
      color: "from-purple-500 to-pink-600",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      disabled: true,
    },
    {
      title: "Relatórios",
      description: "Visualizar estatísticas e relatórios do sistema",
      icon: BarChart3,
      href: "/admin/reports",
      color: "from-orange-500 to-red-600",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      disabled: true,
    },
    {
      title: "Configurações Gerais",
      description: "Configurações gerais do sistema",
      icon: Settings,
      href: "/admin/settings",
      color: "from-gray-500 to-slate-600",
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Painel do Administrador</h1>
                <p className="text-xs text-gray-500">Gerenciar recursos do sistema</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Shield className="w-6 h-6" />
              Bem-vindo ao Painel Administrativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-100">
              Você tem acesso total às funcionalidades de administração do sistema.
              Selecione um módulo abaixo para começar.
            </p>
          </CardContent>
        </Card>

        {/* Admin Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module) => (
            <Card
              key={module.title}
              className={`group cursor-pointer transition-all hover:shadow-xl ${
                module.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:-translate-y-1"
              }`}
              onClick={() => !module.disabled && navigate(module.href)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 ${module.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 ${
                      !module.disabled && "group-hover:scale-110"
                    } transition`}
                  >
                    <module.icon className={`w-6 h-6 ${module.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                      {module.title}
                      {module.disabled && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Em breve
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">{module.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pontos de Coleta</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Marketplaces</p>
                  <p className="text-2xl font-bold text-gray-900">-</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
