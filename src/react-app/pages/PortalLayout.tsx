import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router";
import { 
  Building2, 
  LogOut, 
  LayoutDashboard, 
  Package, 
  DollarSign,
  Cog,
  User,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    const supplierId = localStorage.getItem("supplier_id");

    if (!token || !supplierId) {
      navigate("/portal");
      return;
    }

    // Verify token and load supplier data
    fetch(`/api/portal/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Invalid token");
        }
        return res.json();
      })
      .then((data) => {
        setSupplier(data.supplier);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("portal_token");
        localStorage.removeItem("supplier_id");
        navigate("/portal");
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("supplier_id");
    navigate("/portal");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/portal/dashboard" },
    { icon: Cog, label: "Fabricação", href: "/portal/producao" },
    { icon: TrendingUp, label: "Previsão", href: "/portal/previsao" },
    { icon: Package, label: "Pedidos", href: "/portal/pedidos" },
    { icon: DollarSign, label: "Financeiro", href: "/portal/financeiro" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleMenuItemClick = (href: string) => {
    navigate(href);
  };

  const supplierDisplayName = supplier?.person_type === "fisica"
    ? supplier?.name
    : supplier?.trade_name || supplier?.company_name;

  const supplierInitials = supplierDisplayName 
    ? supplierDisplayName.substring(0, 2).toUpperCase() 
    : "FN";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
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
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="sticky top-0 z-30 bg-[hsl(var(--topbar-bg))] border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-0 lg:px-6">
          {/* Left Section - Logo & Menu */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 py-3">
              <Building2 className="w-5 h-5 text-white" />
              <div className="text-lg font-bold text-white">Portal Fornecedor</div>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item, index) => {
                const isItemActive = isActive(item.href);
                const Icon = item.icon;

                return (
                  <button
                    key={index}
                    onClick={() => handleMenuItemClick(item.href)}
                    className={`flex items-center gap-2 px-4 py-4 text-sm font-medium transition-colors ${
                      isItemActive
                        ? "text-white bg-white/10"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Section - User Menu */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Package className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => handleMenuItemClick(item.href)}
                      className={isActive(item.href) ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-white hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">{supplierInitials}</span>
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm text-white font-medium">{supplierDisplayName}</span>
                    <span className="text-xs text-gray-300">ID: {supplier?.portal_id}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {supplierDisplayName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {supplier?.portal_id}
                  </p>
                  {supplier?.person_type === "juridica" && supplier?.company_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {supplier.company_name}
                    </p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/portal/dashboard")}>
                  <User className="w-4 h-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet context={{ supplier }} />
      </main>
    </div>
  );
}
