import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Bell,
  Search,
  Sun,
  Moon,
  ChevronDown,
  User,
  LogOut,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  Settings,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { topMenuConfig, isMenuGroup } from "@/react-app/config/menuConfig";
import { useMenuVisibility } from "@/react-app/hooks/useMenuVisibility";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TopbarProps {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  created_at: string;
}

export default function Topbar({ darkMode, setDarkMode }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout, selectedCompany, companies, switchCompany, createCompany } = useAuth();
  const { isMenuVisible } = useMenuVisibility();
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");

  // Fetch notifications on mount and set up polling
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications((data.notifications || []).slice(0, 5)); // Only show 5 most recent
      }
    } catch (error) {
      console.error("Erro ao buscar notificações:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/notifications/unread-count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error("Erro ao buscar contador:", error);
    }
  };

  const handleNotificationsOpen = async (open: boolean) => {
    if (open) {
      await fetchNotifications();
      // Mark all as read when opening
      if (unreadCount > 0) {
        try {
          const token = localStorage.getItem("token");
          await fetch("/api/notifications/mark-all-read", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setUnreadCount(0);
        } catch (error) {
          console.error("Erro ao marcar como lidas:", error);
        }
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSwitchCompany = async (companyId: number) => {
    await switchCompany(companyId);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    
    try {
      await createCompany(newCompanyName.trim());
      setNewCompanyName("");
      setShowCreateCompany(false);
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      alert("Erro ao criar empresa. Tente novamente.");
    }
  };

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";
  const displayPhotoUrl = (user as any)?.photo_url;
  const companyInitials = selectedCompany?.name ? selectedCompany.name.substring(0, 2).toUpperCase() : "EM";

  const handleMenuEnter = (index: number) => {
    setOpenMenuIndex(index);
  };

  const handleMenuLeave = () => {
    setOpenMenuIndex(null);
  };

  const handleMenuItemClick = (href: string) => {
    navigate(href);
    setOpenMenuIndex(null);
  };

  const isActiveRoute = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const hasActiveItem = (item: any): boolean => {
    if (isMenuGroup(item)) {
      return item.categories.some((category) =>
        category.items.some((subItem) => isActiveRoute(subItem.href))
      );
    }
    return false;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[hsl(var(--topbar-bg))] border-b border-gray-700">
      <div className="flex items-center justify-between px-4 py-0 lg:px-6">
        {/* Left Section - Logo & Desktop Menu */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 py-3">
            <div className="text-xl font-bold text-white">Kryzer Digital</div>
          </div>

          {/* Desktop Menu */}
          <nav className="flex items-center gap-1">
            {topMenuConfig.map((item, index) => {
              // Filter top-level menu items
              if (!isMenuGroup(item)) {
                if (!isMenuVisible(item.href)) return null;
              }

              if (isMenuGroup(item)) {
                const isOpen = openMenuIndex === index;
                const hasActive = hasActiveItem(item);

                // Filter categories to only show those with visible items
                let visibleCategories = item.categories
                  .map((category) => ({
                    ...category,
                    items: category.items.filter((subItem) => isMenuVisible(subItem.href)),
                  }))
                  .filter((category) => category.items.length > 0);

                // Add "Gestão de Anúncios" category for Produtos menu (always show Mercado Livre)
                if (item.label === "Produtos") {
                  const marketplaceItems: any[] = [
                    {
                      label: "Rascunhos",
                      href: "/produtos/anuncios/mercadolivre/rascunhos",
                    },
                    {
                      label: "Ativo",
                      href: "/produtos/anuncios/mercadolivre/ativo",
                    },
                    {
                      label: "Criar Anúncio",
                      href: "/produtos/anuncios/mercadolivre/criar",
                    },
                    {
                      label: "Catálogo",
                      href: "/produtos/anuncios/mercadolivre/catalogo",
                    },
                    {
                      label: "Promoções",
                      href: "/produtos/anuncios/mercadolivre/promocoes",
                    }
                  ];

                  visibleCategories.push({
                    title: "Gestão de Anúncios",
                    items: marketplaceItems,
                  });
                }

                // If no visible categories, don't render this menu group
                if (visibleCategories.length === 0) return null;

                return (
                  <div 
                    key={index} 
                    className="relative"
                    onMouseEnter={() => handleMenuEnter(index)}
                    onMouseLeave={handleMenuLeave}
                  >
                    <button
                      className={`flex items-center gap-1 px-4 py-4 text-sm font-medium transition-colors ${
                        isOpen || hasActive
                          ? "text-white bg-white/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {item.label}
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="absolute top-full left-0 pt-1 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                        {/* Two column layout for Produtos menu */}
                        {item.label === "Produtos" ? (
                          <div className="overflow-hidden">
                            {/* Yellow top bar */}
                            <div className="h-1 bg-yellow-400" />
                            
                            <div className="grid grid-cols-2 min-w-[1200px]">
                              {/* Left column - Standard categories */}
                              <div className="p-4 space-y-4">
                                {visibleCategories
                                  .filter((cat) => cat.title !== "Gestão de Anúncios")
                                  .map((category, catIndex) => (
                                    <div key={catIndex}>
                                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                        {category.title}
                                      </div>
                                      <div className="space-y-1">
                                        {category.items.map((subItem, subIndex) => (
                                          <button
                                            key={subIndex}
                                            onClick={() => handleMenuItemClick(subItem.href)}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                              isActiveRoute(subItem.href)
                                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            }`}
                                          >
                                            {subItem.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                              </div>

                              {/* Right column - Gestão de Anúncios */}
                              <div className="p-4 border-l border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/20">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                                  Gestão de Anúncios
                                </div>
                                
                                {/* Logo and menu items in same row */}
                                <div className="flex items-center gap-3">
                                  {/* Logo with badge */}
                                  <div className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                                    <img
                                    src="https://cdn.upseller.cn/us-web/2026-02/mercado.f17a793a.svg"
                                    alt="Mercado Livre"
                                    className="h-4 w-152"
                                    />                                
                                  </div>

                                  {/* Menu items as chips - all in same row */}
                                  <div className="flex items-center gap-2">
                                    {visibleCategories
                                      .filter((cat) => cat.title === "Gestão de Anúncios")
                                      .flatMap((category) => category.items)
                                      .map((subItem: any, idx: number) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleMenuItemClick(subItem.href)}
                                          className={`px-3 py-1.5 rounded-md text-sm transition-colors border whitespace-nowrap ${
                                            isActiveRoute(subItem.href)
                                              ? "bg-blue-600 text-white border-blue-600"
                                              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                          }`}
                                        >
                                          {subItem.label}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Standard layout for other menus */
                          <div className="min-w-[600px] py-2">
                            {visibleCategories.map((category, catIndex) => (
                              <div key={catIndex}>
                                {catIndex > 0 && <div className="my-2 h-px bg-gray-200 dark:bg-gray-700" />}
                                <div className="px-4 py-2">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                  {category.title}
                                </div>
                                <div className="space-y-1">
                                  {category.items.map((subItem, subIndex) => (
                                    <button
                                      key={subIndex}
                                      onClick={() => handleMenuItemClick(subItem.href)}
                                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                        isActiveRoute(subItem.href)
                                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      {subItem.label}
                                    </button>
                                  ))}
                                </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else {
                const isActive = isActiveRoute(item.href);
                return (
                  <button
                    key={index}
                    onClick={() => handleMenuItemClick(item.href)}
                    className={`px-4 py-4 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-white bg-white/10"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              }
            })}
          </nav>
        </div>

        {/* Right Section - Search & Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:block relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20"
            />
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="text-white hover:bg-white/10"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Notifications */}
          <DropdownMenu onOpenChange={handleNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:bg-white/10"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <div className="px-4 py-3 border-b">
                <h6 className="font-semibold">Notificações</h6>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Nenhuma notificação
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="px-4 py-3 cursor-default">
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="justify-center text-blue-600 dark:text-blue-400 font-medium"
                onClick={() => {
                  navigate("/notificacoes");
                }}
              >
                Ver todas as notificações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Configurações
                </p>
                <DropdownMenuItem onClick={() => navigate("/perfil-empresa")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Perfil da Empresa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/integracoes")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Integrações de Loja
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-white hover:bg-white/10 transition-colors">
                {displayPhotoUrl ? (
                  <img
                    src={displayPhotoUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">{userInitials}</span>
                  </div>
                )}
                <span className="hidden md:inline text-white">{user?.name || "Usuário"}</span>
                <ChevronDown className="w-4 h-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* Current Company */}
              {selectedCompany && (
                <>
                  <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      {selectedCompany.logo_url ? (
                        <img
                          src={selectedCompany.logo_url}
                          alt={selectedCompany.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-sm text-white font-semibold">{companyInitials}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {selectedCompany.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Empresa Atual
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Other Companies */}
                  {companies.length > 1 && (
                    <>
                      <div className="px-3 py-2">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                          Alternar Empresa
                        </p>
                        {companies
                          .filter((c) => c.id !== selectedCompany.id)
                          .map((company) => (
                            <button
                              key={company.id}
                              onClick={() => handleSwitchCompany(company.id)}
                              className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              {company.logo_url ? (
                                <img
                                  src={company.logo_url}
                                  alt={company.name}
                                  className="w-8 h-8 rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                                  <span className="text-xs text-white font-semibold">
                                    {company.name.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {company.name}
                              </span>
                            </button>
                          ))}
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Create New Company */}
                  {showCreateCompany ? (
                    <div className="px-3 py-2">
                      <Input
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleCreateCompany()}
                        placeholder="Nome da nova empresa"
                        className="mb-2"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleCreateCompany}
                          disabled={!newCompanyName.trim()}
                          className="flex-1"
                        >
                          Criar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowCreateCompany(false);
                            setNewCompanyName("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <DropdownMenuItem onClick={() => setShowCreateCompany(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Empresa
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                </>
              )}

              {/* User Options */}
              <DropdownMenuItem onClick={() => navigate("/perfil")}>
                <User className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="w-4 h-4 mr-2" />
                    Administrador
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
