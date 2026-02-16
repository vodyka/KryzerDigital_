import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Save,
  Shield,
  Users,
  User,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { topMenuConfig, isMenuGroup } from "@/react-app/config/menuConfig";

interface MenuVisibility {
  id: number;
  menu_path: string;
  menu_label: string;
  visibility_type: string;
  hidden_for_user_ids: string | null;
  hidden_for_levels: string | null;
}

interface AppUser {
  id: number;
  email: string;
  full_name: string | null;
  access_level: string;
}

const VISIBILITY_OPTIONS = [
  { value: "visible", label: "Visível para todos", icon: Eye, color: "text-green-600" },
  { value: "hidden_global", label: "Oculto global (todos)", icon: EyeOff, color: "text-red-600" },
  { value: "hidden_non_admin", label: "Oculto (só admin vê)", icon: Shield, color: "text-purple-600" },
  { value: "hidden_levels", label: "Oculto para Planos", icon: Users, color: "text-orange-600" },
  { value: "hidden_specific_users", label: "Oculto para usuários específicos", icon: User, color: "text-blue-600" },
  { value: "visible_specific_users", label: "Visível apenas para usuários específicos", icon: User, color: "text-cyan-600" },
];

const SUBSCRIPTION_LEVELS = [
  { value: "Cristal", label: "Cristal", color: "bg-gray-400" },
  { value: "Topázio", label: "Topázio", color: "bg-yellow-500" },
  { value: "Safira", label: "Safira", color: "bg-blue-500" },
  { value: "Diamante", label: "Diamante", color: "bg-purple-600" },
];

export default function AdminMenuVisibility() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<MenuVisibility[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editingMenu, setEditingMenu] = useState<string | null>(null);
  const [selectedVisibility, setSelectedVisibility] = useState<string>("visible");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    fetchData();
    // Expand all categories by default
    const expanded: Record<string, boolean> = {};
    topMenuConfig.forEach((item) => {
      if (isMenuGroup(item)) {
        item.categories.forEach((cat) => {
          expanded[cat.title] = true;
        });
      }
    });
    setExpandedCategories(expanded);
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [settingsRes, usersRes] = await Promise.all([
        fetch("/api/admin/menu-visibility", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.settings || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMenuVisibility = (menuPath: string): MenuVisibility | null => {
    return settings.find((s) => s.menu_path === menuPath) || null;
  };

  const getVisibilityInfo = (menuPath: string) => {
    const setting = getMenuVisibility(menuPath);
    if (!setting) {
      return VISIBILITY_OPTIONS[0]; // visible
    }
    return VISIBILITY_OPTIONS.find((o) => o.value === setting.visibility_type) || VISIBILITY_OPTIONS[0];
  };

  const getVisibilityLabel = (menuPath: string) => {
    const setting = getMenuVisibility(menuPath);
    if (!setting) return "Visível para todos";

    if (setting.visibility_type === "hidden_levels" && setting.hidden_for_levels) {
      const levels = setting.hidden_for_levels.split(",");
      return `Oculto: ${levels.join(", ")}`;
    }

    return VISIBILITY_OPTIONS.find((o) => o.value === setting.visibility_type)?.label || "Visível para todos";
  };

  const handleEditMenu = (menuPath: string) => {
    const setting = getMenuVisibility(menuPath);
    setEditingMenu(menuPath);
    setSelectedVisibility(setting?.visibility_type || "visible");

    if (setting?.hidden_for_user_ids) {
      setSelectedUserIds(setting.hidden_for_user_ids.split(",").map((id) => parseInt(id.trim())));
    } else {
      setSelectedUserIds([]);
    }

    if (setting?.hidden_for_levels) {
      setSelectedLevels(setting.hidden_for_levels.split(",").map((l) => l.trim()));
    } else {
      setSelectedLevels([]);
    }
  };

  const handleSave = async () => {
    if (!editingMenu) return;

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const menuLabel = getAllMenuItems().find((i) => i.href === editingMenu)?.label || editingMenu;

      if (selectedVisibility === "visible") {
        // Delete the setting to restore visibility
        await fetch(`/api/admin/menu-visibility?menu_path=${encodeURIComponent(editingMenu)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch("/api/admin/menu-visibility", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            menu_path: editingMenu,
            menu_label: menuLabel,
            visibility_type: selectedVisibility,
            hidden_for_user_ids:
              selectedVisibility === "hidden_specific_users" || selectedVisibility === "visible_specific_users"
                ? selectedUserIds.join(",")
                : null,
            hidden_for_levels: selectedVisibility === "hidden_levels" ? selectedLevels.join(",") : null,
          }),
        });
      }

      await fetchData();
      setEditingMenu(null);
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const toggleLevelSelection = (level: string) => {
    setSelectedLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // Extract all menu items from config
  const getAllMenuItems = () => {
    const items: { label: string; href: string; category: string }[] = [];
    
    topMenuConfig.forEach((item) => {
      if (isMenuGroup(item)) {
        item.categories.forEach((category) => {
          category.items.forEach((menuItem) => {
            items.push({
              ...menuItem,
              category: category.title,
            });
          });
        });
      } else {
        items.push({
          ...item,
          category: "Principal",
        });
      }
    });
    
    return items;
  };

  // Group menu items by category
  const groupedMenuItems = () => {
    const items = getAllMenuItems();
    const grouped: Record<string, typeof items> = {};
    
    items.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuGroups = groupedMenuItems();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin")}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hierarquia de Menus</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure quais menus são visíveis para cada plano e usuário
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Legenda</h3>
        <div className="flex flex-wrap gap-4">
          {VISIBILITY_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.value} className="flex items-center gap-2 text-sm">
                <Icon className={`w-4 h-4 ${option.color}`} />
                <span className="text-gray-600 dark:text-gray-400">{option.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Menu List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {Object.entries(menuGroups).map(([category, items]) => {
          const isExpanded = expandedCategories[category];

          return (
            <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <span className="font-semibold text-gray-900 dark:text-white">{category}</span>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {/* Menu Items */}
              {isExpanded && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((menuItem) => {
                    const visibilityInfo = getVisibilityInfo(menuItem.href);
                    const visibilityLabel = getVisibilityLabel(menuItem.href);
                    const VisibilityIcon = visibilityInfo.icon;
                    
                    return (
                      <div
                        key={menuItem.href}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{menuItem.label}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{menuItem.href}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 ${visibilityInfo.color}`}
                          >
                            <VisibilityIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{visibilityLabel}</span>
                          </div>

                          <button
                            onClick={() => handleEditMenu(menuItem.href)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingMenu && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configurar Visibilidade</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {getAllMenuItems().find((i) => i.href === editingMenu)?.label}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Visibility Options */}
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        selectedVisibility === option.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={selectedVisibility === option.value}
                        onChange={(e) => setSelectedVisibility(e.target.value)}
                        className="sr-only"
                      />
                      <Icon className={`w-5 h-5 ${option.color}`} />
                      <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                    </label>
                  );
                })}
              </div>

              {/* Level Selection */}
              {selectedVisibility === "hidden_levels" && (
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Selecionar Planos</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Escolha os planos que NÃO poderão ver este menu
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {SUBSCRIPTION_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        onClick={() => toggleLevelSelection(level.value)}
                        className={`px-4 py-2 rounded-lg font-medium text-white transition ${
                          selectedLevels.includes(level.value)
                            ? `${level.color} ring-2 ring-offset-2 ring-blue-500`
                            : `${level.color} opacity-40 hover:opacity-60`
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>

                  {selectedLevels.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedLevels.length} plano(s) selecionado(s) • Menu oculto para: {selectedLevels.join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* User Selection */}
              {(selectedVisibility === "hidden_specific_users" || selectedVisibility === "visible_specific_users") && (
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Selecionar Usuários</h3>
                  {selectedVisibility === "hidden_specific_users" && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Escolha os usuários que NÃO poderão ver este menu
                    </p>
                  )}
                  {selectedVisibility === "visible_specific_users" && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Escolha os usuários que PODERÃO ver este menu (todos os outros não verão)
                    </p>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar usuário..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          selectedUserIds.includes(user.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email} • {user.access_level}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {selectedUserIds.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedUserIds.length} usuário(s) selecionado(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditingMenu(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  ((selectedVisibility === "hidden_specific_users" || selectedVisibility === "visible_specific_users") &&
                    selectedUserIds.length === 0) ||
                  (selectedVisibility === "hidden_levels" && selectedLevels.length === 0)
                }
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
