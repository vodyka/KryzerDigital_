import { useState, useEffect } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";

interface MenuVisibility {
  menu_path: string;
  menu_label: string;
  visibility_type: string;
  hidden_for_user_ids: string | null;
  hidden_for_levels: string | null;
}

export function useMenuVisibility() {
  const { user, isAdmin } = useAuth();
  const [settings, setSettings] = useState<MenuVisibility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/menu-visibility", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
      }
    } catch (error) {
      console.error("Error fetching menu visibility:", error);
    } finally {
      setLoading(false);
    }
  };

  const isMenuVisible = (menuPath: string): boolean => {
    if (!user) return false;

    const setting = settings.find((s) => s.menu_path === menuPath);
    if (!setting) return true; // No setting = visible

    const userId = user.id;
    const userPlan = user.plan || "Cristal";

    switch (setting.visibility_type) {
      case "visible":
        return true;

      case "hidden_global":
        return false;

      case "hidden_non_admin":
        return isAdmin;

      case "hidden_levels":
        if (!setting.hidden_for_levels) return true;
        const hiddenLevels = setting.hidden_for_levels.split(",").map((l) => l.trim());
        return !hiddenLevels.includes(userPlan);

      case "hidden_specific_users":
        if (!setting.hidden_for_user_ids) return true;
        const hiddenUserIds = setting.hidden_for_user_ids.split(",").map((id) => parseInt(id.trim()));
        return !hiddenUserIds.includes(Number(userId));

      case "visible_specific_users":
        if (!setting.hidden_for_user_ids) return false;
        const visibleUserIds = setting.hidden_for_user_ids.split(",").map((id) => parseInt(id.trim()));
        return visibleUserIds.includes(Number(userId));

      default:
        return true;
    }
  };

  return { isMenuVisible, loading };
}
