import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  plan?: string;
  is_admin?: boolean;
}

interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string;
  settings?: any;
  role: string;
  is_default: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  selectedCompany: Company | null;
  companies: Company[];
  login: (token: string, userData: User) => void;
  logout: () => void;
  switchCompany: (companyId: number) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  createCompany: (name: string, logoUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  const loadCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        
        // Set selected company to the default one, or first one if none is default
        let defaultCompany = data.companies?.find((c: Company) => c.is_default === true);
        
        if (!defaultCompany && data.companies?.length > 0) {
          defaultCompany = data.companies[0];
        }
        
        if (defaultCompany) {
          setSelectedCompany(defaultCompany);
          localStorage.setItem("selectedCompany", JSON.stringify(defaultCompany));
        }
      }
    } catch (error) {
      console.error("Failed to load companies:", error);
    }
  };

  useEffect(() => {
    // Load user on mount
    const loadUser = async () => {
      try {
        console.log("[AuthContext] Loading user...");
        const token = localStorage.getItem("token");
        const userStr = localStorage.getItem("user");

        console.log("[AuthContext] Token exists:", !!token);
        console.log("[AuthContext] User data exists:", !!userStr);
        console.log("[AuthContext] Token value:", token);

        if (!token || !userStr) {
          console.log("[AuthContext] No token or user data, setting loading to false");
          setLoading(false);
          return;
        }

        // Check if token is in old format (email) instead of new format (user_ID)
        if (!token.startsWith("user_")) {
          console.log("[AuthContext] Detected old token format, clearing and forcing re-login");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setLoading(false);
          return;
        }

        console.log("[AuthContext] Token format is valid");

        // Parse stored user
        console.log("[AuthContext] Parsing user data...");
        const userData = JSON.parse(userStr);
        console.log("[AuthContext] User data parsed:", userData);
        setUser(userData);

        // Load companies
        console.log("[AuthContext] Loading companies...");
        await loadCompanies();

        // Check admin status
        console.log("[AuthContext] Checking admin status...");
        const response = await fetch("/api/admin/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("[AuthContext] Admin verify response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("[AuthContext] Admin status:", data.is_admin);
          setIsAdmin(data.is_admin || false);
        }
        
        console.log("[AuthContext] User loaded successfully");
      } catch (error) {
        console.error("[AuthContext] Failed to load user:", error);
        // Clear invalid data
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedCompany");
      } finally {
        console.log("[AuthContext] Setting loading to false");
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (token: string, userData: User) => {
    console.log("[AuthContext] Login called with token:", token);
    console.log("[AuthContext] Login called with userData:", userData);
    
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    
    console.log("[AuthContext] Token saved to localStorage");
    console.log("[AuthContext] User saved to localStorage");
    
    setUser(userData);
    setIsAdmin(userData.is_admin || false);
    
    console.log("[AuthContext] State updated");
    console.log("[AuthContext] Loading companies...");
    
    // Load companies after login
    await loadCompanies();
    
    console.log("[AuthContext] Login completed");
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedCompany");
    setUser(null);
    setIsAdmin(false);
    setSelectedCompany(null);
    setCompanies([]);
  };

  const switchCompany = async (companyId: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/companies/${companyId}/switch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedCompany(data.company);
        localStorage.setItem("selectedCompany", JSON.stringify(data.company));
        
        // Reload companies to update is_default flags
        await loadCompanies();
        
        // Reload the page to refresh all data
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to switch company:", error);
    }
  };

  const refreshCompanies = async () => {
    await loadCompanies();
  };

  const createCompany = async (name: string, logoUrl?: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, logo_url: logoUrl }),
      });

      if (response.ok) {
        await loadCompanies();
      }
    } catch (error) {
      console.error("Failed to create company:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        isAdmin, 
        selectedCompany, 
        companies, 
        login, 
        logout, 
        switchCompany, 
        refreshCompanies,
        createCompany 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
