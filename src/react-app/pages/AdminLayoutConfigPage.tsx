import { useState, useEffect, useRef } from "react";
import {
  Palette,
  Image,
  Store,
  Upload,
  Loader2,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  Plus,
  Check,
  AlertCircle,
  Megaphone,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  Package as PackageIcon,
} from "lucide-react";

interface Marketplace {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: number;
  display_order: number;
}

interface BannerSettings {
  id: number;
  banner_image: string | null;
  banner_title: string;
  banner_subtitle: string;
  banner_button_text: string;
  banner_button_link: string;
  is_active: number;
}

export default function AdminLayoutConfigPage() {
  const [activeTab, setActiveTab] = useState<"logo" | "login_logo" | "colors" | "marketplaces" | "banner" | "service_icons">("logo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const [loginLogo, setLoginLogo] = useState<string>("https://i.ibb.co/3mPXSzVZ/kryzer.png");
  const [themeColors, setThemeColors] = useState({
    primary: "#3b82f6",
    secondary: "#6366f1",
    bgFrom: "#f8fafc",
    bgVia: "#dbeafe",
    bgTo: "#e0e7ff",
  });
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [orderedMarketplaces, setOrderedMarketplaces] = useState<Marketplace[]>([]);
  const [orderChanged, setOrderChanged] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLoginLogo, setUploadingLoginLogo] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMarketplaceName, setNewMarketplaceName] = useState("");
  const [newMarketplaceLogo, setNewMarketplaceLogo] = useState<File | null>(null);
  const [newMarketplaceLogoPreview, setNewMarketplaceLogoPreview] = useState<string | null>(null);
  const [addingMarketplace, setAddingMarketplace] = useState(false);
  const newLogoInputRef = useRef<HTMLInputElement>(null);
  
  // Success/Error states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Marketplace logo upload states
  const [uploadingMarketplaceId, setUploadingMarketplaceId] = useState<number | null>(null);
  const [showMarketplaceMenu, setShowMarketplaceMenu] = useState<number | null>(null);
  const marketplaceLogoInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Banner settings states
  const [bannerSettings, setBannerSettings] = useState<BannerSettings>({
    id: 1,
    banner_image: null,
    banner_title: "",
    banner_subtitle: "",
    banner_button_text: "",
    banner_button_link: "",
    is_active: 0,
  });
  const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);

  // Service icons states
  const [serviceIcons, setServiceIcons] = useState({
    uber_icon: null as string | null,
    whatsapp_icon: null as string | null,
    shipping_supplies_icon: null as string | null,
    resale_merchandise_icon: null as string | null,
    after_hours_icon: null as string | null,
  });
  const [uploadingServiceIcon, setUploadingServiceIcon] = useState<string | null>(null);
  const uberIconInputRef = useRef<HTMLInputElement>(null);
  const whatsappIconInputRef = useRef<HTMLInputElement>(null);
  const shippingSuppliesIconInputRef = useRef<HTMLInputElement>(null);
  const resaleMerchandiseIconInputRef = useRef<HTMLInputElement>(null);
  const afterHoursIconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const sorted = [...marketplaces].sort((a, b) => a.display_order - b.display_order);
    setOrderedMarketplaces(sorted);
    setOrderChanged(false);
  }, [marketplaces]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [settingsRes, marketplacesRes, bannerRes] = await Promise.all([
        fetch("/api/admin/settings", { headers }),
        fetch("/api/admin/marketplaces", { headers }),
        fetch("/api/banner-settings", { headers }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSystemLogo(data.settings?.system_logo || null);
        setLoginLogo(data.settings?.login_logo || "https://i.ibb.co/3mPXSzVZ/kryzer.png");
        setThemeColors({
          primary: data.settings?.theme_primary_color || "#3b82f6",
          secondary: data.settings?.theme_secondary_color || "#6366f1",
          bgFrom: data.settings?.theme_background_from || "#f8fafc",
          bgVia: data.settings?.theme_background_via || "#dbeafe",
          bgTo: data.settings?.theme_background_to || "#e0e7ff",
        });
        setServiceIcons({
          uber_icon: data.settings?.uber_icon || null,
          whatsapp_icon: data.settings?.whatsapp_icon || null,
          shipping_supplies_icon: data.settings?.shipping_supplies_icon || null,
          resale_merchandise_icon: data.settings?.resale_merchandise_icon || null,
          after_hours_icon: data.settings?.after_hours_icon || null,
        });
      }

      if (marketplacesRes.ok) {
        const data = await marketplacesRes.json();
        setMarketplaces(data.marketplaces || []);
      }

      if (bannerRes.ok) {
        const data = await bannerRes.json();
        if (data.settings) {
          setBannerSettings(data.settings);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "system_logo");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSystemLogo(data.url);
        setSuccessMessage("Logo atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Failed to upload logo:", error);
      setErrorMessage("Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({ system_logo: null }),
      });
      setSystemLogo(null);
      setSuccessMessage("Logo removido com sucesso!");
    } catch (error) {
      console.error("Failed to remove logo:", error);
      setErrorMessage("Erro ao remover logo");
    } finally {
      setSaving(false);
    }
  };

  const handleLoginLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLoginLogo(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "login_logo");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setLoginLogo(data.url);
        setSuccessMessage("Logo da tela de login atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Failed to upload login logo:", error);
      setErrorMessage("Erro ao enviar logo");
    } finally {
      setUploadingLoginLogo(false);
      if (loginLogoInputRef.current) {
        loginLogoInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLoginLogo = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({ login_logo: "https://i.ibb.co/3mPXSzVZ/kryzer.png" }),
      });
      setLoginLogo("https://i.ibb.co/3mPXSzVZ/kryzer.png");
      setSuccessMessage("Logo da tela de login restaurado!");
    } catch (error) {
      console.error("Failed to reset login logo:", error);
      setErrorMessage("Erro ao restaurar logo");
    } finally {
      setSaving(false);
    }
  };

  const saveColors = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          theme_primary_color: themeColors.primary,
          theme_secondary_color: themeColors.secondary,
          theme_background_from: themeColors.bgFrom,
          theme_background_via: themeColors.bgVia,
          theme_background_to: themeColors.bgTo,
        }),
      });
      setSuccessMessage("Cores atualizadas com sucesso!");
    } catch (error) {
      console.error("Failed to save colors:", error);
      setErrorMessage("Erro ao salvar cores");
    } finally {
      setSaving(false);
    }
  };

  const resetColors = () => {
    setThemeColors({
      primary: "#3b82f6",
      secondary: "#6366f1",
      bgFrom: "#f8fafc",
      bgVia: "#dbeafe",
      bgTo: "#e0e7ff",
    });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newOrder = [...orderedMarketplaces];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setOrderedMarketplaces(newOrder);
    setOrderChanged(true);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverItem(index);
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const newOrder = [...orderedMarketplaces];
    const draggedMarketplace = newOrder[draggedItem];
    newOrder.splice(draggedItem, 1);
    newOrder.splice(dropIndex, 0, draggedMarketplace);
    
    setOrderedMarketplaces(newOrder);
    setOrderChanged(true);
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const orders = orderedMarketplaces.map((m, index) => ({
        id: m.id,
        display_order: index,
      }));

      const response = await fetch("/api/admin/marketplaces/order", {
        method: "PUT",
        headers,
        body: JSON.stringify({ orders }),
      });

      if (response.ok) {
        setMarketplaces(orderedMarketplaces.map((m, index) => ({
          ...m,
          display_order: index,
        })));
        setOrderChanged(false);
        setSuccessMessage("Ordem salva com sucesso!");
      }
    } catch (error) {
      console.error("Failed to save order:", error);
      setErrorMessage("Erro ao salvar ordem");
    } finally {
      setSaving(false);
    }
  };

  const handleNewLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewMarketplaceLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMarketplaceLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMarketplace = async () => {
    if (!newMarketplaceName.trim()) {
      setErrorMessage("Digite o nome do marketplace");
      return;
    }

    setAddingMarketplace(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const slug = newMarketplaceName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const maxOrder = Math.max(...orderedMarketplaces.map(m => m.display_order), -1);

      const createResponse = await fetch("/api/admin/marketplaces", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newMarketplaceName.trim(),
          slug,
          display_order: maxOrder + 1,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create marketplace");
      }

      const { marketplace } = await createResponse.json();

      if (newMarketplaceLogo && marketplace.id) {
        const uploadHeaders: HeadersInit = {};
        if (token) {
          uploadHeaders.Authorization = `Bearer ${token}`;
        }

        const formData = new FormData();
        formData.append("file", newMarketplaceLogo);
        formData.append("type", "marketplace_logo");
        formData.append("marketplaceId", marketplace.id.toString());

        await fetch("/api/admin/upload", {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        });
      }

      await fetchData();
      
      setShowAddModal(false);
      setNewMarketplaceName("");
      setNewMarketplaceLogo(null);
      setNewMarketplaceLogoPreview(null);
      setSuccessMessage("Marketplace adicionado com sucesso!");
    } catch (error) {
      console.error("Failed to add marketplace:", error);
      setErrorMessage("Erro ao adicionar marketplace");
    } finally {
      setAddingMarketplace(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setNewMarketplaceName("");
    setNewMarketplaceLogo(null);
    setNewMarketplaceLogoPreview(null);
  };

  const handleMarketplaceLogoUpload = async (marketplaceId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMarketplaceId(marketplaceId);
    setShowMarketplaceMenu(null);
    
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "marketplace_logo");
      formData.append("marketplaceId", marketplaceId.toString());

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        await fetchData();
        setSuccessMessage("Foto atualizada com sucesso!");
      } else {
        const responseData = await response.json();
        setErrorMessage(responseData.error || "Erro ao enviar foto");
      }
    } catch (error) {
      console.error("Failed to upload marketplace logo:", error);
      setErrorMessage("Erro ao enviar foto");
    } finally {
      setUploadingMarketplaceId(null);
      if (marketplaceLogoInputRefs.current[marketplaceId]) {
        marketplaceLogoInputRefs.current[marketplaceId]!.value = "";
      }
    }
  };

  const handleRemoveMarketplaceLogo = async (marketplaceId: number) => {
    setUploadingMarketplaceId(marketplaceId);
    setShowMarketplaceMenu(null);
    
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch(`/api/admin/marketplaces/${marketplaceId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ logo_url: null }),
      });

      await fetchData();
      setSuccessMessage("Foto removida com sucesso!");
    } catch (error) {
      console.error("Failed to remove logo:", error);
      setErrorMessage("Erro ao remover foto");
    } finally {
      setUploadingMarketplaceId(null);
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBannerImage(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "banner_image");

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setBannerSettings({ ...bannerSettings, banner_image: data.url });
        setSuccessMessage("Imagem do banner atualizada!");
      }
    } catch (error) {
      console.error("Failed to upload banner image:", error);
      setErrorMessage("Erro ao enviar imagem");
    } finally {
      setUploadingBannerImage(false);
      if (bannerImageInputRef.current) {
        bannerImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveBannerImage = () => {
    setBannerSettings({ ...bannerSettings, banner_image: null });
  };

  const saveBannerSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch("/api/admin/banner-settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(bannerSettings),
      });
      setSuccessMessage("Banner atualizado com sucesso!");
    } catch (error) {
      console.error("Failed to save banner settings:", error);
      setErrorMessage("Erro ao salvar banner");
    } finally {
      setSaving(false);
    }
  };

  const handleServiceIconUpload = async (e: React.ChangeEvent<HTMLInputElement>, iconType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingServiceIcon(iconType);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", `${iconType}_icon`);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setServiceIcons({ ...serviceIcons, [`${iconType}_icon`]: data.url });
        setSuccessMessage("Ícone atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Failed to upload icon:", error);
      setErrorMessage("Erro ao enviar ícone");
    } finally {
      setUploadingServiceIcon(null);
      const refs = {
        uber: uberIconInputRef,
        whatsapp: whatsappIconInputRef,
        shipping_supplies: shippingSuppliesIconInputRef,
        resale_merchandise: resaleMerchandiseIconInputRef,
        after_hours: afterHoursIconInputRef,
      };
      if (refs[iconType as keyof typeof refs]?.current) {
        refs[iconType as keyof typeof refs].current!.value = "";
      }
    }
  };

  const handleRemoveServiceIcon = async (iconType: string) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify({ [`${iconType}_icon`]: null }),
      });
      setServiceIcons({ ...serviceIcons, [`${iconType}_icon`]: null });
      setSuccessMessage("Ícone removido com sucesso!");
    } catch (error) {
      console.error("Failed to remove icon:", error);
      setErrorMessage("Erro ao remover ícone");
    } finally {
      setSaving(false);
    }
  };

  const saveServiceIcons = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await fetch("/api/admin/settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(serviceIcons),
      });
      setSuccessMessage("Ícones salvos com sucesso!");
    } catch (error) {
      console.error("Failed to save icons:", error);
      setErrorMessage("Erro ao salvar ícones");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-10 h-10 text-blue-500 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg animate-slide-in">
          <Check className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg animate-slide-in">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuração de Layout</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Personalize a identidade visual do sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab("logo")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
            activeTab === "logo"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          }`}
        >
          <Image className="w-4 h-4" />
          Logo do Sistema
        </button>
        <button
          onClick={() => setActiveTab("login_logo")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
            activeTab === "login_logo"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          }`}
        >
          <Image className="w-4 h-4" />
          Logo da Tela de Login
        </button>
        <button
          onClick={() => setActiveTab("colors")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
            activeTab === "colors"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          }`}
        >
          <Palette className="w-4 h-4" />
          Paleta de Cores
        </button>
        <button
          onClick={() => setActiveTab("marketplaces")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
            activeTab === "marketplaces"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          }`}
        >
          <Store className="w-4 h-4" />
          Marketplaces
        </button>
        <button
          onClick={() => setActiveTab("banner")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
            activeTab === "banner"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Banner do Dashboard
        </button>
        <button
          onClick={() => setActiveTab("service_icons")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
            activeTab === "service_icons"
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          }`}
        >
          <PackageIcon className="w-4 h-4" />
          Ícones de Serviços
        </button>
      </div>

      {/* Logo Tab */}
      {activeTab === "logo" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Logo do Sistema</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Este logo será exibido no header, tela de login e outras áreas do sistema.
          </p>

          <div className="flex flex-col items-center gap-6">
            <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
              {systemLogo ? (
                <img
                  src={systemLogo}
                  alt="Logo do Sistema"
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Image className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-sm">Nenhum logo</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
              >
                {uploadingLogo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {systemLogo ? "Alterar Logo" : "Enviar Logo"}
              </button>
              {systemLogo && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Remover
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Logo Tab */}
      {activeTab === "login_logo" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Logo da Tela de Login</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Este logo será exibido apenas na tela de login do sistema.
          </p>

          <div className="flex flex-col items-center gap-6">
            <div className="w-64 h-64 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden p-4">
              <img
                src={loginLogo}
                alt="Logo da Tela de Login"
                className="max-w-full max-h-full object-contain drop-shadow-2xl"
              />
            </div>

            <div className="flex gap-3">
              <input
                ref={loginLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLoginLogoUpload}
                className="hidden"
              />
              <button
                onClick={() => loginLogoInputRef.current?.click()}
                disabled={uploadingLoginLogo}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
              >
                {uploadingLoginLogo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Alterar Logo
              </button>
              {loginLogo !== "https://i.ibb.co/3mPXSzVZ/kryzer.png" && (
                <button
                  onClick={handleRemoveLoginLogo}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Restaurar Padrão
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Colors Tab - keeping existing implementation */}
      {activeTab === "colors" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Paleta de Cores</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Personalize as cores do sistema. As mudanças serão aplicadas no dashboard e tela de login.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cor Primária
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={themeColors.primary}
                  onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })}
                  className="w-16 h-16 rounded-xl border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={themeColors.primary}
                    onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="#3b82f6"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usada em botões e elementos principais</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={resetColors}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition font-medium"
              >
                Restaurar Padrão
              </button>
              <button
                onClick={saveColors}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Salvar Cores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Marketplaces Tab - keeping existing complex implementation but updating styles */}
      {activeTab === "marketplaces" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Marketplaces</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Arraste para reordenar ou use as setas. A ordem será aplicada em todo o sistema.
                </p>
              </div>
              {orderChanged && (
                <button
                  onClick={saveOrder}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition disabled:opacity-50 shadow-lg shadow-emerald-500/25"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Ordem
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {orderedMarketplaces.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <Store className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhum marketplace cadastrado</p>
                <p className="text-sm mt-1">Clique em "Adicionar Marketplace" para começar</p>
              </div>
            ) : (
              orderedMarketplaces.map((marketplace, index) => (
                <div
                  key={marketplace.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-4 px-6 py-4 transition-all ${
                    draggedItem === index
                      ? "opacity-50 bg-blue-50 dark:bg-blue-900/20"
                      : dragOverItem === index
                      ? "bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-400"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <div className="relative group">
                    <input
                      ref={(el) => { marketplaceLogoInputRefs.current[marketplace.id] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMarketplaceLogoUpload(marketplace.id, e)}
                      className="hidden"
                    />
                    <button
                      onClick={() => setShowMarketplaceMenu(showMarketplaceMenu === marketplace.id ? null : marketplace.id)}
                      disabled={uploadingMarketplaceId === marketplace.id}
                      className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer disabled:opacity-50 relative"
                    >
                      {uploadingMarketplaceId === marketplace.id ? (
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      ) : marketplace.logo_url ? (
                        <img
                          key={`${marketplace.id}-${marketplace.logo_url}-${Date.now()}`}
                          src={marketplace.logo_url}
                          alt={marketplace.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            console.error(`[Marketplace Logo] Failed to load: ${marketplace.logo_url}`);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Store className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition flex items-center justify-center">
                        <Upload className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </button>
                    
                    {showMarketplaceMenu === marketplace.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMarketplaceMenu(null)}
                        />
                        <div className="absolute left-0 top-full mt-2 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[160px] animate-scale-in">
                          <button
                            onClick={() => marketplaceLogoInputRefs.current[marketplace.id]?.click()}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition"
                          >
                            <Upload className="w-4 h-4" />
                            {marketplace.logo_url ? "Alterar Foto" : "Enviar Foto"}
                          </button>
                          {marketplace.logo_url && (
                            <button
                              onClick={() => handleRemoveMarketplaceLogo(marketplace.id)}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition"
                            >
                              <X className="w-4 h-4" />
                              Remover Foto
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{marketplace.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{marketplace.slug}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Ordem:</span>
                    <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      marketplace.is_active
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {marketplace.is_active ? "Ativo" : "Inativo"}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(index, "down")}
                      disabled={index === orderedMarketplaces.length - 1}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 p-2">
                    <GripVertical className="w-5 h-5" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              Adicionar Marketplace
            </button>
          </div>
        </div>
      )}

      {/* Banner Tab */}
      {activeTab === "banner" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Banner do Dashboard do Usuário
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure o banner promocional exibido no dashboard dos usuários
              </p>
            </div>
            <button
              onClick={() =>
                setBannerSettings({ ...bannerSettings, is_active: bannerSettings.is_active ? 0 : 1 })
              }
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
                bannerSettings.is_active
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              }`}
            >
              {bannerSettings.is_active ? (
                <>
                  <ToggleRight className="w-5 h-5" />
                  Ativo
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5" />
                  Inativo
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {/* Banner Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Imagem do Banner (opcional)
              </label>
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-2xl h-48 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                  {bannerSettings.banner_image ? (
                    <img
                      src={bannerSettings.banner_image}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <Image className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Nenhuma imagem</p>
                      <p className="text-xs mt-1">Ilustração decorativa (foguete por padrão)</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <input
                    ref={bannerImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => bannerImageInputRef.current?.click()}
                    disabled={uploadingBannerImage}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50"
                  >
                    {uploadingBannerImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {bannerSettings.banner_image ? "Alterar Imagem" : "Enviar Imagem"}
                  </button>
                  {bannerSettings.banner_image && (
                    <button
                      onClick={handleRemoveBannerImage}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition"
                    >
                      <X className="w-4 h-4" />
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Banner Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Título do Banner
              </label>
              <input
                type="text"
                value={bannerSettings.banner_title}
                onChange={(e) =>
                  setBannerSettings({ ...bannerSettings, banner_title: e.target.value })
                }
                placeholder="Ex: Potencialize suas vendas"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Banner Subtitle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subtítulo do Banner
              </label>
              <textarea
                value={bannerSettings.banner_subtitle}
                onChange={(e) =>
                  setBannerSettings({ ...bannerSettings, banner_subtitle: e.target.value })
                }
                placeholder="Ex: Ferramentas profissionais para gerenciar seus negócios online com eficiência"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Button Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Texto do Botão (opcional)
              </label>
              <input
                type="text"
                value={bannerSettings.banner_button_text}
                onChange={(e) =>
                  setBannerSettings({ ...bannerSettings, banner_button_text: e.target.value })
                }
                placeholder="Ex: Começar agora"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Button Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Link do Botão
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={bannerSettings.banner_button_link}
                  onChange={(e) =>
                    setBannerSettings({ ...bannerSettings, banner_button_link: e.target.value })
                  }
                  placeholder="Ex: /calculadora"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use links internos (ex: /calculadora) ou externos (ex: https://exemplo.com)
              </p>
            </div>

            {/* Preview */}
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Prévia do Banner
              </label>
              <div className="relative bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxkZWZzPjxwYXR0ZXJuIGlkPSJhIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0wIDQwTDQwIDBIMjBMMCAxMFoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-30"></div>

                <div className="relative flex flex-col lg:flex-row items-center gap-6 p-8">
                  <div className="flex-1 text-center lg:text-left">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {bannerSettings.banner_title || "Título do Banner"}
                    </h2>
                    <p className="text-blue-100 mb-4">
                      {bannerSettings.banner_subtitle || "Subtítulo do banner"}
                    </p>
                    {bannerSettings.banner_button_text && (
                      <div className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-2.5 rounded-xl font-semibold shadow-lg">
                        {bannerSettings.banner_button_text}
                      </div>
                    )}
                  </div>
                  <div className="lg:w-48 flex items-center justify-center">
                    {bannerSettings.banner_image ? (
                      <img
                        src={bannerSettings.banner_image}
                        alt="Banner"
                        className="max-w-full h-auto object-contain"
                      />
                    ) : (
                      <Megaphone className="w-24 h-24 text-white opacity-20" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={saveBannerSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Icons Tab */}
      {activeTab === "service_icons" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ícones de Serviços
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Configure os ícones que aparecem nos pontos de coleta e na tela inicial do WhatsApp. Por padrão, são usados ícones do sistema.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Uber Icon */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ícone Uber
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Indica que o ponto aceita envio via Uber
              </p>
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {serviceIcons.uber_icon ? (
                  <img
                    src={serviceIcons.uber_icon}
                    alt="Ícone Uber"
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                    </svg>
                    <p className="text-xs">Ícone padrão</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={uberIconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleServiceIconUpload(e, "uber")}
                  className="hidden"
                />
                <button
                  onClick={() => uberIconInputRef.current?.click()}
                  disabled={uploadingServiceIcon === "uber"}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                >
                  {uploadingServiceIcon === "uber" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {serviceIcons.uber_icon ? "Alterar" : "Enviar"}
                </button>
                {serviceIcons.uber_icon && (
                  <button
                    onClick={() => handleRemoveServiceIcon("uber")}
                    disabled={saving}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* WhatsApp Icon */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ícone WhatsApp
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Usado no ponto de coleta e na tela inicial
              </p>
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {serviceIcons.whatsapp_icon ? (
                  <img
                    src={serviceIcons.whatsapp_icon}
                    alt="Ícone WhatsApp"
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <p className="text-xs">Ícone padrão</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={whatsappIconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleServiceIconUpload(e, "whatsapp")}
                  className="hidden"
                />
                <button
                  onClick={() => whatsappIconInputRef.current?.click()}
                  disabled={uploadingServiceIcon === "whatsapp"}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                >
                  {uploadingServiceIcon === "whatsapp" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {serviceIcons.whatsapp_icon ? "Alterar" : "Enviar"}
                </button>
                {serviceIcons.whatsapp_icon && (
                  <button
                    onClick={() => handleRemoveServiceIcon("whatsapp")}
                    disabled={saving}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Shipping Supplies Icon */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ícone Venda de Insumos
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Indica que o ponto vende etiquetas e embalagens
              </p>
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {serviceIcons.shipping_supplies_icon ? (
                  <img
                    src={serviceIcons.shipping_supplies_icon}
                    alt="Ícone Venda de Insumos"
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/>
                    </svg>
                    <p className="text-xs">Ícone padrão</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={shippingSuppliesIconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleServiceIconUpload(e, "shipping_supplies")}
                  className="hidden"
                />
                <button
                  onClick={() => shippingSuppliesIconInputRef.current?.click()}
                  disabled={uploadingServiceIcon === "shipping_supplies"}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                >
                  {uploadingServiceIcon === "shipping_supplies" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {serviceIcons.shipping_supplies_icon ? "Alterar" : "Enviar"}
                </button>
                {serviceIcons.shipping_supplies_icon && (
                  <button
                    onClick={() => handleRemoveServiceIcon("shipping_supplies")}
                    disabled={saving}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Resale Merchandise Icon */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ícone Fornecimento de Mercadoria
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Indica que o ponto fornece produtos para revenda
              </p>
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {serviceIcons.resale_merchandise_icon ? (
                  <img
                    src={serviceIcons.resale_merchandise_icon}
                    alt="Ícone Fornecimento de Mercadoria"
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
                    </svg>
                    <p className="text-xs">Ícone padrão</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={resaleMerchandiseIconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleServiceIconUpload(e, "resale_merchandise")}
                  className="hidden"
                />
                <button
                  onClick={() => resaleMerchandiseIconInputRef.current?.click()}
                  disabled={uploadingServiceIcon === "resale_merchandise"}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                >
                  {uploadingServiceIcon === "resale_merchandise" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {serviceIcons.resale_merchandise_icon ? "Alterar" : "Enviar"}
                </button>
                {serviceIcons.resale_merchandise_icon && (
                  <button
                    onClick={() => handleRemoveServiceIcon("resale_merchandise")}
                    disabled={saving}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* After Hours Icon */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ícone Recebe Fora do Horário
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Indica que o ponto aceita mercadoria fora do horário comercial
              </p>
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                {serviceIcons.after_hours_icon ? (
                  <img
                    src={serviceIcons.after_hours_icon}
                    alt="Ícone Recebe Fora do Horário"
                    className="max-w-full max-h-full object-contain p-4"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <p className="text-xs">Ícone padrão</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={afterHoursIconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleServiceIconUpload(e, "after_hours")}
                  className="hidden"
                />
                <button
                  onClick={() => afterHoursIconInputRef.current?.click()}
                  disabled={uploadingServiceIcon === "after_hours"}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                >
                  {uploadingServiceIcon === "after_hours" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {serviceIcons.after_hours_icon ? "Alterar" : "Enviar"}
                </button>
                {serviceIcons.after_hours_icon && (
                  <button
                    onClick={() => handleRemoveServiceIcon("after_hours")}
                    disabled={saving}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={saveServiceIcons}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Salvar Ícones
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Adicionar Marketplace</h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Marketplace
                </label>
                <input
                  type="text"
                  value={newMarketplaceName}
                  onChange={(e) => setNewMarketplaceName(e.target.value)}
                  placeholder="Ex: Shopee, Mercado Livre, Amazon..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Logo (opcional)
                </label>
                <input
                  ref={newLogoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewLogoChange}
                  className="hidden"
                />
                
                {newMarketplaceLogoPreview ? (
                  <div className="relative">
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                      <img
                        src={newMarketplaceLogoPreview}
                        alt="Preview"
                        className="max-w-full max-h-full object-contain p-4"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setNewMarketplaceLogo(null);
                        setNewMarketplaceLogoPreview(null);
                        if (newLogoInputRef.current) {
                          newLogoInputRef.current.value = "";
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => newLogoInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                  >
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Clique para enviar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMarketplace}
                disabled={addingMarketplace || !newMarketplaceName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMarketplace ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
