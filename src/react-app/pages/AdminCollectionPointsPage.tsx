import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Plus,
  Pencil,
  Loader2,
  CheckCircle,
  XCircle,
  Store,
  Package,
  Undo2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Upload,
  Camera,
} from "lucide-react";

interface CollectionPoint {
  id: number;
  name: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string | null;
  city: string | null;
  state: string | null;
  photo_url: string | null;
  accepts_returns: number;
  accepts_orders: number;
  is_active: number;
  whatsapp_number: string | null;
  owner_email: string | null;
  created_at: string;
}

interface Marketplace {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface PointMarketplace {
  collection_point_id: number;
  marketplace_id: number;
}

type SearchType = "cep" | "name" | "phone";

export default function AdminCollectionPointsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [pointMarketplaces, setPointMarketplaces] = useState<PointMarketplace[]>([]);

  // Search and filters
  const [searchType, setSearchType] = useState<SearchType>("name");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMarketplaceIds, setSelectedMarketplaceIds] = useState<number[]>([]);
  const [filterNoEmail, setFilterNoEmail] = useState(false);
  const [filterNoPhone, setFilterNoPhone] = useState(false);
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [filterNoPhoto, setFilterNoPhoto] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [markingClosed, setMarkingClosed] = useState(false);

  // Photo upload
  const [uploadingPhotoForId, setUploadingPhotoForId] = useState<number | null>(null);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [pointsRes, marketplacesRes, relationsRes] = await Promise.all([
        fetch("/api/admin/collection-points", { headers }),
        fetch("/api/admin/marketplaces", { headers }),
        fetch("/api/admin/collection-point-marketplaces", { headers }),
      ]);

      if (pointsRes.ok) {
        const data = await pointsRes.json();
        setPoints(data.points || []);
      }

      if (marketplacesRes.ok) {
        const data = await marketplacesRes.json();
        setMarketplaces(data.marketplaces || []);
      }

      if (relationsRes.ok) {
        const data = await relationsRes.json();
        setPointMarketplaces(data.relations || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPointMarketplaces = (pointId: number) => {
    const marketplaceIds = pointMarketplaces
      .filter((pm) => pm.collection_point_id === pointId)
      .map((pm) => pm.marketplace_id);
    return marketplaces.filter((m) => marketplaceIds.includes(m.id));
  };

  const formatCEP = (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length === 8) {
      return `${clean.slice(0, 2)}.${clean.slice(2, 5)}-${clean.slice(5)}`;
    }
    return cep;
  };

  // Normalize text: remove accents and lowercase
  const normalizeText = (text: string): string => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // Check if point has incomplete data
  const isIncomplete = (point: CollectionPoint): boolean => {
    // Required fields
    if (!point.name?.trim()) return true;
    if (!point.cep?.trim()) return true;
    if (!point.street?.trim()) return true;
    if (!point.number?.trim()) return true;
    if (!point.neighborhood?.trim()) return true;

    // Check if has at least one operation type
    if (point.accepts_returns !== 1 && point.accepts_orders !== 1) return true;

    // Check if has at least one marketplace
    const pointMkts = getPointMarketplaces(point.id);
    if (pointMkts.length === 0) return true;

    return false;
  };

  // Filter points based on all criteria
  const filteredPoints = useMemo(() => {
    let result = [...points];

    // Search filter
    if (searchTerm.trim()) {
      if (searchType === "cep") {
        // CEP search: remove non-digits and search by "contains"
        const searchClean = searchTerm.replace(/\D/g, "");
        result = result.filter((point) => {
          const pointCepClean = point.cep.replace(/\D/g, "");
          return pointCepClean.includes(searchClean);
        });
      } else if (searchType === "phone") {
        // Phone search: remove non-digits and search by "contains"
        const searchClean = searchTerm.replace(/\D/g, "");
        result = result.filter((point) => {
          if (!point.whatsapp_number) return false;
          const pointPhoneClean = point.whatsapp_number.replace(/\D/g, "");
          return pointPhoneClean.includes(searchClean);
        });
      } else {
        // Name search: advanced token-based search
        const normalized = normalizeText(searchTerm);
        // Split by % or spaces to get tokens
        const tokens = normalized
          .split(/[%\s]+/)
          .filter((t) => t.length > 0);

        result = result.filter((point) => {
          const normalizedName = normalizeText(point.name);
          
          // All tokens must be found in order
          let searchIndex = 0;
          for (const token of tokens) {
            const foundIndex = normalizedName.indexOf(token, searchIndex);
            if (foundIndex === -1) return false;
            searchIndex = foundIndex + token.length;
          }
          return true;
        });
      }
    }

    // Marketplace filter
    if (selectedMarketplaceIds.length > 0) {
      result = result.filter((point) => {
        const pointMktIds = pointMarketplaces
          .filter((pm) => pm.collection_point_id === point.id)
          .map((pm) => pm.marketplace_id);
        
        // Point must have at least one of the selected marketplaces
        return selectedMarketplaceIds.some((id) => pointMktIds.includes(id));
      });
    }

    // No email filter
    if (filterNoEmail) {
      result = result.filter((point) => !point.owner_email || point.owner_email.trim() === "");
    }

    // No phone filter
    if (filterNoPhone) {
      result = result.filter((point) => !point.whatsapp_number || point.whatsapp_number.trim() === "");
    }

    // Incomplete data filter
    if (filterIncomplete) {
      result = result.filter((point) => isIncomplete(point));
    }

    // No photo filter
    if (filterNoPhoto) {
      result = result.filter((point) => !point.photo_url || point.photo_url.trim() === "");
    }

    return result;
  }, [
    points,
    searchType,
    searchTerm,
    selectedMarketplaceIds,
    filterNoEmail,
    filterNoPhone,
    filterIncomplete,
    filterNoPhoto,
    pointMarketplaces,
  ]);

  const toggleMarketplaceFilter = (marketplaceId: number) => {
    setSelectedMarketplaceIds((prev) =>
      prev.includes(marketplaceId)
        ? prev.filter((id) => id !== marketplaceId)
        : [...prev, marketplaceId]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedMarketplaceIds([]);
    setFilterNoEmail(false);
    setFilterNoPhone(false);
    setFilterIncomplete(false);
    setFilterNoPhoto(false);
  };

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedMarketplaceIds.length > 0 ||
    filterNoEmail ||
    filterNoPhone ||
    filterIncomplete ||
    filterNoPhoto;

  const handlePhotoClick = (pointId: number) => {
    fileInputRefs.current[pointId]?.click();
  };

  const handlePhotoChange = async (pointId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingPhotoForId(pointId);

    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'collection_point');
      formData.append('pointId', pointId.toString());

      const uploadRes = await fetch('/api/admin/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Falha ao enviar imagem');
      }

      const { url } = await uploadRes.json();

      // Update the point with the new photo URL
      const updateHeaders: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        updateHeaders.Authorization = `Bearer ${token}`;
      }

      const updateRes = await fetch(`/api/admin/collection-points/${pointId}`, {
        method: 'PUT',
        headers: updateHeaders,
        body: JSON.stringify({ photo_url: url }),
      });

      if (!updateRes.ok) {
        throw new Error('Falha ao atualizar foto');
      }

      // Update local state
      setPoints(points.map(p => 
        p.id === pointId ? { ...p, photo_url: url } : p
      ));

      // Reset the file input
      if (fileInputRefs.current[pointId]) {
        fileInputRefs.current[pointId]!.value = '';
      }
    } catch (error: any) {
      console.error('Failed to upload photo:', error);
      alert('Erro ao atualizar foto: ' + error.message);
    } finally {
      setUploadingPhotoForId(null);
    }
  };

  const handleMarkZeroHoursAsClosed = async () => {
    if (!confirm("Deseja marcar como fechados todos os horários que estão abertos mas com 0:00 de abertura e fechamento?")) {
      return;
    }

    setMarkingClosed(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/collection-points/mark-zero-hours-closed", {
        method: "POST",
        headers,
      });

      if (!response.ok) {
        throw new Error("Falha ao marcar horários como fechados");
      }

      const data = await response.json();
      alert(`${data.updated} horário(s) marcado(s) como fechado(s)`);
      
      // Reload data to reflect changes
      await fetchData();
    } catch (error: any) {
      console.error("Failed to mark zero hours as closed:", error);
      alert("Erro ao marcar horários como fechados: " + error.message);
    } finally {
      setMarkingClosed(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/admin")}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Pontos de Coleta</h1>
                  <p className="text-xs text-gray-500">
                    Mostrando {filteredPoints.length} de {points.length} pontos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleMarkZeroHoursAsClosed}
                disabled={markingClosed}
                className="flex items-center gap-2 px-4 py-2 border-2 border-orange-500 text-orange-600 rounded-xl hover:bg-orange-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Marcar como fechado todos os horários com 0:00"
              >
                {markingClosed ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                Fechar 0:00
              </button>
              <button
                onClick={() => navigate("/admin/collection-points/bulk-import")}
                className="flex items-center gap-2 px-4 py-2 border-2 border-emerald-500 text-emerald-600 rounded-xl hover:bg-emerald-50 transition"
              >
                <Upload className="w-5 h-5" />
                Importar em Massa
              </button>
              <button
                onClick={() => navigate("/admin/collection-points/new")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition shadow-lg shadow-emerald-500/25"
              >
                <Plus className="w-5 h-5" />
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6 mb-6">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search Type Selector */}
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value as SearchType);
                setSearchTerm("");
              }}
              className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition lg:w-40"
            >
              <option value="name">Nome</option>
              <option value="cep">CEP</option>
              <option value="phone">Telefone</option>
            </select>

            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  searchType === "cep"
                    ? "Digite o CEP (ex: 74.360-050 ou 74360)"
                    : searchType === "phone"
                    ? "Digite o telefone (ex: 62 99999-9999 ou 62999999999)"
                    : "Digite o nome (ex: moto cin para 'Moto Cintra')"
                }
                className="w-full pl-12 pr-10 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2 whitespace-nowrap"
              >
                <X className="w-4 h-4" />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Marketplace Filter */}
          {marketplaces.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por Marketplace
              </label>
              <div className="flex flex-wrap gap-2">
                {marketplaces.map((marketplace) => {
                  const isSelected = selectedMarketplaceIds.includes(marketplace.id);
                  return (
                    <button
                      key={marketplace.id}
                      onClick={() => toggleMarketplaceFilter(marketplace.id)}
                      title={marketplace.name}
                      className={`relative p-2 border-2 rounded-xl transition ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                        {marketplace.logo_url ? (
                          <img
                            src={marketplace.logo_url}
                            alt={marketplace.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Store className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <Filter className="w-4 h-4" />
            Filtros avançados
            {showAdvancedFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {(filterNoEmail || filterNoPhone || filterIncomplete || filterNoPhoto) && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            )}
          </button>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filterNoEmail}
                  onChange={(e) => setFilterNoEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Sem e-mail cadastrado</p>
                  <p className="text-xs text-gray-500">
                    Pontos sem e-mail do proprietário
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filterNoPhone}
                  onChange={(e) => setFilterNoPhone(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Sem telefone cadastrado</p>
                  <p className="text-xs text-gray-500">
                    Pontos sem WhatsApp configurado
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filterIncomplete}
                  onChange={(e) => setFilterIncomplete(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Dados incompletos</p>
                  <p className="text-xs text-gray-500">
                    Pontos com campos obrigatórios faltando (nome, endereço, operações, marketplaces)
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filterNoPhoto}
                  onChange={(e) => setFilterNoPhoto(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">Sem foto</p>
                  <p className="text-xs text-gray-500">
                    Pontos sem foto cadastrada
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Results */}
        {points.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum ponto de coleta cadastrado
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Adicione seu primeiro ponto de coleta para começar
            </p>
            <button
              onClick={() => navigate("/admin/collection-points/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
            >
              <Plus className="w-5 h-5" />
              Adicionar Ponto de Coleta
            </button>
          </div>
        ) : filteredPoints.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum ponto encontrado
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Nenhum ponto de coleta corresponde aos filtros selecionados
            </p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-emerald-600 border border-emerald-600 rounded-xl hover:bg-emerald-50 transition"
            >
              <X className="w-5 h-5" />
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ponto de Coleta
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Operações
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Marketplaces
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPoints.map((point) => {
                    const pointMkts = getPointMarketplaces(point.id);
                    const incomplete = isIncomplete(point);
                    return (
                      <tr key={point.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative group">
                              <button
                                onClick={() => handlePhotoClick(point.id)}
                                disabled={uploadingPhotoForId === point.id}
                                className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative hover:ring-2 hover:ring-emerald-500 transition cursor-pointer disabled:cursor-wait"
                                title="Clique para alterar a foto"
                              >
                                {uploadingPhotoForId === point.id ? (
                                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                                ) : point.photo_url ? (
                                  <img
                                    src={point.photo_url}
                                    alt={point.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <MapPin className="w-6 h-6 text-gray-400" />
                                )}
                                {/* Hover overlay */}
                                {uploadingPhotoForId !== point.id && (
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <Camera className="w-5 h-5 text-white" />
                                  </div>
                                )}
                              </button>
                              {/* Hidden file input */}
                              <input
                                ref={(el) => { fileInputRefs.current[point.id] = el; }}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoChange(point.id, e)}
                                className="hidden"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{point.name}</p>
                                {incomplete && (
                                  <span
                                    className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"
                                    title="Dados incompletos"
                                  >
                                    Incompleto
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {point.street}, {point.number} - {point.neighborhood}
                              </p>
                              <p className="text-xs text-gray-400">CEP: {formatCEP(point.cep)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {point.accepts_returns === 1 && (
                              <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg w-fit">
                                <Undo2 className="w-3 h-3" />
                                Devolução
                              </span>
                            )}
                            {point.accepts_orders === 1 && (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
                                <Package className="w-3 h-3" />
                                Pedidos
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {pointMkts.length > 0 ? (
                              pointMkts.slice(0, 4).map((m) => (
                                <div
                                  key={m.id}
                                  className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden"
                                  title={m.name}
                                >
                                  {m.logo_url ? (
                                    <img
                                      src={m.logo_url}
                                      alt={m.name}
                                      className="w-full h-full object-contain p-1"
                                    />
                                  ) : (
                                    <Store className="w-4 h-4 text-gray-400" />
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">Nenhum</span>
                            )}
                            {pointMkts.length > 4 && (
                              <div className="relative group">
                                <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-medium text-gray-600 cursor-help">
                                  +{pointMkts.length - 4}
                                </div>
                                {/* Tooltip */}
                                <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 w-64">
                                  <div className="bg-gray-900 text-white rounded-lg p-3 shadow-xl">
                                    <p className="text-xs font-semibold mb-2 text-gray-300">
                                      Outros Marketplaces:
                                    </p>
                                    <div className="space-y-2">
                                      {pointMkts.slice(4).map((m) => (
                                        <div
                                          key={m.id}
                                          className="flex items-center gap-2"
                                        >
                                          <div className="w-6 h-6 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {m.logo_url ? (
                                              <img
                                                src={m.logo_url}
                                                alt={m.name}
                                                className="w-full h-full object-contain p-0.5"
                                              />
                                            ) : (
                                              <Store className="w-3 h-3 text-gray-400" />
                                            )}
                                          </div>
                                          <span className="text-xs text-white">
                                            {m.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {point.is_active === 1 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-3 py-1.5 rounded-full">
                              <XCircle className="w-3.5 h-3.5" />
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => navigate(`/admin/collection-points/${point.id}`)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
