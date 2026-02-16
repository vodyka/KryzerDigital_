import { useNavigate } from "react-router";
import MentoriaHeader from "@/react-app/components/MentoriaHeader";
import Footer from "@/react-app/components/Footer";
import { useState, useEffect } from "react";
import {
  MapPin,
  Search,
  Calendar,
  Undo2,
  Package,
  Loader2,
  Star,
  Navigation,
  Info,
  Clock,
  Car,
  ShoppingBag,
  RefreshCw,
  MessageCircle,
  Lock,
} from "lucide-react";
import { ClosingCountdown } from "../components/ClosingCountdown";

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
}

interface SearchFilters {
  cep: string;
  scheduleType: "now" | "later";
  scheduleDate: string;
  scheduleTime: string;
  serviceType: "returns" | "orders" | null;
  selectedMarketplaces: number[];
}

interface SearchResult {
  points: CollectionPoint[];
  removed_marketplaces?: { id: number; name: string; reason: string }[];
  adjusted?: boolean;
}

export default function BuscarPontosColetaPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  const [filters, setFilters] = useState<SearchFilters>(() => {
    const savedCEP = localStorage.getItem("collectionPoints_savedCEP");
    return {
      cep: savedCEP || "",
      scheduleType: "now",
      scheduleDate: "",
      scheduleTime: "",
      serviceType: null,
      selectedMarketplaces: [],
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
      const marketplacesRes = await fetch("/api/marketplaces");

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

  const handleSearch = async () => {
    if (!validate()) return;

    setSearching(true);
    setResults(null);

    try {
      const payload = {
        cep: filters.cep.replace(/\D/g, ""),
        schedule_type: filters.scheduleType,
        schedule_date: filters.scheduleType === "later" ? filters.scheduleDate : null,
        schedule_time: filters.scheduleType === "later" ? filters.scheduleTime : null,
        service_type: filters.serviceType,
        marketplace_ids: filters.selectedMarketplaces,
        adjust_filters: false,
      };

      const response = await fetch("/api/collection-points/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const openGoogleMapsRoute = async (point: CollectionPoint) => {
    try {
      await fetch(`/api/collection-points/${point.id}/track-route-click`, {
        method: "POST",
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

  const formatDate = (date: Date) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MentoriaHeader onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)', paddingTop: '120px' }}>
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MentoriaHeader onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <main className="container mx-auto px-4 lg:px-8 py-8" style={{ paddingTop: '140px' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
              <span style={{ color: '#ffd432' }}>Busca de Pontos</span> de Coleta
            </h1>
            <p className="text-xl text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Encontre pontos próximos para envio e devolução
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 sticky top-24">
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
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    Seu CEP
                  </label>
                  <input
                    type="text"
                    value={filters.cep}
                    onChange={handleCEPChange}
                    maxLength={10}
                    placeholder="XX.XXX-XXX"
                    className={`w-full px-4 py-3 bg-gray-50 border ${
                      errors.cep ? "border-red-500" : "border-gray-200"
                    } rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {errors.cep && <p className="mt-1 text-xs text-red-600">{errors.cep}</p>}
                </div>

                {/* Schedule */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    Agendamento
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-teal-500 transition">
                      <input
                        type="radio"
                        checked={filters.scheduleType === "now"}
                        onChange={() => setFilters((prev) => ({ ...prev, scheduleType: "now" }))}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Vou enviar agora</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-teal-500 transition">
                      <input
                        type="radio"
                        checked={filters.scheduleType === "later"}
                        onChange={() => setFilters((prev) => ({ ...prev, scheduleType: "later" }))}
                        className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Não vou enviar agora</span>
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
                          className={`px-3 py-2 bg-gray-50 border ${
                            errors.scheduleDate ? "border-red-500" : "border-gray-200"
                          } rounded-lg text-sm text-gray-900`}
                        />
                        <input
                          type="time"
                          value={filters.scheduleTime}
                          onChange={(e) => {
                            setFilters((prev) => ({ ...prev, scheduleTime: e.target.value }));
                            setErrors((prev) => ({ ...prev, scheduleTime: "" }));
                          }}
                          className={`px-3 py-2 bg-gray-50 border ${
                            errors.scheduleTime ? "border-red-500" : "border-gray-200"
                          } rounded-lg text-sm text-gray-900`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Type */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
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
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Undo2 className={`w-6 h-6 mx-auto mb-1 ${
                        filters.serviceType === "returns" ? "text-teal-600" : "text-gray-400"
                      }`} />
                      <span className={`text-xs font-medium block ${
                        filters.serviceType === "returns" ? "text-teal-900" : "text-gray-600"
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
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Package className={`w-6 h-6 mx-auto mb-1 ${
                        filters.serviceType === "orders" ? "text-teal-600" : "text-gray-400"
                      }`} />
                      <span className={`text-xs font-medium block ${
                        filters.serviceType === "orders" ? "text-teal-900" : "text-gray-600"
                      }`}>
                        Pedidos
                      </span>
                    </button>
                  </div>
                  {errors.serviceType && <p className="mt-2 text-xs text-red-600">{errors.serviceType}</p>}
                </div>

                {/* Marketplaces */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <Package className="w-4 h-4 text-teal-600" />
                      Marketplaces
                    </label>
                    <button
                      onClick={selectAllMarketplaces}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium"
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
                              ? "border-teal-500 bg-teal-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="w-full aspect-square rounded bg-white border border-gray-100 flex items-center justify-center p-1 mb-1">
                            {marketplace.logo_url ? (
                              <img src={marketplace.logo_url} alt={marketplace.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-[10px] font-semibold text-gray-400">{marketplace.name}</span>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-600 font-medium block truncate text-center">
                            {marketplace.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.marketplaces && <p className="mt-2 text-xs text-red-600">{errors.marketplaces}</p>}
                </div>

                {/* Search Button */}
                <button
                  onClick={handleSearch}
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
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-12 h-12 text-teal-600 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Encontre Pontos de Coleta
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Preencha os filtros ao lado e clique em "Buscar Pontos" para encontrar os pontos mais próximos de você.
                  </p>

                  {/* CTA para área logada */}
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300 p-6 max-w-md mx-auto">
                    <div className="flex items-start gap-3 mb-4">
                      <Lock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Quer salvar seus favoritos?
                        </h4>
                        <p className="text-sm text-gray-700 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Faça login para marcar pontos favoritos, bloquear indesejados e deixar avaliações.
                        </p>
                        <button
                          onClick={handleRegisterClick}
                          className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-xl font-bold transition shadow-lg"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                          Criar Conta Grátis
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {searching && (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                  <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Buscando pontos de coleta...</p>
                </div>
              )}

              {results && results.points.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {results.points.length} {results.points.length === 1 ? "ponto encontrado" : "pontos encontrados"}
                  </h3>

                  {results.points.map((point) => (
                    <div
                      key={point.id}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition"
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Photo */}
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
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
                            <h4 className="text-base font-semibold text-gray-900 mb-0.5">
                              {point.name}
                            </h4>

                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-xs text-gray-600">
                                {point.street}, {point.number} - {point.neighborhood}
                              </p>
                              {point.distance !== undefined && (
                                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full whitespace-nowrap">
                                  {point.distance.toFixed(1)} km
                                </span>
                              )}
                            </div>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= Math.round(point.avg_rating || 0)
                                        ? "text-yellow-400 fill-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs font-medium text-gray-700">
                                {(point.avg_rating || 0).toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({point.review_count || 0})
                              </span>

                              {/* Services */}
                              {point.accepts_uber_delivery === 1 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-medium">
                                  <Car className="w-2.5 h-2.5" />
                                  Uber
                                </span>
                              )}
                              {point.sells_shipping_supplies === 1 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] font-medium">
                                  <ShoppingBag className="w-2.5 h-2.5" />
                                  Insumos
                                </span>
                              )}
                              {point.provides_resale_merchandise === 1 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-medium">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  Revenda
                                </span>
                              )}
                            </div>

                            {/* Marketplaces */}
                            {point.marketplaces && Array.isArray(point.marketplaces) && point.marketplaces.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1.5">
                                {point.marketplaces.map((marketplace: any) => (
                                  <div
                                    key={marketplace.id}
                                    className="w-6 h-6 bg-white border border-gray-200 rounded flex items-center justify-center p-0.5"
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

                            {/* Schedule Info */}
                            <ClosingCountdown
                              closingTime={point.closing_time || null}
                              isOpen={point.is_open || false}
                              nextOpeningInfo={point.schedule_info?.includes('Abre') ? point.schedule_info : null}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => openGoogleMapsRoute(point)}
                            className="flex items-center justify-center gap-1.5 px-2.5 h-8 bg-white text-gray-700 border border-gray-300 rounded-lg transition text-xs font-medium hover:bg-blue-500 hover:text-white hover:border-blue-500"
                          >
                            <Navigation className="w-3 h-3" />
                            Rota
                          </button>
                          {point.whatsapp_number && point.whatsapp_number.trim() !== "" && (
                            <button
                              onClick={() => openWhatsApp(point.whatsapp_number!, point.name)}
                              className="flex items-center justify-center gap-1.5 px-2.5 h-8 bg-white text-gray-700 border border-gray-300 rounded-lg transition text-xs font-medium hover:bg-[#25D366] hover:text-white hover:border-[#25D366] ml-auto"
                            >
                              <MessageCircle className="w-3 h-3" />
                              WhatsApp
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results && results.points.length === 0 && (
                <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Info className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Nenhum ponto encontrado
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">
                        Não encontramos pontos que atendam todos os filtros selecionados no horário informado.
                      </p>
                      <p className="text-sm text-gray-600">
                        Tente ajustar os filtros ou selecionar outros marketplaces.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
