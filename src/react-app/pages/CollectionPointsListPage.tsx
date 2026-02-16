import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Search,
  Loader2,
  Star,
  Navigation,
  X,
  Car,
  ShoppingBag,
  RefreshCw,
  MessageCircle,
  ChevronDown,
  Filter,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip } from "../components/Tooltip";
import { MarketplaceScheduleTooltip } from "../components/MarketplaceScheduleTooltip";
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
  avg_rating?: number;
  review_count?: number;
  marketplaces?: Marketplace[];
  is_open?: boolean;
  schedule_info?: string;
  accepts_uber_delivery?: number;
  sells_shipping_supplies?: number;
  provides_resale_merchandise?: number;
  whatsapp_number?: string;
  opening_time?: string;
  closing_time?: string;
}

export default function CollectionPointsListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<"rating" | "closes-late" | "closes-early">("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [reviewsModal, setReviewsModal] = useState<{ pointId: number; pointName: string; reviews: any[]; myReview: any | null } | null>(null);
  const [togglingPreference, setTogglingPreference] = useState<number | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pointsRes, marketplacesRes] = await Promise.all([
        fetch("/api/collection-points"),
        fetch("/api/marketplaces"),
      ]);

      if (pointsRes.ok) {
        const data = await pointsRes.json();
        setPoints(data.collection_points || []);
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

  const toggleMarketplace = (id: number) => {
    setSelectedMarketplaces((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const openGoogleMapsRoute = async (point: CollectionPoint) => {
    // Track the route click
    try {
      await fetch(`/api/collection-points/${point.id}/track-route-click`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to track route click:", error);
    }

    // Open Google Maps
    const destination = point.cep;
    const url = `https://www.google.com/maps/search/?api=1&query=${destination}`;
    window.open(url, "_blank");
  };

  const openWhatsApp = (whatsappNumber: string, pointName: string) => {
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá! Gostaria de saber mais sobre o ponto de coleta ${pointName}.`);
    const url = `https://wa.me/${cleanNumber}?text=${message}`;
    window.open(url, "_blank");
  };

  const toggleFavorite = async (pointId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingPreference(pointId);
    try {
      const response = await fetch(`/api/collection-points/${pointId}/favorite`, {
        method: "POST",
      });

      if (response.ok) {
        setPoints(prevPoints => 
          prevPoints.map(p => 
            p.id === pointId ? { ...p, is_favorite: !(p as any).is_favorite } : p
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setTogglingPreference(null);
    }
  };

  const toggleBlock = async (pointId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingPreference(pointId);
    try {
      const response = await fetch(`/api/collection-points/${pointId}/block`, {
        method: "POST",
      });

      if (response.ok) {
        setPoints(prevPoints => 
          prevPoints.map(p => 
            p.id === pointId ? { ...p, is_blocked: !(p as any).is_blocked } : p
          )
        );
      }
    } catch (error) {
      console.error("Failed to toggle block:", error);
    } finally {
      setTogglingPreference(null);
    }
  };

  const viewPointReviews = async (pointId: number) => {
    try {
      const [reviewsRes, myReviewRes] = await Promise.all([
        fetch(`/api/collection-points/${pointId}/reviews`),
        fetch(`/api/collection-points/${pointId}/my-review`),
      ]);

      let reviews = [];
      let myReview = null;

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        reviews = data.reviews || [];
      }

      if (myReviewRes.ok) {
        const data = await myReviewRes.json();
        myReview = data.review;
      }

      const point = points.find((p) => p.id === pointId);
      setReviewsModal({
        pointId,
        pointName: point?.name || "Ponto de Coleta",
        reviews,
        myReview,
      });

      // If user has a review, load it into the form
      if (myReview) {
        setReviewRating(myReview.rating);
        setReviewComment(myReview.comment || "");
        setShowReviewForm(true);
      } else {
        setReviewRating(5);
        setReviewComment("");
        setShowReviewForm(false);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewsModal) return;

    setSubmittingReview(true);
    try {
      const response = await fetch(`/api/collection-points/${reviewsModal.pointId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        }),
      });

      if (response.ok) {
        // Refresh reviews
        await viewPointReviews(reviewsModal.pointId);
        // Refresh points to update rating
        await fetchData();
        alert("Avaliação salva com sucesso!");
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao salvar avaliação");
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Erro ao salvar avaliação");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewsModal) return;
    if (!confirm("Deseja excluir sua avaliação?")) return;

    try {
      const response = await fetch(`/api/collection-points/${reviewsModal.pointId}/reviews`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh reviews
        await viewPointReviews(reviewsModal.pointId);
        // Refresh points to update rating
        await fetchData();
        setShowReviewForm(false);
        setReviewRating(5);
        setReviewComment("");
        alert("Avaliação excluída!");
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao excluir avaliação");
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Erro ao excluir avaliação");
    }
  };

  const filteredAndSortedPoints = points
    .filter((point) => {
      if (!point.is_active) return false;

      const matchesSearch =
        searchQuery === "" ||
        point.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        point.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()) ||
        point.street.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMarketplaces =
        selectedMarketplaces.length === 0 ||
        (Array.isArray(point.marketplaces) && point.marketplaces.some((m) => selectedMarketplaces.includes(m.id)));

      return matchesSearch && matchesMarketplaces;
    })
    .sort((a, b) => {
      // First sort by preference: favorites first, blocked last, normal in middle
      const aFavorite = (a as any).is_favorite ? 1 : 0;
      const bFavorite = (b as any).is_favorite ? 1 : 0;
      const aBlocked = (a as any).is_blocked ? 1 : 0;
      const bBlocked = (b as any).is_blocked ? 1 : 0;
      
      // Favorites get -1, normal gets 0, blocked gets 1
      const aPreference = aBlocked ? 1 : (aFavorite ? -1 : 0);
      const bPreference = bBlocked ? 1 : (bFavorite ? -1 : 0);
      
      if (aPreference !== bPreference) {
        return aPreference - bPreference;
      }
      
      // Within each group, sort by selected criteria
      if (sortBy === "rating") {
        return (b.avg_rating || 0) - (a.avg_rating || 0);
      } else if (sortBy === "closes-late") {
        const aTime = a.closing_time || "00:00";
        const bTime = b.closing_time || "00:00";
        return bTime.localeCompare(aTime);
      } else if (sortBy === "closes-early") {
        const aTime = a.closing_time || "23:59";
        const bTime = b.closing_time || "23:59";
        return aTime.localeCompare(bTime);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="min-h-screen bg-gray-50 dark:bg-gray-900"
    >
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/pontos-coleta")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Voltar para busca"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Todos os Pontos</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{filteredAndSortedPoints.length} pontos disponíveis</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, bairro ou rua..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="rating">Melhor Avaliado</option>
                <option value="closes-late">Fecha Mais Tarde</option>
                <option value="closes-early">Fecha Mais Cedo</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition font-medium"
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Marketplaces
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5">
                {marketplaces.filter((m) => m.is_active === 1).map((marketplace) => {
                  const isSelected = selectedMarketplaces.includes(marketplace.id);
                  return (
                    <button
                      key={marketplace.id}
                      onClick={() => toggleMarketplace(marketplace.id)}
                      className={`p-1 border-2 rounded-md transition ${
                        isSelected
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-full aspect-square rounded bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center p-0.5 mb-0.5">
                        {marketplace.logo_url ? (
                          <img
                            src={marketplace.logo_url}
                            alt={marketplace.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[8px] font-semibold text-gray-400">
                            {marketplace.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] text-gray-600 dark:text-gray-400 font-medium block truncate text-center">
                        {marketplace.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Points List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedPoints.map((point) => {
            const isFavorite = (point as any).is_favorite || false;
            const isBlocked = (point as any).is_blocked || false;
            
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
                  <div className="flex-1 min-w-0 pr-20">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5">
                      {point.name}
                    </h4>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1.5">
                      {point.street}, {point.number} - {point.neighborhood}
                    </p>

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

                    {/* Marketplaces */}
                    {point.marketplaces && Array.isArray(point.marketplaces) && point.marketplaces.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {point.marketplaces.map((marketplace: any) => (
                          <MarketplaceScheduleTooltip
                            key={marketplace.id}
                            pointId={point.id}
                            marketplaceId={marketplace.id}
                            marketplaceName={marketplace.name}
                            marketplaceLogo={marketplace.logo_url}
                          />
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
                    onClick={() => viewPointReviews(point.id)}
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

        {filteredAndSortedPoints.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum ponto encontrado</p>
          </div>
        )}
      </main>

      {/* Reviews Modal with Form */}
      {reviewsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {reviewsModal.pointName}
                </h3>
                <button
                  onClick={() => {
                    setReviewsModal(null);
                    setShowReviewForm(false);
                    setReviewRating(5);
                    setReviewComment("");
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* My Review Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Minha Avaliação
                  </h4>
                  {reviewsModal.myReview && !showReviewForm && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Editar
                    </button>
                  )}
                  {!reviewsModal.myReview && !showReviewForm && (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Adicionar avaliação
                    </button>
                  )}
                </div>

                {showReviewForm ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-4">
                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nota
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setReviewRating(star)}
                            className="p-1 hover:scale-110 transition"
                          >
                            <Star
                              className={`w-8 h-8 ${
                                star <= reviewRating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {reviewRating}.0
                        </span>
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Comentário (opcional)
                      </label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Compartilhe sua experiência..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition"
                      >
                        {submittingReview ? "Salvando..." : "Salvar Avaliação"}
                      </button>
                      <button
                        onClick={() => {
                          setShowReviewForm(false);
                          if (!reviewsModal.myReview) {
                            setReviewRating(5);
                            setReviewComment("");
                          }
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition"
                      >
                        Cancelar
                      </button>
                      {reviewsModal.myReview && (
                        <button
                          onClick={handleDeleteReview}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition ml-auto"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                ) : reviewsModal.myReview ? (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= reviewsModal.myReview.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {reviewsModal.myReview.rating}.0
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                        {new Date(reviewsModal.myReview.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {reviewsModal.myReview.comment && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {reviewsModal.myReview.comment}
                      </p>
                    )}
                    {reviewsModal.myReview.is_moderated === 1 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ Esta avaliação foi moderada e não pode ser editada
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Você ainda não avaliou este ponto
                    </p>
                  </div>
                )}
              </div>

              {/* All Reviews Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Todas as Avaliações ({reviewsModal.reviews.length})
                </h4>
                {reviewsModal.reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Nenhuma avaliação ainda. Seja o primeiro!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
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
                          <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
