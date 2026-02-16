import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Home,
  MapPin,
  Search,
  Calendar,
  Undo2,
  Package,
  Loader2,
  Star,
  Navigation,
  AlertCircle,
  X,
  AlertTriangle,
  Clock,
  Car,
  ShoppingBag,
  RefreshCw,
  MessageCircle,
  Info,
  XCircle,
  List,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip } from "../components/Tooltip";
import { ClosingCountdown } from "../components/ClosingCountdown";

interface AppUser {
  id: number;
  email: string;
  is_active: number;
  is_admin: number;
  access_level: string;
  penalty_points: number;
}

interface Marketplace {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: number;
}

interface CollectionPoint {
  id: number;
  name: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string | null;
  photo_url: string | null;
  accepts_returns: number;
  accepts_orders: number;
  is_active: number;
  distance?: number;
  avg_rating?: number;
  review_count?: number;
  marketplaces?: Marketplace[];
  is_open?: boolean;
  schedule_info?: string;
  accepts_uber_delivery?: number;
  sells_shipping_supplies?: number;
  provides_resale_merchandise?: number;
  whatsapp_number?: string;
  owner_email?: string;
  closing_time?: string | null;
  is_favorite?: boolean;
  is_blocked?: boolean;
}

interface SearchFilters {
  cep: string;
  scheduleType: "now" | "later";
  scheduleDate: string;
  scheduleTime: string;
  serviceType: "returns" | "orders" | null;
  selectedMarketplaces: number[];
  hideNegativeRatings: boolean;
}

interface SearchResult {
  points: CollectionPoint[];
  removed_marketplaces?: { id: number; name: string; reason: string }[];
  adjusted?: boolean;
}

export default function CollectionPointsSearchPage() {
  const navigate = useNavigate();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNoResults, setShowNoResults] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ point: CollectionPoint; userReview?: { rating: number; comment: string } } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reviewsModal, setReviewsModal] = useState<{ pointId: number; pointName: string; reviews: any[] } | null>(null);
  const [togglingPreference, setTogglingPreference] = useState<number | null>(null);

  const [filters, setFilters] = useState<SearchFilters>(() => {
    const savedCEP = localStorage.getItem("collectionPoints_savedCEP");
    return {
      cep: savedCEP || "",
      scheduleType: "now",
      scheduleDate: "",
      scheduleTime: "",
      serviceType: null,
      selectedMarketplaces: [],
      hideNegativeRatings: false,
    };
  });

  useEffect(() => {
    fetchInitialData();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (filters.cep) {
      localStorage.setItem("collectionPoints_savedCEP", filters.cep);
    }
  }, [filters.cep]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const [userRes, marketplacesRes] = await Promise.all([
        fetch("/api/auth/me", { headers }),
        fetch("/api/marketplaces"),
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setAppUser(data.appUser);
      }

      if (marketplacesRes.ok) {
        const data = await marketplacesRes.json();
        setMarketplaces(data.marketplaces || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCEP = (value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 2) return clean;
    if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}-${clean.slice(5, 8)}`;
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value);
    setFilters((prev) => ({ ...prev, cep: formatted }));
    setErrors((prev) => ({ ...prev, cep: "" }));
  };

  const toggleMarketplace = (id: number) => {
    setFilters((prev) => ({
      ...prev,
      selectedMarketplaces: prev.selectedMarketplaces.includes(id)
        ? prev.selectedMarketplaces.filter((m) => m !== id)
        : [...prev.selectedMarketplaces, id],
    }));
    setErrors((prev) => ({ ...prev, marketplaces: "" }));
  };

  const selectAllMarketplaces = () => {
    setFilters((prev) => ({
      ...prev,
      selectedMarketplaces: marketplaces.filter((m) => m.is_active === 1).map((m) => m.id),
    }));
    setErrors((prev) => ({ ...prev, marketplaces: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const cleanCEP = filters.cep.replace(/\D/g, "");
    if (!cleanCEP || cleanCEP.length !== 8) {
      newErrors.cep = "CEP inválido";
    }

    if (!filters.serviceType) {
      newErrors.serviceType = "Selecione um tipo de serviço";
    }

    if (filters.selectedMarketplaces.length === 0) {
      newErrors.marketplaces = "Selecione pelo menos um marketplace";
    }

    if (filters.scheduleType === "later") {
      if (!filters.scheduleDate) {
        newErrors.scheduleDate = "Selecione uma data";
      }
      if (!filters.scheduleTime) {
        newErrors.scheduleTime = "Selecione um horário";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async (adjustFilters = false) => {
    if (!validate()) return;

    setSearching(true);
    setShowNoResults(false);
    setResults(null);

    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const payload = {
        cep: filters.cep.replace(/\D/g, ""),
        schedule_type: filters.scheduleType,
        schedule_date: filters.scheduleType === "later" ? filters.scheduleDate : null,
        schedule_time: filters.scheduleType === "later" ? filters.scheduleTime : null,
        service_type: filters.serviceType,
        marketplace_ids: filters.selectedMarketplaces,
        adjust_filters: adjustFilters,
      };

      const response = await fetch("/api/collection-points/search", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);

        if (data.points.length === 0 && !adjustFilters) {
          setShowNoResults(true);
        }

        if (data.adjusted && data.removed_marketplaces) {
          const remainingIds = filters.selectedMarketplaces.filter(
            (id) => !data.removed_marketplaces.some((rm: any) => rm.id === id)
          );
          setFilters((prev) => ({ ...prev, selectedMarketplaces: remainingIds }));
        }
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const viewAllPoints = () => {
    navigate("/collection-points/list");
  };

  const viewPointReviews = async (pointId: number) => {
    try {
      const response = await fetch(`/api/collection-points/${pointId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        const point = results?.points.find(p => p.id === pointId);
        setReviewsModal({
          pointId,
          pointName: point?.name || "Ponto de Coleta",
          reviews: data.reviews || []
        });
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    }
  };

  const openGoogleMapsRoute = async (point: CollectionPoint) => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      await fetch(`/api/collection-points/${point.id}/track-route-click`, {
        method: "POST",
        headers,
      });
    } catch (error) {
      console.error("Failed to track route click:", error);
    }

    const origin = filters.cep.replace(/\D/g, "");
    const destination = point.cep;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const openWhatsApp = (whatsappNumber: string, pointName: string) => {
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá! Gostaria de saber mais sobre o ponto de coleta ${pointName}.`);
    const url = `https://wa.me/${cleanNumber}?text=${message}`;
    window.open(url, "_blank");
  };

  const openReviewModal = async (point: CollectionPoint) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setReviewRating(0);
      setReviewComment("");
      setReviewModal({ point });
      return;
    }

    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`
    };

    try {
      const response = await fetch(`/api/collection-points/${point.id}/my-review`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.review) {
          setReviewRating(data.review.rating);
          setReviewComment(data.review.comment || "");
          setReviewModal({ point, userReview: data.review });
        } else {
          setReviewRating(0);
          setReviewComment("");
          setReviewModal({ point });
        }
      } else {
        setReviewRating(0);
        setReviewComment("");
        setReviewModal({ point });
      }
    } catch {
      setReviewRating(0);
      setReviewComment("");
      setReviewModal({ point });
    }
  };

  const toggleFavorite = async (pointId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) return;

    setTogglingPreference(pointId);
    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`
    };

    try {
      const response = await fetch(`/api/collection-points/${pointId}/favorite`, {
        method: "POST",
        headers,
      });

      if (response.ok && results) {
        const updatedPoints = results.points.map(p => 
          p.id === pointId ? { ...p, is_favorite: !p.is_favorite } : p
        );
        
        const favoritePoints = updatedPoints.filter(p => p.is_favorite);
        const normalPoints = updatedPoints.filter(p => !p.is_favorite);
        const sortedPoints = [...favoritePoints, ...normalPoints];
        
        setResults({ ...results, points: sortedPoints });
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setTogglingPreference(null);
    }
  };

  const toggleBlock = async (pointId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) return;

    setTogglingPreference(pointId);
    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`
    };

    try {
      const response = await fetch(`/api/collection-points/${pointId}/block`, {
        method: "POST",
        headers,
      });

      if (response.ok && results) {
        const updatedPoints = results.points.map(p => 
          p.id === pointId ? { ...p, is_blocked: !p.is_blocked } : p
        );
        setResults({ ...results, points: updatedPoints });
      }
    } catch (error) {
      console.error("Failed to toggle block:", error);
    } finally {
      setTogglingPreference(null);
    }
  };

  const saveReview = async () => {
    if (!reviewModal || reviewRating === 0) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Você precisa estar logado para avaliar");
      return;
    }

    setSavingReview(true);
    const headers: HeadersInit = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    try {
      const response = await fetch(`/api/collection-points/${reviewModal.point.id}/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment || null }),
      });

      if (response.ok) {
        setReviewModal(null);
        if (results) {
          const updatedPoints = results.points.map((p) => {
            if (p.id === reviewModal.point.id) {
              const oldCount = p.review_count || 0;
              const oldAvg = p.avg_rating || 0;
              const isNew = !reviewModal.userReview;
              const newCount = isNew ? oldCount + 1 : oldCount;
              const newAvg = isNew
                ? (oldAvg * oldCount + reviewRating) / newCount
                : (oldAvg * oldCount - (reviewModal.userReview?.rating || 0) + reviewRating) / newCount;
              return { ...p, avg_rating: newAvg, review_count: newCount };
            }
            return p;
          });
          setResults({ ...results, points: updatedPoints });
        }
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao salvar avaliação");
      }
    } catch (error) {
      console.error("Failed to save review:", error);
      alert("Erro ao salvar avaliação");
    } finally {
      setSavingReview(false);
    }
  };

  const formatDate = (date: Date) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              <Home className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Pontos de Coleta</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Encontre pontos próximos a você</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              {/* Timer */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(currentTime)}</span>
                </div>
                <div className="text-3xl font-bold">{formatTime(currentTime)}</div>
              </div>

              {/* CEP */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Seu CEP
                </label>
                <input
                  type="text"
                  value={filters.cep}
                  onChange={handleCEPChange}
                  maxLength={10}
                  placeholder="XX.XXX-XXX"
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border ${
                    errors.cep ? "border-red-500" : "border-gray-200 dark:border-gray-600"
                  } rounded-xl text-gray-900 dark:text-white placeholder-gray-400`}
                />
                {errors.cep && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.cep}</p>}
              </div>

              {/* Schedule */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Agendamento
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:border-teal-500 transition">
                    <input
                      type="radio"
                      checked={filters.scheduleType === "now"}
                      onChange={() => setFilters((prev) => ({ ...prev, scheduleType: "now" }))}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Vou enviar agora</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:border-teal-500 transition">
                    <input
                      type="radio"
                      checked={filters.scheduleType === "later"}
                      onChange={() => setFilters((prev) => ({ ...prev, scheduleType: "later" }))}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Não vou enviar agora</span>
                  </label>

                  {filters.scheduleType === "later" && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pl-7">
                      <input
                        type="date"
                        value={filters.scheduleDate}
                        onChange={(e) => {
                          setFilters((prev) => ({ ...prev, scheduleDate: e.target.value }));
                          setErrors((prev) => ({ ...prev, scheduleDate: "" }));
                        }}
                        className={`px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${
                          errors.scheduleDate ? "border-red-500" : "border-gray-200 dark:border-gray-600"
                        } rounded-lg text-sm text-gray-900 dark:text-white`}
                      />
                      <input
                        type="time"
                        value={filters.scheduleTime}
                        onChange={(e) => {
                          setFilters((prev) => ({ ...prev, scheduleTime: e.target.value }));
                          setErrors((prev) => ({ ...prev, scheduleTime: "" }));
                        }}
                        className={`px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${
                          errors.scheduleTime ? "border-red-500" : "border-gray-200 dark:border-gray-600"
                        } rounded-lg text-sm text-gray-900 dark:text-white`}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Service Type */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <Package className="w-4 h-4 text-teal-600" />
                  Tipo de Serviço
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, serviceType: "returns" }));
                      setErrors((prev) => ({ ...prev, serviceType: "" }));
                    }}
                    className={`p-4 border-2 rounded-xl transition ${
                      filters.serviceType === "returns"
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Undo2 className={`w-6 h-6 mx-auto mb-1 ${
                      filters.serviceType === "returns" ? "text-teal-600 dark:text-teal-400" : "text-gray-400"
                    }`} />
                    <span className={`text-xs font-medium block ${
                      filters.serviceType === "returns" ? "text-teal-900 dark:text-teal-100" : "text-gray-600 dark:text-gray-400"
                    }`}>
                      Devolução
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setFilters((prev) => ({ ...prev, serviceType: "orders" }));
                      setErrors((prev) => ({ ...prev, serviceType: "" }));
                    }}
                    className={`p-4 border-2 rounded-xl transition ${
                      filters.serviceType === "orders"
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Package className={`w-6 h-6 mx-auto mb-1 ${
                      filters.serviceType === "orders" ? "text-teal-600 dark:text-teal-400" : "text-gray-400"
                    }`} />
                    <span className={`text-xs font-medium block ${
                      filters.serviceType === "orders" ? "text-teal-900 dark:text-teal-100" : "text-gray-600 dark:text-gray-400"
                    }`}>
                      Pedidos
                    </span>
                  </button>
                </div>
                {errors.serviceType && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.serviceType}</p>}
              </div>

              {/* Marketplaces */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Package className="w-4 h-4 text-teal-600" />
                    Marketplaces
                  </label>
                  <button
                    onClick={selectAllMarketplaces}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                  >
                    Selecionar Todos
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {marketplaces.filter((m) => m.is_active === 1).map((marketplace) => {
                    const isSelected = filters.selectedMarketplaces.includes(marketplace.id);
                    return (
                      <button
                        key={marketplace.id}
                        onClick={() => toggleMarketplace(marketplace.id)}
                        className={`p-2 border-2 rounded-lg transition ${
                          isSelected
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div className="w-full aspect-square rounded bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center p-1 mb-1">
                          {marketplace.logo_url ? (
                            <img src={marketplace.logo_url} alt={marketplace.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-semibold text-gray-400">{marketplace.name}</span>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-600 dark:text-gray-400 font-medium block truncate text-center">
                          {marketplace.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.marketplaces && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.marketplaces}</p>}
              </div>

              {/* Hide Negative Ratings */}
              <label className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hideNegativeRatings}
                  onChange={(e) => setFilters((prev) => ({ ...prev, hideNegativeRatings: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Ocultar pontos com avaliações negativas</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Remove pontos com média abaixo de 3 estrelas</div>
                </div>
              </label>

              {/* Search Button */}
              <button
                onClick={() => handleSearch(false)}
                disabled={searching}
                className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Buscando Pontos
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Buscar Pontos
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7">
            {!results && !searching && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-24 h-24 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-12 h-12 text-teal-600 dark:text-teal-400 animate-bounce" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Encontre Pontos de Coleta
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Preencha os filtros ao lado e clique em "Buscar Pontos" para encontrar os pontos mais próximos de você.
                </p>
                <button
                  onClick={viewAllPoints}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-lg"
                >
                  <List className="w-5 h-5" />
                  Ver Todos os Pontos
                </button>
              </div>
            )}

            {searching && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Loader2 className="w-12 h-12 text-teal-600 dark:text-teal-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Buscando pontos de coleta...</p>
              </div>
            )}

            {showNoResults && results?.points.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-amber-200 dark:border-amber-800 shadow-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Nenhum ponto encontrado
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Não encontramos pontos que atendam todos os filtros selecionados no horário informado.
                    </p>
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Deseja ajustar os filtros automaticamente?
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        O sistema pode remover marketplaces que estejam impedindo resultados e mostrar pontos disponíveis para os demais.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleSearch(true)}
                  disabled={searching}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-md"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Ajustando Filtros...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Ajustar Filtros Automaticamente
                    </>
                  )}
                </button>
              </div>
            )}

            {results && results.adjusted && results.removed_marketplaces && results.removed_marketplaces.length > 0 && (
              <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">Filtros ajustados</p>
                    <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                      {results.removed_marketplaces.map((rm) => (
                        <li key={rm.id} className="flex items-center gap-2">
                          <XCircle className="w-3 h-3" />
                          <span><strong>{rm.name}</strong>: {rm.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {results && results.points.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {results.points.filter(p => !filters.hideNegativeRatings || (p.avg_rating || 0) >= 3).length} {
                    results.points.filter(p => !filters.hideNegativeRatings || (p.avg_rating || 0) >= 3).length === 1 ? "ponto encontrado" : "pontos encontrados"
                  }
                </h3>

                {results.points.filter(point => !filters.hideNegativeRatings || (point.avg_rating || 0) >= 3).map((point) => {
                  const isFavorite = point.is_favorite || false;
                  const isBlocked = point.is_blocked || false;
                  
                  return (
                  <div
                    key={point.id}
                    className={`rounded-xl border overflow-hidden hover:shadow-md transition ${
                      isFavorite 
                        ? 'bg-red-50/30 dark:bg-red-900/10 border-red-200 dark:border-red-800' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="p-3 relative">
                      {/* Favorite and Block buttons */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        <button
                          onClick={(e) => toggleBlock(point.id, e)}
                          disabled={togglingPreference === point.id}
                          className={`p-1.5 rounded-lg transition ${
                            isBlocked
                              ? 'bg-gray-700 text-white'
                              : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          title={isBlocked ? "Desbloquear ponto" : "Bloquear ponto"}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(point.id, e)}
                          disabled={togglingPreference === point.id}
                          className={`p-1.5 rounded-lg transition ${
                            isFavorite
                              ? 'bg-red-500 text-white'
                              : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                          title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        >
                          <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      <div className="flex items-start gap-3">
                        {/* Photo */}
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0 overflow-hidden">
                          {point.photo_url ? (
                            <img src={point.photo_url} alt={point.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-7 h-7 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
                            {point.name}
                          </h4>

                          <div className="flex items-center gap-2 mb-1.5">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {point.street}, {point.number} - {point.neighborhood}
                            </p>
                            {point.distance !== undefined && (
                              <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-medium rounded-full whitespace-nowrap">
                                {point.distance.toFixed(1)} km
                              </span>
                            )}
                          </div>

                          {/* Rating and Services */}
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <button
                              onClick={() => viewPointReviews(point.id)}
                              className="flex items-center gap-2 hover:opacity-75 transition"
                            >
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= Math.round(point.avg_rating || 0)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-300 dark:text-gray-600"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {(point.avg_rating || 0).toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({point.review_count || 0})
                              </span>
                            </button>

                            {/* Services inline with rating */}
                            {point.accepts_uber_delivery === 1 && (
                              <Tooltip text="Esse ponto aceita que você envie sua mercadoria via Uber com Token para ele receber! Atenção: ele recebe mas caso houver algum contra tempo antes do recebimento ele não se responsabiliza!">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-[9px] font-medium cursor-help">
                                  <Car className="w-2.5 h-2.5" />
                                  Uber
                                </span>
                              </Tooltip>
                            )}
                            {point.sells_shipping_supplies === 1 && (
                              <Tooltip text="Esse ponto vende insumo como etiquetas de envio e embalagem">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-[9px] font-medium cursor-help">
                                  <ShoppingBag className="w-2.5 h-2.5" />
                                  Insumos
                                </span>
                              </Tooltip>
                            )}
                            {point.provides_resale_merchandise === 1 && (
                              <Tooltip text="Esse ponto vende mercadoria para revender no seu ecommerce ou marketplace">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-[9px] font-medium cursor-help">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Revenda
                                </span>
                              </Tooltip>
                            )}
                          </div>

                          {/* Marketplaces below rating */}
                          {point.marketplaces && point.marketplaces.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {point.marketplaces.map((marketplace: any) => (
                                <div
                                  key={marketplace.id}
                                  className="w-6 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded flex items-center justify-center p-0.5"
                                  title={marketplace.name}
                                >
                                  {marketplace.logo_url ? (
                                    <img 
                                      src={marketplace.logo_url} 
                                      alt={marketplace.name} 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : (
                                    <span className="text-[6px] font-semibold text-gray-400">
                                      {marketplace.name.substring(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Schedule Info with Live Countdown */}
                          <ClosingCountdown
                            closingTime={point.closing_time || null}
                            isOpen={point.is_open || false}
                            nextOpeningInfo={point.schedule_info?.includes('Abre') ? point.schedule_info : null}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => openGoogleMapsRoute(point)}
                          className="flex items-center justify-center gap-1.5 px-2.5 h-8 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition text-xs font-medium hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:hover:bg-blue-500 dark:hover:border-blue-500"
                        >
                          <Navigation className="w-3 h-3" />
                          Rota
                        </button>
                        <button
                          onClick={() => openReviewModal(point)}
                          className="flex items-center justify-center gap-1.5 px-2.5 h-8 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition text-xs font-medium hover:bg-yellow-500 hover:text-white hover:border-yellow-500 dark:hover:bg-yellow-500 dark:hover:border-yellow-500"
                        >
                          <Star className="w-3 h-3" />
                          Avaliar
                        </button>
                        {point.whatsapp_number && point.whatsapp_number.trim() !== "" && (
                          <button
                            onClick={() => openWhatsApp(point.whatsapp_number!, point.name)}
                            className="flex items-center justify-center gap-1.5 px-2.5 h-8 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition text-xs font-medium hover:bg-[#25D366] hover:text-white hover:border-[#25D366] dark:hover:bg-[#25D366] dark:hover:border-[#25D366] ml-auto"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reviews List Modal */}
      {reviewsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Avaliações - {reviewsModal.pointName}
                </h3>
                <button
                  onClick={() => setReviewsModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {reviewsModal.reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Nenhuma avaliação ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsModal.reviews.map((review: any) => (
                    <div key={review.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300 dark:text-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {review.rating}.0
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(review.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {reviewModal.userReview ? "Editar Avaliação" : "Avaliar Ponto"}
                </h3>
                <button
                  onClick={() => setReviewModal(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{reviewModal.point.name}</p>

              {appUser && (appUser.penalty_points ?? 0) >= 3 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800 dark:text-red-200">
                      <p className="font-semibold mb-1">Você foi bloqueado</p>
                      <p>Não é possível avaliar pontos de coleta.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stars */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    disabled={(appUser?.penalty_points ?? 0) >= 3}
                    className="p-2 hover:scale-110 transition-transform disabled:opacity-50"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= reviewRating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Deixe um comentário (opcional)"
                rows={4}
                disabled={(appUser?.penalty_points ?? 0) >= 3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50"
              />

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setReviewModal(null)}
                  className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveReview}
                  disabled={reviewRating === 0 || savingReview || (appUser ? (appUser.penalty_points ?? 0) >= 3 : false)}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                  {reviewModal.userReview ? "Atualizar" : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
