import { useEffect, useState } from "react";
import { Outlet, useNavigate, NavLink } from "react-router";
import { useAuth } from "@/react-app/contexts/AuthContext";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Landmark,
  FolderOpen,
  Target,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronDown,
  CloudUpload,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Avatar, AvatarFallback } from "@/react-app/components/ui/avatar";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/react-app/components/ui/dropdown-menu";
import { MigrationDialog } from "@/react-app/components/MigrationDialog";

const menuItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/lancamentos", label: "Lançamentos", icon: FileText },
  { path: "/contas-pagar", label: "Contas a Pagar", icon: Receipt },
  { path: "/contas-receber", label: "Contas a Receber", icon: Receipt },
  { path: "/dividas", label: "Minhas Dívidas", icon: Receipt },
  { path: "/extratos", label: "Extratos", icon: Receipt },
  { path: "/contas", label: "Contas", icon: Landmark },
  { path: "/categorias", label: "Categorias", icon: FolderOpen },
  { path: "/centro-custo", label: "Centro de Custo", icon: Target },
  { path: "/clientes-fornecedores", label: "Clientes e Fornecedores", icon: Users },
  { path: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const { companies, activeCompanyId, setActiveCompanyId } = useFinanceData();
  
  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];
  
  // Check if there's data in localStorage to migrate
  const hasLocalData = companies.length > 0;
  
  // Sidebar background color
  const sidebarBgColor = "#001429";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    // NÃO limpar localStorage - os dados devem persistir entre sessões
    await logout();
    navigate("/login");
  };

  const handleCompanyChange = (companyId: string) => {
    if (companyId !== activeCompanyId) {
      setActiveCompanyId(companyId);
      // Recarrega a página para atualizar todos os dados
      window.location.reload();
    }
  };

  const userName = user.name || user.email.split("@")[0];
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Mobile Header */}
      <div className="lg:hidden border-b border-white/20 px-4 py-3 flex items-center justify-between sticky top-0 z-40" style={{ backgroundColor: sidebarBgColor }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <span className="font-bold text-lg text-white">Kryzer</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:bg-white/10"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: sidebarBgColor, borderColor: sidebarBgColor }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10 hidden lg:block space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">Kryzer</h1>
                <p className="text-xs text-white/60">Finanças</p>
              </div>
            </div>

            {/* Company Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-white/80 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {activeCompany?.name || "Selecione"}
                      </p>
                      <p className="text-xs text-white/60">Empresa ativa</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/60 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Suas Empresas
                </div>
                <DropdownMenuSeparator />
                {companies.map(company => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => handleCompanyChange(company.id)}
                    className={company.id === activeCompanyId ? "bg-accent" : ""}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    <span className="flex-1">{company.name}</span>
                    {company.id === activeCompanyId && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar empresas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback className="bg-white/20 text-white">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">{userName}</p>
                <p className="text-xs text-white/60 truncate">{user.email}</p>
              </div>
            </div>
            
            {/* Migration Button - only show if there's data */}
            {hasLocalData && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white mb-2 bg-blue-600/20 hover:bg-blue-600/30"
                onClick={() => setMigrationDialogOpen(true)}
              >
                <CloudUpload className="h-4 w-4" />
                Migrar para Nuvem
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64">
        <Outlet />
      </main>
      
      {/* Migration Dialog */}
      <MigrationDialog 
        open={migrationDialogOpen} 
        onOpenChange={setMigrationDialogOpen}
      />
    </div>
  );
}
