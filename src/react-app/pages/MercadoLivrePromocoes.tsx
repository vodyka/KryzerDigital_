import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Search,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Badge } from "@/react-app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { useAuth } from "@/react-app/contexts/AuthContext";

/**
 * ✅ Layout igual ao print do Mercado Livre / Gerenciar Ofertas
 * - Barra de filtros (ID do anúncio + busca, Hora, Data, Loja, Tipo)
 * - Esquerda: lista de promoções (Para começar / Em andamento / Finalizadas)
 * - Direita: lista de produtos elegíveis da promoção selecionada
 *
 * ⚠️ Para listar SOMENTE os elegíveis (igual ML), o ideal é o backend expor:
 * /api/integrations/mercadolivre/promotions/:promotionId/eligible-items?companyId=...&sellerId=...
 *
 * Se esse endpoint não existir, o componente faz fallback em:
 * /api/integrations/mercadolivre/listings?companyId=...
 * (nesse fallback, NÃO dá para garantir elegibilidade – só filtra por loja).
 */

interface Promotion {
  id: string;
  name: string;
  date_from: string;
  date_to: string;
  discount: number;
  status: string;
  deal_type: string;
  storeName: string;
  sellerId: string;
}

interface EligibleProduct {
  id: string;
  title: string;
  thumbnail: string;
  price: number;
  available_quantity: number;
  condition?: string;
  listing_type_id?: string;
  seller_custom_field?: string;
  seller_id?: string;

  // opcionais (se backend mandar)
  final_price?: number;
  you_receive?: number;
  discount_amount?: number;
  discount_percent?: number;
}

function asString(v: any): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function asNumber(v: any, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatMoneyBR(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizePromotion(raw: any): Promotion {
  const sellerId = asString(raw?.sellerId ?? raw?.seller_id ?? raw?.seller ?? raw?.storeSellerId);
  return {
    id: asString(raw?.id),
    name: asString(raw?.name ?? raw?.title ?? raw?.promotion_name),
    date_from: asString(raw?.date_from ?? raw?.dateFrom ?? raw?.start_date ?? raw?.startDate),
    date_to: asString(raw?.date_to ?? raw?.dateTo ?? raw?.end_date ?? raw?.endDate),
    discount: asNumber(raw?.discount ?? raw?.discount_rate ?? raw?.percentage ?? raw?.percent ?? 0, 0),
    status: asString(raw?.status ?? "").toLowerCase(),
    deal_type: asString(raw?.deal_type ?? raw?.dealType ?? raw?.type ?? "").toLowerCase(),
    storeName: asString(raw?.storeName ?? raw?.store_name ?? raw?.store ?? raw?.seller_name ?? ""),
    sellerId,
  };
}

function normalizeEligibleProduct(raw: any): EligibleProduct {
  return {
    id: asString(raw?.id ?? raw?.item_id ?? raw?.itemId),
    title: asString(raw?.title),
    thumbnail: asString(raw?.thumbnail ?? raw?.pictures?.[0]?.url ?? raw?.image ?? ""),
    price: asNumber(raw?.price ?? raw?.current_price ?? raw?.base_price ?? raw?.original_price ?? 0, 0),
    available_quantity: asNumber(raw?.available_quantity ?? raw?.availableQuantity ?? raw?.stock ?? 0, 0),
    condition: raw?.condition ? asString(raw.condition) : undefined,
    listing_type_id: raw?.listing_type_id ? asString(raw.listing_type_id) : undefined,
    seller_custom_field: raw?.seller_custom_field ? asString(raw.seller_custom_field) : undefined,
    seller_id: asString(raw?.seller_id ?? raw?.sellerId ?? raw?.seller ?? ""),
    final_price: raw?.final_price !== undefined ? asNumber(raw.final_price, 0) : undefined,
    you_receive: raw?.you_receive !== undefined ? asNumber(raw.you_receive, 0) : undefined,
    discount_amount: raw?.discount_amount !== undefined ? asNumber(raw.discount_amount, 0) : undefined,
    discount_percent: raw?.discount_percent !== undefined ? asNumber(raw.discount_percent, 0) : undefined,
  };
}

function getPromoStatusBucket(status: string): "pending" | "active" | "finished" {
  const s = (status || "").toLowerCase();
  if (["active", "started", "running"].includes(s)) return "active";
  if (["finished", "closed", "ended", "completed"].includes(s)) return "finished";
  return "pending";
}

function dealTypeLabel(dealType: string) {
  const t = (dealType || "").toLowerCase();
  if (t === "traditional") return "Promoção Tradicional";
  if (t === "campaign") return "Campanha Inteligente";
  if (t === "item_promotion") return "Item Promotion";
  return dealType || "—";
}

function getStatusBadge(status: string) {
  const s = (status || "").toLowerCase();
  if (["active", "started", "running"].includes(s)) {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        Ativa
      </Badge>
    );
  }
  if (["pending", "candidate", "scheduled", "programmed"].includes(s)) {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
        Para começar
      </Badge>
    );
  }
  if (["finished", "closed", "ended", "completed"].includes(s)) {
    return (
      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
        Finalizada
      </Badge>
    );
  }
  return <Badge variant="secondary">{status || "—"}</Badge>;
}

export default function MercadoLivrePromocoes() {
  const navigate = useNavigate();
  const { selectedCompany } = useAuth();

  // Barra superior (filtros iguais ao print)
  const [filterBy, setFilterBy] = useState<"item_id" | "sku" | "title">("item_id");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [hourFilter, setHourFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [dealTypeFilter, setDealTypeFilter] = useState<string>("all");

  // Tabs
  const [selectedTab, setSelectedTab] = useState<"pending" | "active" | "finished">("pending");

  // Estado geral
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promoções e seleção
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  // Produtos elegíveis (direita)
  const [eligibleProducts, setEligibleProducts] = useState<EligibleProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const loadPromotions = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const url = `/api/integrations/mercadolivre/promotions?companyId=${selectedCompany.id}`;

      const response = await fetch(url, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error((data && (data.error || data.message)) || "Erro ao carregar promoções");
      }

      const rawList =
        Array.isArray(data) ? data :
        Array.isArray(data?.promotions) ? data.promotions :
        Array.isArray(data?.results) ? data.results :
        Array.isArray(data?.data) ? data.data :
        [];

      const normalized: Promotion[] = rawList.map(normalizePromotion);
      setPromotions(normalized);

      // auto seleciona 1ª promoção da aba atual
      const firstForTab = normalized.find((p) => getPromoStatusBucket(p.status) === selectedTab) || null;
      setSelectedPromotion((prev) => prev || firstForTab);

      if (!selectedPromotion && firstForTab) {
        await loadEligibleProducts(firstForTab);
      }
    } catch (err) {
      console.error("[ML Promotions] load error:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar promoções");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany]);

  const loadEligibleProducts = async (promotion: Promotion) => {
    if (!selectedCompany) return;

    try {
      setLoadingProducts(true);
      setEligibleProducts([]);
      setSelectedProducts(new Set());

      const token = localStorage.getItem("token");

      // ✅ 1) recomendado: somente elegíveis
      const preferredUrl =
        `/api/integrations/mercadolivre/promotions/${encodeURIComponent(promotion.id)}/eligible-items` +
        `?companyId=${encodeURIComponent(selectedCompany.id)}` +
        `&sellerId=${encodeURIComponent(promotion.sellerId)}`;

      let resp = await fetch(preferredUrl, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const raw =
          Array.isArray(data) ? data :
          Array.isArray(data?.items) ? data.items :
          Array.isArray(data?.eligible_items) ? data.eligible_items :
          Array.isArray(data?.eligibleItems) ? data.eligibleItems :
          Array.isArray(data?.results) ? data.results :
          [];
        setEligibleProducts(raw.map(normalizeEligibleProduct));
        return;
      }

      // ✅ 2) fallback (não garante elegibilidade)
      const fallbackUrl = `/api/integrations/mercadolivre/listings?companyId=${selectedCompany.id}`;
      resp = await fetch(fallbackUrl, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) throw new Error("Erro ao carregar produtos (fallback)");

      const data = await resp.json().catch(() => ({}));
      const all = (data.listings || data.results || data.data || []).map(normalizeEligibleProduct);

      const promoSellerId = asString(promotion.sellerId);
      const storeOnly = all.filter((p: EligibleProduct) => asString(p.seller_id) === promoSellerId);

      setEligibleProducts(storeOnly);
    } catch (err) {
      console.error("[ML Promotions] load eligible products error:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    await loadPromotions();
    if (selectedPromotion) await loadEligibleProducts(selectedPromotion);
    setSyncing(false);
  };

  const stores = useMemo(() => {
    const map = new Map<string, string>();
    promotions.forEach((p) => {
      const id = asString(p.sellerId);
      const name = p.storeName || id;
      if (id && !map.has(id)) map.set(id, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [promotions]);

  const dealTypes = useMemo(() => {
    const set = new Set<string>();
    promotions.forEach((p) => {
      const t = (p.deal_type || "").toLowerCase();
      if (t) set.add(t);
    });
    return Array.from(set.values()).sort();
  }, [promotions]);

  const tabCounts = useMemo(() => {
    const pending = promotions.filter((p) => getPromoStatusBucket(p.status) === "pending").length;
    const active = promotions.filter((p) => getPromoStatusBucket(p.status) === "active").length;
    const finished = promotions.filter((p) => getPromoStatusBucket(p.status) === "finished").length;
    return { pending, active, finished };
  }, [promotions]);

  const filteredPromotions = useMemo(() => {
    let list = promotions.slice();

    list = list.filter((p) => getPromoStatusBucket(p.status) === selectedTab);

    if (selectedStore !== "all") list = list.filter((p) => asString(p.sellerId) === asString(selectedStore));

    if (dealTypeFilter !== "all") list = list.filter((p) => (p.deal_type || "").toLowerCase() === dealTypeFilter);

    if (dateFilter) {
      const dt = new Date(dateFilter);
      if (!Number.isNaN(dt.getTime())) {
        list = list.filter((p) => {
          const from = new Date(p.date_from);
          const to = new Date(p.date_to);
          if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return true;
          return dt >= from && dt <= to;
        });
      }
    }

    return list;
  }, [promotions, selectedTab, selectedStore, dealTypeFilter, dateFilter]);

  const filteredEligibleProducts = useMemo(() => {
    const term = productSearchTerm.trim().toLowerCase();
    if (!term) return eligibleProducts;

    return eligibleProducts.filter((p) => {
      if (filterBy === "item_id") return (p.id || "").toLowerCase().includes(term);
      if (filterBy === "sku") return (p.seller_custom_field || "").toLowerCase().includes(term);
      return (p.title || "").toLowerCase().includes(term);
    });
  }, [eligibleProducts, productSearchTerm, filterBy]);

  const handlePromotionClick = async (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    await loadEligibleProducts(promotion);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedProducts((prev) => {
      if (prev.size === filteredEligibleProducts.length && filteredEligibleProducts.length > 0) return new Set();
      return new Set(filteredEligibleProducts.map((p) => p.id));
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="px-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Promoções</h1>
          </div>

          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar Promoções
              </>
            )}
          </Button>
        </div>

        {/* Filters Row */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Select value={filterBy} onValueChange={(v) => setFilterBy(v as any)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="ID do Anúncios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="item_id">ID do Anúncios</SelectItem>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="title">Título</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative w-[320px] max-w-[70vw]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={productSearchTerm}
                onChange={(e) => setProductSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="pl-10 h-9"
              />
            </div>
          </div>

          <Select value={hourFilter} onValueChange={setHourFilter}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Hora de..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Hora de...</SelectItem>
              <SelectItem value="00-06">00h - 06h</SelectItem>
              <SelectItem value="06-12">06h - 12h</SelectItem>
              <SelectItem value="12-18">12h - 18h</SelectItem>
              <SelectItem value="18-24">18h - 24h</SelectItem>
            </SelectContent>
          </Select>

          <Input
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Filtrar por data"
            className="h-9 w-[160px]"
            type="date"
          />

          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Todas Lojas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Lojas</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder="Todos os Tipos..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos...</SelectItem>
              {dealTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {dealTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" className="h-9 px-2">
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex h-[calc(100vh-118px)]">
        {loading ? (
          <div className="flex items-center justify-center w-full py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="w-full p-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="text-red-800 dark:text-red-200">{error}</div>
            </div>
          </div>
        ) : (
          <>
            {/* LEFT */}
            <div className="w-[780px] max-w-[55vw] border-r border-gray-200 dark:border-gray-800">
              {/* Tabs */}
              <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setSelectedTab("pending")}
                  className={`h-8 px-3 rounded-md text-sm font-medium ${
                    selectedTab === "pending"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
                  }`}
                >
                  Para começar <Badge variant="secondary" className="ml-2">{tabCounts.pending}</Badge>
                </button>

                <button
                  onClick={() => setSelectedTab("active")}
                  className={`h-8 px-3 rounded-md text-sm font-medium ${
                    selectedTab === "active"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
                  }`}
                >
                  Em Andamento <Badge variant="secondary" className="ml-2">{tabCounts.active}</Badge>
                </button>

                <button
                  onClick={() => setSelectedTab("finished")}
                  className={`h-8 px-3 rounded-md text-sm font-medium ${
                    selectedTab === "finished"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
                  }`}
                >
                  Finalizadas <Badge variant="secondary" className="ml-2">{tabCounts.finished}</Badge>
                </button>

                <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>Total {filteredPromotions.length}</span>
                  <span>•</span>
                  <span>1/1</span>
                  <span>•</span>
                  <span>50/página</span>
                </div>
              </div>

              {/* Promotions list */}
              <div className="h-[calc(100%-48px)] overflow-y-auto">
                {filteredPromotions.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma promoção encontrada
                  </div>
                ) : (
                  filteredPromotions.map((promo) => {
                    const selected = selectedPromotion?.id === promo.id;
                    return (
                      <button
                        key={promo.id}
                        onClick={() => handlePromotionClick(promo)}
                        className={`w-full text-left px-4 py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 ${
                          selected ? "bg-blue-50/70 dark:bg-blue-900/10" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-1 self-stretch rounded-full ${selected ? "bg-blue-600" : "bg-transparent"}`} />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatDate(promo.date_from)} - {formatDate(promo.date_to)}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">{promo.name}</span>
                              <span className="text-gray-400">|</span>
                              <span>{dealTypeLabel(promo.deal_type)}</span>
                              <span className="text-gray-400">|</span>
                              <span>Desconto: {promo.discount ? `${promo.discount}%` : "—"}</span>
                            </div>

                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              ML - {promo.storeName || promo.sellerId || "—"}
                            </div>
                          </div>

                          <div className="mt-0.5">{getStatusBadge(promo.status)}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Selecionado {selectedProducts.size}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-700 dark:text-gray-300"
                  disabled={selectedProducts.size === 0}
                >
                  Participar em Massa
                </Button>

                <div className="ml-auto text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>Total {filteredEligibleProducts.length}</span>
                  <span>•</span>
                  <span>1/1</span>
                  <span>•</span>
                  <span>50/pág...</span>
                </div>
              </div>

              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 flex items-center">
                <button onClick={toggleAll} className="w-8 flex items-center justify-center">
                  {selectedProducts.size === filteredEligibleProducts.length && filteredEligibleProducts.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 font-medium text-gray-800 dark:text-gray-200">Produtos</div>

                <button
                  className="text-blue-600 text-xs hover:underline mr-4"
                  onClick={() => selectedPromotion && loadEligibleProducts(selectedPromotion)}
                >
                  Sincronizar os Anúncios em Promoção
                </button>

                <div className="w-[90px] text-right font-medium">Ação</div>
              </div>

              <div className="h-[calc(100%-88px)] overflow-y-auto">
                {!selectedPromotion ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    Selecione uma promoção à esquerda
                  </div>
                ) : loadingProducts ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : filteredEligibleProducts.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
                    Nenhum produto disponível nesta loja
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      (Se no Mercado Livre aparece, está faltando o endpoint de eligible-items no backend.)
                    </div>
                  </div>
                ) : (
                  <div>
                    {filteredEligibleProducts.map((p) => {
                      const checked = selectedProducts.has(p.id);
                      return (
                        <div
                          key={p.id}
                          className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        >
                          <button
                            onClick={() => toggleProductSelection(p.id)}
                            className="w-8 flex items-center justify-center mt-1"
                          >
                            {checked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          <div className="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            {p.thumbnail ? (
                              <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                            ) : null}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-700 dark:text-gray-200">{p.id}</span>
                              {p.condition ? <span>• {p.condition}</span> : null}
                              {p.seller_custom_field ? <span>• {p.seller_custom_field}</span> : null}
                              {p.listing_type_id ? <span>• {p.listing_type_id}</span> : null}
                            </div>

                            <div className="text-sm text-gray-900 dark:text-white font-medium leading-5 mt-0.5 line-clamp-2">
                              {p.title}
                            </div>

                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                                {formatMoneyBR(p.price)}
                              </span>
                              <span>× {p.available_quantity} un</span>

                              {typeof p.final_price === "number" ? (
                                <span className="text-gray-500">• final: {formatMoneyBR(p.final_price)}</span>
                              ) : null}
                              {typeof p.you_receive === "number" ? (
                                <span className="text-gray-500">• você recebe: {formatMoneyBR(p.you_receive)}</span>
                              ) : null}
                            </div>
                          </div>

                          <div className="w-[90px] flex justify-end">
                            <Button size="sm" variant="link" className="text-blue-600">
                              Participar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
