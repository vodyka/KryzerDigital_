import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Filter,
  Plus,
  ChevronDown,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { Badge } from "@/react-app/components/ui/badge";
import { useAuth } from "@/react-app/contexts/AuthContext";

interface MLListing {
  id: string;
  sku: string;
  title: string;
  subtitle: string;
  price: number;
  originalPrice: number | null;
  availableQuantity: number;
  soldQuantity: number;
  thumbnail: string;
  permalink: string;
  status: string;
  listingType: string;
  categoryId: string;
  categoryName: string;
  freeShipping: boolean;
  logisticType: string;
  health: number;
  createdAt: string;
  updatedAt: string;
  storeName: string;
}

// Mapeamento de tipos de anúncio do ML
const getListingTypeName = (listingType: string): string => {
  const typeMap: { [key: string]: string } = {
    gold_pro: "Premium",
    gold_special: "Clássico",
    gold: "Ouro",
    silver: "Prata",
    bronze: "Bronze",
    free: "Grátis",
  };
  return typeMap[listingType] || listingType;
};

const getLogisticTypeName = (type: string): string => {
  const types: { [key: string]: string } = {
    fulfillment: "Full",
    drop_off: "Agência",
    cross_docking: "Coleta",
    xd_drop_off: "Place",
    self_service: "Próprio",
  };
  return types[type] || type;
};

const getListingTypeBadgeColor = (type: string): string => {
  if (type.includes("gold_pro") || type.includes("premium")) {
    return "bg-yellow-500 text-white dark:bg-yellow-600";
  }
  if (type.includes("gold_special")) {
    return "bg-blue-500 text-white dark:bg-blue-600";
  }
  return "bg-gray-500 text-white dark:bg-gray-600";
};

// Helpers
function safeStr(v: any, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

/**
 * Parse numérico tolerante a formato BR:
 * "R$ 1.234,56" -> 1234.56
 * "59,80" -> 59.80
 * "1234.56" -> 1234.56
 */
function parseNumberLoose(v: any, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const s = String(v).trim();
  if (!s) return fallback;

  const cleaned = s.replace(/[^\d.,-]/g, "");
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(",", ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? n : fallback;
}

function parseNumberLooseOrNull(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = parseNumberLoose(v, NaN);
  return Number.isFinite(n) ? n : null;
}

function getDiscountPercent(price: number, original: number | null) {
  if (!original || original <= 0) return null;
  const diff = original - price;
  if (diff <= 0) return null;
  return Math.round((diff / original) * 100);
}

function pickSellerSku(it: any): string {
  const direct =
    it.sku ??
    it.seller_custom_field ??
    it.sellerCustomField ??
    it?.attributes?.find?.((a: any) => a.id === "SELLER_SKU")?.value_name ??
    it?.attributes?.find?.((a: any) => a.id === "SELLER_CUSTOM_FIELD")?.value_name;

  if (direct) return String(direct);

  const fromVar =
    it?.variations?.[0]?.seller_custom_field ??
    it?.variations?.[0]?.attributes?.find?.((a: any) => a.id === "SELLER_SKU")?.value_name;

  return fromVar ? String(fromVar) : "";
}

function pickPrices(it: any) {
  const price = parseNumberLoose(
    it.price ??
      it.currentPrice ??
      it.current_price ??
      it.sale_price?.amount ??
      it.salePrice?.amount ??
      it.prices?.sale_price?.amount ??
      it.prices?.prices?.find?.((p: any) => p.type === "sale")?.amount ??
      it.prices?.prices?.find?.((p: any) => p.type === "promotion")?.amount ??
      it.prices?.prices?.find?.((p: any) => p.type === "current")?.amount,
    0
  );

  const originalCandidate =
    it.originalPrice ??
    it.original_price ??
    it.base_price ??
    it.prices?.original_price ??
    it.prices?.base_price ??
    it.prices?.prices?.find?.((p: any) => p.type === "standard")?.amount ??
    it.prices?.prices?.find?.((p: any) => p.type === "original")?.amount ??
    it.prices?.prices?.find?.((p: any) => p.type === "base")?.amount;

  let originalPrice = parseNumberLooseOrNull(originalCandidate);

  const pricesArr = it?.prices?.prices;
  if ((!originalPrice || originalPrice <= 0) && Array.isArray(pricesArr) && pricesArr.length) {
    const amounts = pricesArr
      .map((p: any) => parseNumberLoose(p?.amount, NaN))
      .filter((n: number) => Number.isFinite(n));
    if (amounts.length) originalPrice = Math.max(...amounts);
  }

  if (originalPrice !== null && originalPrice <= price) {
    originalPrice = null;
  }

  return { price, originalPrice };
}

/**
 * Normaliza um listing vindo do backend, porque pode vir:
 * - snake_case (original_price, available_quantity, sold_quantity, date_created, last_updated)
 * - promo em sale_price/prices/base_price
 */
function normalizeListing(it: any): MLListing {
  const { price, originalPrice } = pickPrices(it);
  const sku = pickSellerSku(it);

  return {
    // muitos backends salvam listing_id separado de id
    id: safeStr(it.listing_id ?? it.listingId ?? it.id),

    sku,
    title: safeStr(it.title),
    subtitle: safeStr(it.subtitle ?? ""),

    price,
    originalPrice,

    availableQuantity: parseNumberLoose(it.availableQuantity ?? it.available_quantity ?? 0, 0),
    soldQuantity: parseNumberLoose(it.soldQuantity ?? it.sold_quantity ?? 0, 0),

    thumbnail: safeStr(it.thumbnail ?? it.pictures?.[0]?.url ?? ""),
    permalink: safeStr(it.permalink ?? ""),

    status: safeStr(it.status ?? ""),
    listingType: safeStr(it.listingType ?? it.listing_type_id ?? it.listing_type ?? ""),
    categoryId: safeStr(it.categoryId ?? it.category_id ?? ""),
    categoryName: safeStr(it.categoryName ?? it.category_name ?? ""),

    freeShipping: Boolean(it.freeShipping ?? it.shipping?.free_shipping ?? false),
    logisticType: safeStr(it.logisticType ?? it.shipping?.logistic_type ?? ""),

    health: parseNumberLoose(it.health ?? it.health_score ?? 0, 0),

    createdAt: safeStr(it.createdAt ?? it.date_created ?? ""),
    updatedAt: safeStr(it.updatedAt ?? it.last_updated ?? ""),

    storeName: safeStr(it.storeName ?? it.store_name ?? ""),
  };
}

export default function MercadoLivreAtivo() {
  const navigate = useNavigate();
  const { selectedCompany } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems] = useState<string[]>([]);
  const [listings, setListings] = useState<MLListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "paused">("active");
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCompany?.id) return;
    checkExpiredIntegrations();
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id]);

  const checkExpiredIntegrations = async () => {
    if (!selectedCompany?.id) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/integrations/mercadolivre/list?companyId=${selectedCompany.id}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      // Verificação de integrações expiradas - apenas para logging
      const data = await response.json();
      const now = new Date();
      const hasExpired = (data.integrations || []).some((integration: any) => {
        const expiresAt = new Date(integration.expires_at);
        return expiresAt < now;
      });

      if (hasExpired) {
        console.log("Aviso: Uma ou mais integrações estão expiradas");
      }
    } catch (err) {
      console.error("Erro ao verificar integrações expiradas:", err);
    }
  };

  const fetchListings = async () => {
    if (!selectedCompany?.id) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/integrations/mercadolivre/listings?companyId=${selectedCompany.id}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Erro ao buscar anúncios" }));
        throw new Error(errorData.error || "Erro ao buscar anúncios");
      }

      const data = await response.json();

      const raw = (data.listings || []) as any[];
      const normalized = raw.map(normalizeListing);

      setListings(normalized);

      if (normalized.length > 0 && normalized[0].updatedAt) {
        setLastSync(normalized[0].updatedAt);
      }
    } catch (err) {
      console.error("Erro ao buscar anúncios:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar anúncios");
    } finally {
      setLoading(false);
    }
  };

  const syncListings = async () => {
    if (!selectedCompany?.id) return;

    try {
      setSyncing(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/integrations/mercadolivre/sync-listings?companyId=${selectedCompany.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Erro ao sincronizar" }));
        throw new Error(errorData.error || "Erro ao sincronizar");
      }

      await fetchListings();
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
      setError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const activeCount = listings.filter((l) => l.status === "active").length;
  const pausedCount = listings.filter((l) => l.status === "paused").length;

  const filteredListings = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return listings.filter((listing) => {
      if (activeTab === "active" && listing.status !== "active") return false;
      if (activeTab === "paused" && listing.status !== "paused") return false;
      if (!s) return true;
      return (
        listing.title.toLowerCase().includes(s) ||
        listing.id.toLowerCase().includes(s) ||
        (listing.sku || "").toLowerCase().includes(s)
      );
    });
  }, [listings, searchTerm, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6">
        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Título, SKU ou ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={syncListings} disabled={syncing || loading}>
              {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sincronizar com ML
            </Button>

            {lastSync && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Última sinc: {new Date(lastSync).toLocaleString("pt-BR")}
              </span>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Filtrar por data</span>
              <Input type="date" className="w-auto" />
            </div>

            <Select defaultValue="todas-lojas">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas-lojas">Todos Lojas</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="todos-canais">
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos-canais">Todos Canais de Venda</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6 px-6">
            <button
              onClick={() => setActiveTab("active")}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "active"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Ativos <span className="ml-1">{activeCount}</span>
            </button>
            <button
              onClick={() => setActiveTab("paused")}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "paused"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              Pausados <span className="ml-1">{pausedCount}</span>
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Selecionado {selectedItems.length}
              </span>
              <Button variant="outline" size="sm">
                Editar em Massa
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Ações em Massa
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Pausar selecionados</DropdownMenuItem>
                  <DropdownMenuItem>Deletar selecionados</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Gerar Produtos do Armazém
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Opção 1</DropdownMenuItem>
                  <DropdownMenuItem>Opção 2</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={syncListings} disabled={syncing || loading}>
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sincronizar
              </Button>

              <Button variant="outline" size="sm">
                Importar & Exportar
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>

              <Select defaultValue="ordem">
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordem">Ordem</SelectItem>
                  <SelectItem value="titulo">Título</SelectItem>
                  <SelectItem value="preco">Preço</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Total {filteredListings.length}</span>
                <span>1/1</span>
              </div>

              <Select defaultValue="300">
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100/pág</SelectItem>
                  <SelectItem value="300">300/pág</SelectItem>
                  <SelectItem value="500">500/pág</SelectItem>
                </SelectContent>
              </Select>

              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Criar Anúncio
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading && listings.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando anúncios...</span>
            </div>
          ) : syncing ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Sincronizando anúncios do Mercado Livre...
                </p>
              </div>
            </div>
          ) : null}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
              <p className="text-sm text-red-800 dark:text-red-200">⚠️ {error}</p>
            </div>
          )}

          {!loading && !syncing && filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm
                  ? "Nenhum anúncio encontrado com esse filtro"
                  : activeTab === "paused"
                  ? "Nenhum anúncio pausado encontrado"
                  : listings.length === 0
                  ? "Nenhum anúncio sincronizado. Clique em 'Sincronizar' para carregar seus anúncios do Mercado Livre."
                  : "Nenhum anúncio ativo encontrado"}
              </p>
              {listings.length === 0 && (
                <Button onClick={syncListings} disabled={syncing}>
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sincronizar Agora
                </Button>
              )}
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <Checkbox />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      SKU/ID do Anúncio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Promoção
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Tipo de Anúncio/Logísticas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Desempenho
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Atualizado/Publicado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredListings.map((listing) => {
                    const pct = getDiscountPercent(listing.price, listing.originalPrice);

                    return (
                      <tr key={listing.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <Checkbox />
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <img
                              src={listing.thumbnail}
                              alt={listing.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                            <div>
                              <div className="font-medium text-sm text-gray-900 dark:text-white">
                                {listing.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {listing.categoryName || "Sem categoria"}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-300 font-medium mt-0.5">
                                {listing.storeName}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {listing.sku ? (
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {listing.sku}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 dark:text-gray-500 mb-1">-</div>
                          )}

                          <a
                            href={listing.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {listing.id}
                          </a>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-xs">
                                ML
                              </Badge>
                              <span
                                className={`text-sm font-medium ${
                                  pct ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"
                                }`}
                              >
                                R$ {listing.price.toFixed(2)}
                              </span>
                            </div>

                            {pct && listing.originalPrice ? (
                              <span className="text-xs text-gray-400 line-through">
                                R$ {listing.originalPrice.toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {pct ? (
                            <div className="flex flex-col gap-0.5">
                              <Badge variant="destructive" className="text-xs w-fit">
                                {pct}% OFF
                              </Badge>
                              {listing.originalPrice ? (
                                <span className="text-xs text-gray-400">
                                  De R$ {listing.originalPrice.toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {listing.availableQuantity}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge className={`text-xs w-fit ${getListingTypeBadgeColor(listing.listingType)}`}>
                              {getListingTypeName(listing.listingType)}
                            </Badge>

                            {listing.logisticType && (
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {getLogisticTypeName(listing.logisticType)}
                              </span>
                            )}

                            <span
                              className={`text-xs ${
                                listing.freeShipping
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {listing.freeShipping ? "Frete Grátis" : "Sem Frete Grátis"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs space-y-1">
                            <div className="text-gray-700 dark:text-gray-300">
                              Vendas: <span className="font-medium">{listing.soldQuantity}</span>
                            </div>
                            <div className="text-gray-700 dark:text-gray-300">
                              Saúde: <span className="font-medium">{listing.health}%</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-900 dark:text-white">
                            {listing.updatedAt ? new Date(listing.updatedAt).toLocaleDateString("pt-BR") : "-"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("pt-BR") : "-"}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/produtos/anuncios/mercadolivre/${listing.id}/editar`)}
                              >
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>Pausar</DropdownMenuItem>
                              <DropdownMenuItem>Duplicar</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">Deletar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
