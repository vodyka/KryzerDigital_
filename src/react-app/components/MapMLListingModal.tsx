import { useEffect, useMemo, useState } from "react";
import { useNotification } from "@/react-app/contexts/NotificationContext";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { apiRequest } from "@/react-app/lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Badge } from "@/react-app/components/ui/badge";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/react-app/lib/utils";
import { MultiSelectStore } from "@/react-app/components/ui/multi-select-store";

interface MLListing {
  id: number;
  listing_id: string;
  title: string;
  thumbnail?: string;
  sku?: string;
  store_name: string;
  status: string;
  available_quantity: number;
  price: number;
  variations?: any[];
  integration_id?: string;

  // ✅ campos para filtro de mapeamento
  mapped?: boolean; // se sua API mandar
  user_product_id?: string; // se sua API mandar
}

interface Integration {
  id: string;
  store_name: string;
  marketplace: string;
  nickname?: string;
  // ✅ ajuste se seu backend usar outro campo:
  is_active?: boolean; // <- TROQUE se necessário
  status?: string; // opcional: "active"
  active?: boolean; // opcional
}

interface MapMLListingModalProps {
  productSku: string;
  onClose: () => void;
  onMapped: () => void;
}

type Platform = "mercadolivre";
type MapFilter = "all" | "mapped" | "not_mapped";
type SearchField =
  | "sku"
  | "title"
  | "listing_id"
  | "variation_id"
  | "user_product_id";

function isIntegrationActive(int: Integration) {
  // ✅ ajuste aqui se seu backend for diferente
  if (typeof int.is_active === "boolean") return int.is_active;
  if (typeof int.active === "boolean") return int.active;
  if (typeof int.status === "string") return int.status === "active";
  return true; // fallback
}

export default function MapMLListingModal({
  productSku,
  onClose,
  onMapped,
}: MapMLListingModalProps) {
  const notification = useNotification();
  const { selectedCompany } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [listings, setListings] = useState<MLListing[]>([]);

  // filtros topo
  const [platform, setPlatform] = useState<Platform>("mercadolivre");
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);

  const [mapFilter, setMapFilter] = useState<MapFilter>("all");
  const [searchField, setSearchField] = useState<SearchField>("sku");
  const [searchTerm, setSearchTerm] = useState("");

  // seleção múltipla
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // paginação
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  useEffect(() => {
    if (selectedCompany?.id) fetchIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id]);

  useEffect(() => {
    if (selectedIntegrations.length > 0 && selectedCompany?.id) fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIntegrations, selectedCompany?.id]);

  useEffect(() => {
    setPage(1);
    setSelectedItems(new Set());
  }, [platform, selectedIntegrations, mapFilter, searchField, pageSize]);

  const fetchIntegrations = async () => {
    try {
      if (!selectedCompany?.id) {
        notification.showNotification("Nenhuma empresa selecionada", "error");
        return;
      }

      const data = await apiRequest(
        `/api/integrations/mercadolivre/list?companyId=${selectedCompany.id}`
      );

      const ints: Integration[] = data.integrations || [];
      const activeInts = ints.filter(isIntegrationActive);

      setIntegrations(activeInts);
      // Selecionar todas as lojas por padrão
      setSelectedIntegrations(activeInts.map(int => int.id));
    } catch {
      notification.showNotification("Erro ao carregar integrações", "error");
    }
  };

  const fetchListings = async () => {
    if (!selectedCompany?.id) {
      notification.showNotification("Nenhuma empresa selecionada", "error");
      return;
    }
    if (selectedIntegrations.length === 0) return;

    setLoading(true);
    try {
      // Buscar listings de todas as integrações selecionadas
      const allListingsPromises = selectedIntegrations.map(integrationId =>
        apiRequest(
          `/api/integrations/mercadolivre/listings?companyId=${selectedCompany.id}&integration_id=${integrationId}`
        )
      );

      const allListingsData = await Promise.all(allListingsPromises);
      const baseListings: MLListing[] = allListingsData.flatMap(data => data.listings || []);

      const listingsWithVariations = await Promise.all(
        baseListings.map(async (listing: MLListing) => {
          try {
            const varData = await apiRequest(
              `/api/mercadolivre/items/${listing.listing_id}`
            );
            return { ...listing, variations: varData.variations || [] };
          } catch (error) {
            console.error(`Error fetching variations for ${listing.listing_id}:`, error);
            return { ...listing, variations: [] };
          }
        })
      );

      setListings(listingsWithVariations);
    } catch (error: any) {
      console.error("[MapMLListingModal] Erro ao carregar anúncios:", error);
      notification.showNotification("Erro ao carregar anúncios", "error");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  const totalAll = useMemo(() => listings.length, [listings]);

  const filteredListings = useMemo(() => {
    let filtered = [...listings];

    // filtro mapeado / não mapeado
    if (mapFilter !== "all") {
      filtered = filtered.filter((l) =>
        mapFilter === "mapped" ? !!l.mapped : !l.mapped
      );
    }

    // busca
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((l) => {
        const title = (l.title || "").toLowerCase();
        const sku = (l.sku || "").toLowerCase();
        const listingId = (l.listing_id || "").toLowerCase();
        const userPid = (l.user_product_id || "").toLowerCase();

        // variações: procurar id/sku/custom_field nelas também
        const variations = l.variations || [];
        const variationMatch = variations.some((v: any) => {
          const vid = String(v?.id ?? "").toLowerCase();
          const vsku = String(v?.seller_custom_field ?? "").toLowerCase();
          const vsku2 = String(v?.sku ?? "").toLowerCase();
          return (
            (searchField === "variation_id" && vid.includes(term)) ||
            (searchField === "sku" && (vsku.includes(term) || vsku2.includes(term))) ||
            (searchField === "title" && String(v?.attribute_combinations?.map((a: any) => a.value_name).join(" - ") ?? "").toLowerCase().includes(term))
          );
        });

        if (searchField === "sku") return sku.includes(term) || variationMatch;
        if (searchField === "title") return title.includes(term) || variationMatch;
        if (searchField === "listing_id") return listingId.includes(term);
        if (searchField === "variation_id") return variationMatch;
        if (searchField === "user_product_id") return userPid.includes(term);

        return (
          title.includes(term) ||
          sku.includes(term) ||
          listingId.includes(term) ||
          userPid.includes(term) ||
          variationMatch
        );
      });
    }

    return filtered;
  }, [listings, mapFilter, searchTerm, searchField]);

  const total = filteredListings.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, safePage, pageSize]);

  const selectedCount = selectedItems.size;

  const toggleSelection = (key: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedItems(newSet);
  };

  const isSelected = (key: string) => selectedItems.has(key);

  const toggleSelectAll = () => {
    // Calcular o total de itens selecionáveis na página (produtos + variações)
    let totalSelectableItems = 0;
    pageItems.forEach((listing) => {
      const hasVariations = (listing.variations?.length ?? 0) > 0;
      if (hasVariations) {
        totalSelectableItems += listing.variations?.length ?? 0;
      } else {
        totalSelectableItems += 1;
      }
    });

    if (selectedItems.size === totalSelectableItems) {
      // Desselecionar todos
      setSelectedItems(new Set());
    } else {
      // Selecionar todos da página
      const allKeys = new Set<string>();
      pageItems.forEach((listing) => {
        const hasVariations = (listing.variations?.length ?? 0) > 0;
        if (hasVariations) {
          listing.variations?.forEach((variation: any) => {
            allKeys.add(`${listing.listing_id}::${String(variation.id)}`);
          });
        } else {
          allKeys.add(`${listing.listing_id}::`);
        }
      });
      setSelectedItems(allKeys);
    }
  };

  const allPageItemsSelected = pageItems.length > 0 && (() => {
    let totalItems = 0;
    pageItems.forEach((listing) => {
      const hasVariations = (listing.variations?.length ?? 0) > 0;
      if (hasVariations) {
        totalItems += listing.variations?.length ?? 0;
      } else {
        totalItems += 1;
      }
    });
    return selectedItems.size === totalItems;
  })();

  const handleMap = async () => {
    if (selectedItems.size === 0) {
      notification.showNotification("Selecione pelo menos um anúncio ou variação", "error");
      return;
    }

    setSaving(true);
    try {
      // Mapear cada item selecionado
      const promises = Array.from(selectedItems).map((key) => {
        const [listingId, variationId] = key.split("::");
        // Encontrar a integration_id correta para este listing
        const listing = listings.find(l => l.listing_id === listingId);
        const integrationId = listing?.integration_id || selectedIntegrations[0];
        
        return apiRequest("/api/product-ml-mapping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_sku: productSku,
            ml_listing_id: listingId,
            ml_variation_id: variationId || null,
            integration_id: integrationId,
          }),
        });
      });

      await Promise.all(promises);

      notification.showNotification(
        `${selectedItems.size} item(ns) mapeado(s) com sucesso`,
        "success"
      );
      onMapped();
    } catch (error: any) {
      notification.showNotification(error.message || "Erro ao mapear anúncio", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      {/* ✅ quadrado + borda leve + tamanho print */}
      <DialogContent showCloseButton={false} className="p-0 !w-[980px] !max-w-[980px] !h-[534px] !max-h-[534px] overflow-hidden flex flex-col rounded-[6px] border border-border shadow-lg">
        {/* Header */}
        <div className="px-6 pt-4 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <DialogHeader className="space-y-1">
              <DialogTitle>Mapear SKU do Anúncio</DialogTitle>
              <DialogDescription>
                Selecione um anúncio (ou variação) para vincular ao SKU{" "}
                <span className="font-medium">{productSku}</span>.
              </DialogDescription>
            </DialogHeader>

            <button
              onClick={onClose}
              className="rounded-md p-2 hover:bg-muted/50 transition"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filtros em linha horizontal - dimensões exatas */}
          <div className="mt-4 flex items-center gap-0">
            {/* 1) Plataforma - 120x36 */}
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger className="h-[36px] w-[120px] rounded-md border-input">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                {/* Outras plataformas aparecerão aqui quando houver integrações */}
              </SelectContent>
            </Select>

            <div className="w-2" />

            {/* 2) Loja - 150x36 - Multi-select */}
            <MultiSelectStore
              options={integrations.map(int => ({
                id: int.id,
                label: int.nickname || int.store_name
              }))}
              value={selectedIntegrations}
              onChange={(newValue) => {
                setSelectedIntegrations(newValue);
                setSelectedItems(new Set());
              }}
              placeholder="Todas Lojas"
              className="w-[150px]"
            />

            <div className="w-2" />

            {/* 3) Status de Mapeamento - 150x36 */}
            <Select value={mapFilter} onValueChange={(v) => setMapFilter(v as MapFilter)}>
              <SelectTrigger className="h-[36px] w-[150px] rounded-md border-input">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="not_mapped">Não Mapeado</SelectItem>
                <SelectItem value="mapped">Mapeado</SelectItem>
              </SelectContent>
            </Select>

            {/* 4) Campo de Busca - tipo de busca - 160x36 */}
            <Select
              value={searchField}
              onValueChange={(v) => setSearchField(v as SearchField)}
            >
              <SelectTrigger className="h-[36px] w-[160px] rounded-md border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sku">SKU</SelectItem>
                <SelectItem value="title">Nome do Anúncio</SelectItem>
                <SelectItem value="listing_id">ID do Anúncio</SelectItem>
                <SelectItem value="variation_id">ID da Variante</SelectItem>
                <SelectItem value="user_product_id">User Product ID</SelectItem>
              </SelectContent>
            </Select>

            {/* Campo de texto com ícone de lupa - 241x36 */}
            <div className="relative w-[241px]">
              <Input
                className="h-[36px] w-full pr-9 rounded-md border-input"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Linha: Selecionado / Total / Paginação */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                Selecionado{" "}
                <span className="font-medium text-foreground">{selectedCount}</span>
              </span>
              {mapFilter !== "all" && (
                <Badge variant="secondary" className="text-[10px]">
                  filtro ativo
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div>
                Total{" "}
                <span className="font-medium text-foreground">{total}</span>
                <span className="text-muted-foreground"> (geral {totalAll})</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="h-8 w-8 rounded-md hover:bg-muted/50 disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4 mx-auto" />
                </button>

                <span className="w-[56px] text-center">
                  {safePage}/{totalPages}
                </span>

                <button
                  className="h-8 w-8 rounded-md hover:bg-muted/50 disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Próxima"
                >
                  <ChevronRight className="h-4 w-4 mx-auto" />
                </button>
              </div>

              <div className="w-[120px]">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-8 rounded-[6px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25/pág...</SelectItem>
                    <SelectItem value="50">50/pág...</SelectItem>
                    <SelectItem value="100">100/pág...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="px-6 py-3 flex-1 min-h-0">
          <div className="border rounded-[6px] overflow-hidden h-full flex flex-col">
            <div className="bg-muted/30 border-b">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium">
                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allPageItemsSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded-none border-gray-300 cursor-pointer"
                  />
                </div>
                <div className="col-span-4">Produtos</div>
                <div className="col-span-3">ID do Anúncio / ID da Variante</div>
                <div className="col-span-2">Variante</div>
                <div className="col-span-2">Nome da Loja</div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : pageItems.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground">
                  Nenhum anúncio encontrado
                </div>
              ) : (
                pageItems.map((listing) => {
                  const hasVariations = (listing.variations?.length ?? 0) > 0;
                  const listingKey = `${listing.listing_id}::`;
                  const storeNickname = integrations.find(i => i.id === listing.integration_id)?.nickname || listing.store_name;

                  return (
                    <div key={listing.listing_id}>
                      {/* anúncio */}
                      <div
                        className={cn(
                          "grid grid-cols-12 gap-2 px-4 py-3 border-b hover:bg-muted/40",
                          isSelected(listingKey) ? "bg-primary/10" : ""
                        )}
                      >
                        <div className="col-span-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected(listingKey)}
                            onChange={() => toggleSelection(listingKey)}
                            className="h-4 w-4 rounded-none border-gray-300 cursor-pointer"
                          />
                        </div>

                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded bg-muted/40 overflow-hidden border shrink-0">
                            {listing.thumbnail ? (
                              <img
                                src={listing.thumbnail}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {listing.mapped ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border border-green-200 text-[10px]">
                                  Mapeado
                                </Badge>
                              ) : null}

                              {listing.user_product_id ? (
                                <Badge variant="outline" className="text-[10px]">
                                  UPID {listing.user_product_id}
                                </Badge>
                              ) : null}
                            </div>

                            <div className="text-sm truncate">{listing.title}</div>

                            {listing.sku ? (
                              <Badge variant="outline" className="text-xs mt-1">
                                {listing.sku}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="col-span-3 flex flex-col justify-center text-sm font-mono">
                          <div>{listing.listing_id}</div>
                        </div>

                        <div className="col-span-2 flex items-center text-sm">
                          -
                        </div>

                        <div className="col-span-2 flex items-center text-sm">
                          {storeNickname}
                        </div>
                      </div>

                      {/* variações */}
                      {hasVariations &&
                        listing.variations?.map((variation: any) => {
                          const variationId = String(variation.id);
                          const variationKey = `${listing.listing_id}::${variationId}`;
                          const variationLabel =
                            variation.attribute_combinations
                              ?.map((a: any) => a.value_name)
                              .filter(Boolean)
                              .join(" - ") || "-";

                          const nickname =
                            variation.seller_custom_field ||
                            variation.sku ||
                            "";

                          return (
                            <div
                              key={variationId}
                              className={cn(
                                "grid grid-cols-12 gap-2 px-4 py-3 pl-12 border-b hover:bg-muted/40",
                                isSelected(variationKey) ? "bg-primary/10" : ""
                              )}
                            >
                              <div className="col-span-1 flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected(variationKey)}
                                  onChange={() => toggleSelection(variationKey)}
                                  className="h-4 w-4 rounded-none border-gray-300 cursor-pointer"
                                />
                              </div>

                              <div className="col-span-4 flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded bg-muted/40 overflow-hidden border shrink-0">
                                  {variation.picture_ids?.[0] ? (
                                    <img
                                      src={`https://http2.mlstatic.com/D_NQ_NP_${variation.picture_ids[0]}-O.jpg`}
                                      alt={variationLabel}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : null}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-sm truncate">{variationLabel}</div>
                                  {nickname ? (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {nickname}
                                    </Badge>
                                  ) : null}
                                </div>
                              </div>

                              <div className="col-span-3 flex flex-col justify-center text-sm font-mono">
                                <div>{listing.listing_id}</div>
                                <div className="text-xs text-muted-foreground">{variationId}</div>
                              </div>

                              <div className="col-span-2 flex items-center text-sm">
                                {variationLabel}
                              </div>

                              <div className="col-span-2 flex items-center text-sm">
                                {storeNickname}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer botões */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>

          <Button onClick={handleMap} disabled={selectedItems.size === 0 || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Mapeando...
              </>
            ) : (
              `Mapear (${selectedCount})`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
