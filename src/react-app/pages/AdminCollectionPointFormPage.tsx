import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Save,
  Loader2,
  Upload,
  X,
  Package,
  Undo2,
  AlertCircle,
  Store,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";

interface CollectionPointForm {
  name: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
  photo_url: string | null;
  accepts_returns: boolean;
  accepts_orders: boolean;
  is_active: boolean;
  accepts_uber_delivery: boolean;
  sells_shipping_supplies: boolean;
  provides_resale_merchandise: boolean;
  accepts_after_hours: boolean;
  whatsapp_number: string;
  owner_email: string;
}

interface Marketplace {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: number;
}

interface DaySchedule {
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  is_closed: boolean;
}

interface MarketplaceSchedule {
  marketplace_id: number;
  use_custom_schedule: boolean;
  accepts_after_hours: boolean;
  schedules: DaySchedule[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const initialForm: CollectionPointForm = {
  name: "",
  cep: "",
  street: "",
  number: "",
  neighborhood: "",
  complement: "",
  city: "",
  state: "",
  photo_url: null,
  accepts_returns: false,
  accepts_orders: false,
  is_active: true,
  accepts_uber_delivery: false,
  sells_shipping_supplies: false,
  provides_resale_merchandise: false,
  accepts_after_hours: false,
  whatsapp_number: "",
  owner_email: "",
};

const createDefaultSchedules = (): DaySchedule[] =>
  DAYS_OF_WEEK.map((day) => ({
    day_of_week: day.value,
    opening_time: day.value === 0 || day.value === 6 ? "" : "08:00",
    closing_time: day.value === 0 || day.value === 6 ? "" : "18:00",
    is_closed: day.value === 0,
  }));

export default function AdminCollectionPointFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = id && id !== "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<CollectionPointForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<number[]>([]);
  const [schedules, setSchedules] = useState<DaySchedule[]>(createDefaultSchedules());
  const [marketplaceSchedules, setMarketplaceSchedules] = useState<MarketplaceSchedule[]>([]);
  const [expandedMarketplace, setExpandedMarketplace] = useState<number | null>(null);
  const [duplicateCepWarning, setDuplicateCepWarning] = useState<{
    show: boolean;
    existingPoint: { id: number; name: string } | null;
  }>({ show: false, existingPoint: null });
  const [bypassCepCheck, setBypassCepCheck] = useState(false);
  const [checkingCep, setCheckingCep] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cepCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  // Real-time CEP duplicate check
  useEffect(() => {
    // Clear previous timeout
    if (cepCheckTimeoutRef.current) {
      clearTimeout(cepCheckTimeoutRef.current);
    }

    // Reset warning if CEP is incomplete or empty
    const cleanCEP = form.cep.replace(/\D/g, "");
    if (cleanCEP.length !== 8) {
      setDuplicateCepWarning({ show: false, existingPoint: null });
      setBypassCepCheck(false);
      return;
    }

    // Don't check if we're bypassing (user already confirmed duplicate)
    if (bypassCepCheck) {
      return;
    }

    // Debounce the check by 500ms
    cepCheckTimeoutRef.current = setTimeout(async () => {
      setCheckingCep(true);
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(
          `/api/admin/collection-points/check-cep?cep=${cleanCEP}&exclude_id=${isEditing ? id : ''}`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setDuplicateCepWarning({
              show: true,
              existingPoint: data.point,
            });
          } else {
            setDuplicateCepWarning({ show: false, existingPoint: null });
          }
        }
      } catch (error) {
        console.error("Failed to check CEP:", error);
      } finally {
        setCheckingCep(false);
      }
    }, 500);

    return () => {
      if (cepCheckTimeoutRef.current) {
        clearTimeout(cepCheckTimeoutRef.current);
      }
    };
  }, [form.cep, isEditing, id, bypassCepCheck]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const marketplacesRes = await fetch("/api/admin/marketplaces", { headers });
      if (marketplacesRes.ok) {
        const data = await marketplacesRes.json();
        setMarketplaces(data.marketplaces || []);
      }

      if (isEditing) {
        const [pointRes, relationsRes, schedulesRes, mpSchedulesRes] = await Promise.all([
          fetch(`/api/admin/collection-points/${id}`, { headers }),
          fetch("/api/admin/collection-point-marketplaces", { headers }),
          fetch(`/api/admin/collection-point-schedules/${id}`, { headers }),
          fetch(`/api/admin/collection-point-marketplace-schedules/${id}`, { headers }),
        ]);

        if (pointRes.ok) {
          const data = await pointRes.json();
          const point = data.point;
          setForm({
            name: point.name || "",
            cep: formatCEP(point.cep || ""),
            street: point.street || "",
            number: point.number || "",
            neighborhood: point.neighborhood || "",
            complement: point.complement || "",
            city: point.city || "",
            state: point.state || "",
            photo_url: point.photo_url || null,
            accepts_returns: point.accepts_returns === 1,
            accepts_orders: point.accepts_orders === 1,
            is_active: point.is_active === 1,
            accepts_uber_delivery: point.accepts_uber_delivery === 1,
            sells_shipping_supplies: point.sells_shipping_supplies === 1,
            provides_resale_merchandise: point.provides_resale_merchandise === 1,
            accepts_after_hours: point.accepts_after_hours === 1,
            whatsapp_number: point.whatsapp_number || "",
            owner_email: point.owner_email || "",
          });
        }

        let loadedRelations: number[] = [];
        if (relationsRes.ok) {
          const data = await relationsRes.json();
          const filteredRelations = (data.relations || [])
            .filter((r: { collection_point_id: number }) => r.collection_point_id === Number(id));
          loadedRelations = filteredRelations.map((r: { marketplace_id: number }) => r.marketplace_id);
          setSelectedMarketplaces(loadedRelations);
          
          // Load accepts_after_hours per marketplace
          const mpAfterHours = new Map<number, boolean>();
          filteredRelations.forEach((r: any) => {
            mpAfterHours.set(r.marketplace_id, r.accepts_after_hours === 1);
          });
          
          setMarketplaceSchedules(loadedRelations.map((mpId) => ({
            marketplace_id: mpId,
            use_custom_schedule: false,
            accepts_after_hours: mpAfterHours.get(mpId) || false,
            schedules: createDefaultSchedules(),
          })));
        }

        if (schedulesRes.ok) {
          const data = await schedulesRes.json();
          if (data.schedules && data.schedules.length > 0) {
            const loadedSchedules = DAYS_OF_WEEK.map((day) => {
              const existing = data.schedules.find((s: any) => s.day_of_week === day.value);
              if (existing) {
                return {
                  day_of_week: existing.day_of_week,
                  opening_time: existing.opening_time || "",
                  closing_time: existing.closing_time || "",
                  is_closed: existing.is_closed === 1,
                };
              }
              return {
                day_of_week: day.value,
                opening_time: "",
                closing_time: "",
                is_closed: true,
              };
            });
            setSchedules(loadedSchedules);
          }
        }

        if (mpSchedulesRes.ok) {
          const data = await mpSchedulesRes.json();
          const mpSchedulesData = data.schedules || [];

          const groupedByMarketplace: Record<number, any[]> = {};
          for (const s of mpSchedulesData) {
            if (!groupedByMarketplace[s.marketplace_id]) {
              groupedByMarketplace[s.marketplace_id] = [];
            }
            groupedByMarketplace[s.marketplace_id].push(s);
          }

          const loadedMpSchedules: MarketplaceSchedule[] = loadedRelations.map((mpId) => {
            const mpData = groupedByMarketplace[mpId];
            const currentMpSchedule = marketplaceSchedules.find(ms => ms.marketplace_id === mpId);
            
            if (mpData && mpData.length > 0) {
              return {
                marketplace_id: mpId,
                use_custom_schedule: true,
                accepts_after_hours: currentMpSchedule?.accepts_after_hours || false,
                schedules: DAYS_OF_WEEK.map((day) => {
                  const existing = mpData.find((s: any) => s.day_of_week === day.value);
                  if (existing) {
                    return {
                      day_of_week: existing.day_of_week,
                      opening_time: existing.opening_time || "",
                      closing_time: existing.closing_time || "",
                      is_closed: existing.is_closed === 1,
                    };
                  }
                  return { day_of_week: day.value, opening_time: "", closing_time: "", is_closed: true };
                }),
              };
            }
            return {
              marketplace_id: mpId,
              use_custom_schedule: false,
              accepts_after_hours: currentMpSchedule?.accepts_after_hours || false,
              schedules: createDefaultSchedules(),
            };
          });
          setMarketplaceSchedules(loadedMpSchedules);
        }
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
    setForm((prev) => ({ ...prev, cep: formatted }));
    setErrors((prev) => ({ ...prev, cep: "" }));
    // Reset bypass when user changes CEP
    setBypassCepCheck(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Você precisa estar logado para fazer upload de imagens");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "collection_point");
      if (isEditing) {
        formData.append("pointId", id!);
      }

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setForm((prev) => ({ ...prev, photo_url: data.url }));
        console.log("Foto enviada com sucesso:", data.url);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        console.error("Erro no upload:", response.status, errorData);
        alert(`Falha no upload da foto: ${errorData.error || "Erro desconhecido"}`);
      }
    } catch (error) {
      console.error("Failed to upload photo:", error);
      alert("Erro ao fazer upload da foto. Verifique a conexão.");
    } finally {
      setUploading(false);
      if (photoInputRef.current) {
        photoInputRef.current.value = "";
      }
    }
  };

  const toggleMarketplace = (marketplaceId: number) => {
    setSelectedMarketplaces((prev) => {
      const isSelected = prev.includes(marketplaceId);
      if (isSelected) {
        setMarketplaceSchedules((ms) => ms.filter((m) => m.marketplace_id !== marketplaceId));
        return prev.filter((id) => id !== marketplaceId);
      } else {
        setMarketplaceSchedules((ms) => [
          ...ms,
          {
            marketplace_id: marketplaceId,
            use_custom_schedule: false,
            accepts_after_hours: false,
            schedules: createDefaultSchedules(),
          },
        ]);
        return [...prev, marketplaceId];
      }
    });
    setErrors((prev) => ({ ...prev, marketplaces: "" }));
  };

  const updateSchedule = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s))
    );
  };

  const copyToAllDays = (sourceDayOfWeek: number) => {
    const source = schedules.find((s) => s.day_of_week === sourceDayOfWeek);
    if (!source) return;

    setSchedules((prev) =>
      prev.map((s) => ({
        ...s,
        opening_time: source.opening_time,
        closing_time: source.closing_time,
        is_closed: source.is_closed,
      }))
    );
  };

  const copyToWeekdays = (sourceDayOfWeek: number) => {
    const source = schedules.find((s) => s.day_of_week === sourceDayOfWeek);
    if (!source) return;

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.day_of_week >= 1 && s.day_of_week <= 5) {
          return {
            ...s,
            opening_time: source.opening_time,
            closing_time: source.closing_time,
            is_closed: source.is_closed,
          };
        }
        return s;
      })
    );
  };

  const toggleCustomSchedule = (marketplaceId: number) => {
    setMarketplaceSchedules((prev) =>
      prev.map((ms) =>
        ms.marketplace_id === marketplaceId
          ? {
              ...ms,
              use_custom_schedule: !ms.use_custom_schedule,
              schedules: !ms.use_custom_schedule ? [...schedules] : ms.schedules,
            }
          : ms
      )
    );
  };

  const updateMarketplaceSchedule = (
    marketplaceId: number,
    dayOfWeek: number,
    field: keyof DaySchedule,
    value: any
  ) => {
    setMarketplaceSchedules((prev) =>
      prev.map((ms) =>
        ms.marketplace_id === marketplaceId
          ? {
              ...ms,
              schedules: ms.schedules.map((s) =>
                s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
              ),
            }
          : ms
      )
    );
  };

  const copyGeneralToMarketplace = (marketplaceId: number) => {
    setMarketplaceSchedules((prev) =>
      prev.map((ms) =>
        ms.marketplace_id === marketplaceId ? { ...ms, schedules: [...schedules] } : ms
      )
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Nome é obrigatório";
    }

    const cleanCEP = form.cep.replace(/\D/g, "");
    if (!cleanCEP || cleanCEP.length !== 8) {
      newErrors.cep = "CEP inválido (deve ter 8 dígitos)";
    }

    if (!form.street.trim()) {
      newErrors.street = "Rua é obrigatória";
    }

    if (!form.number.trim()) {
      newErrors.number = "Número é obrigatório";
    }

    if (!form.neighborhood.trim()) {
      newErrors.neighborhood = "Bairro é obrigatório";
    }

    if (!form.accepts_returns && !form.accepts_orders) {
      newErrors.operations = "Selecione pelo menos um tipo de operação";
    }

    if (selectedMarketplaces.length === 0) {
      newErrors.marketplaces = "Selecione pelo menos um marketplace";
    }

    const hasOpenDay = schedules.some((s) => !s.is_closed);
    if (!hasOpenDay) {
      newErrors.schedules = "O ponto deve funcionar em pelo menos um dia da semana";
    }

    for (const schedule of schedules) {
      if (!schedule.is_closed) {
        if (!schedule.opening_time || !schedule.closing_time) {
          newErrors.schedules = "Preencha os horários de abertura e fechamento para os dias abertos";
          break;
        }
        if (schedule.opening_time >= schedule.closing_time) {
          newErrors.schedules = "O horário de abertura deve ser anterior ao de fechamento";
          break;
        }
      }
    }

    for (const ms of marketplaceSchedules) {
      if (ms.use_custom_schedule) {
        const mpHasOpenDay = ms.schedules.some((s) => !s.is_closed);
        if (!mpHasOpenDay) {
          const mp = marketplaces.find((m) => m.id === ms.marketplace_id);
          newErrors.marketplaceSchedules = `${mp?.name || "Marketplace"} deve ter pelo menos um dia aberto`;
          break;
        }
        for (const schedule of ms.schedules) {
          if (!schedule.is_closed) {
            if (!schedule.opening_time || !schedule.closing_time) {
              const mp = marketplaces.find((m) => m.id === ms.marketplace_id);
              newErrors.marketplaceSchedules = `Preencha os horários para ${mp?.name || "marketplace"}`;
              break;
            }
            if (schedule.opening_time >= schedule.closing_time) {
              const mp = marketplaces.find((m) => m.id === ms.marketplace_id);
              newErrors.marketplaceSchedules = `Horários inválidos para ${mp?.name || "marketplace"}`;
              break;
            }
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicateCep = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const cleanCEP = form.cep.replace(/\D/g, "");
      const response = await fetch(
        `/api/admin/collection-points/check-cep?cep=${cleanCEP}&exclude_id=${isEditing ? id : ''}`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setDuplicateCepWarning({
            show: true,
            existingPoint: data.point,
          });
          return true; // Indica que existe duplicata
        }
      }
    } catch (error) {
      console.error("Failed to check CEP:", error);
    }
    return false; // Não existe duplicata ou erro na verificação
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Se não está bypassando a verificação, verificar CEP duplicado
    if (!bypassCepCheck) {
      const hasDuplicate = await checkDuplicateCep();
      if (hasDuplicate) {
        return; // Para o fluxo e aguarda resposta do usuário no modal
      }
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Ensure all selected marketplaces have an entry in marketplace_after_hours
      // even if they're not in marketplaceSchedules (prevents sync issues)
      const marketplaceAfterHoursMap = new Map(
        marketplaceSchedules.map((ms) => [ms.marketplace_id, ms.accepts_after_hours])
      );
      
      const payload = {
        name: form.name.trim(),
        cep: form.cep.replace(/\D/g, ""),
        street: form.street.trim(),
        number: form.number.trim(),
        neighborhood: form.neighborhood.trim(),
        complement: form.complement.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        photo_url: form.photo_url,
        accepts_returns: form.accepts_returns,
        accepts_orders: form.accepts_orders,
        is_active: form.is_active,
        accepts_uber_delivery: form.accepts_uber_delivery,
        sells_shipping_supplies: form.sells_shipping_supplies,
        provides_resale_merchandise: form.provides_resale_merchandise,
        accepts_after_hours: form.accepts_after_hours,
        whatsapp_number: form.whatsapp_number.trim() || null,
        owner_email: form.owner_email.trim() || null,
        marketplace_ids: selectedMarketplaces,
        marketplace_after_hours: selectedMarketplaces.map((mpId) => ({
          marketplace_id: mpId,
          accepts_after_hours: marketplaceAfterHoursMap.get(mpId) || false,
        })),
        schedules: schedules,
        marketplace_schedules: marketplaceSchedules
          .filter((ms) => ms.use_custom_schedule)
          .map((ms) => ({
            marketplace_id: ms.marketplace_id,
            schedules: ms.schedules,
          })),
      };

      const url = isEditing
        ? `/api/admin/collection-points/${id}`
        : "/api/admin/collection-points";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        navigate("/admin/collection-points");
      }
    } catch (error) {
      console.error("Failed to save point:", error);
    } finally {
      setSaving(false);
      setBypassCepCheck(false); // Reset após salvar
    }
  };

  const handleConfirmDuplicateCep = () => {
    setDuplicateCepWarning({ show: false, existingPoint: null });
    setBypassCepCheck(true);
    // Dispara o submit novamente com bypass ativado
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  const handleCancelDuplicateCep = () => {
    setDuplicateCepWarning({ show: false, existingPoint: null });
    setBypassCepCheck(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  const selectedMarketplaceData = marketplaces.filter(
    (m) => m.is_active === 1 && selectedMarketplaces.includes(m.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Duplicate CEP Warning Modal */}
      {duplicateCepWarning.show && duplicateCepWarning.existingPoint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">CEP Duplicado</h3>
                <p className="text-sm text-gray-600">
                  Este CEP já está cadastrado no ponto:{" "}
                  <span className="font-semibold text-gray-900">
                    {duplicateCepWarning.existingPoint?.name}
                  </span>
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-900">
                Você realmente deseja continuar com o cadastro deste ponto de coleta mesmo com o CEP duplicado?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelDuplicateCep}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Não, cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicateCep}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition font-medium shadow-lg shadow-amber-500/25"
              >
                Sim, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/collection-points")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {isEditing ? "Editar Ponto de Coleta" : "Novo Ponto de Coleta"}
                </h1>
                <p className="text-xs text-gray-500">
                  {isEditing ? "Atualize as informações do ponto" : "Cadastre um novo ponto de coleta"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto do Local
                </label>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {form.photo_url ? (
                      <img
                        src={form.photo_url}
                        alt="Foto do ponto"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MapPin className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {form.photo_url ? "Alterar Foto" : "Enviar Foto"}
                    </button>
                    {form.photo_url && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, photo_url: null }))}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Ponto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    setErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
                    errors.name ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="Ex: Centro de Distribuição Norte"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* CEP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEP <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.cep}
                    onChange={handleCEPChange}
                    maxLength={10}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
                      errors.cep ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                    placeholder="XX.XXX-XXX"
                  />
                  {checkingCep && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  )}
                </div>
                {errors.cep && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.cep}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, is_active: e.target.value === "active" }))
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Street */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rua <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, street: e.target.value }));
                    setErrors((prev) => ({ ...prev, street: "" }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
                    errors.street ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="Nome da rua"
                />
                {errors.street && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.street}
                  </p>
                )}
              </div>

              {/* Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.number}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, number: e.target.value }));
                    setErrors((prev) => ({ ...prev, number: "" }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
                    errors.number ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="Nº"
                />
                {errors.number && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.number}
                  </p>
                )}
              </div>

              {/* Neighborhood */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.neighborhood}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, neighborhood: e.target.value }));
                    setErrors((prev) => ({ ...prev, neighborhood: "" }));
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition ${
                    errors.neighborhood ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="Nome do bairro"
                />
                {errors.neighborhood && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.neighborhood}
                  </p>
                )}
              </div>

              {/* Complement */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Complemento</label>
                <input
                  type="text"
                  value={form.complement}
                  onChange={(e) => setForm((prev) => ({ ...prev, complement: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  placeholder="Sala, bloco, etc."
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  placeholder="Ex: Goiânia"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">UF</label>
                <select
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                >
                  <option value="">Selecione</option>
                  <option value="AC">AC</option>
                  <option value="AL">AL</option>
                  <option value="AP">AP</option>
                  <option value="AM">AM</option>
                  <option value="BA">BA</option>
                  <option value="CE">CE</option>
                  <option value="DF">DF</option>
                  <option value="ES">ES</option>
                  <option value="GO">GO</option>
                  <option value="MA">MA</option>
                  <option value="MT">MT</option>
                  <option value="MS">MS</option>
                  <option value="MG">MG</option>
                  <option value="PA">PA</option>
                  <option value="PB">PB</option>
                  <option value="PR">PR</option>
                  <option value="PE">PE</option>
                  <option value="PI">PI</option>
                  <option value="RJ">RJ</option>
                  <option value="RN">RN</option>
                  <option value="RS">RS</option>
                  <option value="RO">RO</option>
                  <option value="RR">RR</option>
                  <option value="SC">SC</option>
                  <option value="SP">SP</option>
                  <option value="SE">SE</option>
                  <option value="TO">TO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Tipos de Operação</h2>
            <p className="text-sm text-gray-500 mb-4">
              Selecione pelo menos um tipo de operação que este ponto aceita.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                  form.accepts_returns
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.accepts_returns}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, accepts_returns: e.target.checked }));
                    setErrors((prev) => ({ ...prev, operations: "" }));
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    form.accepts_returns ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Undo2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Aceita Devolução</p>
                  <p className="text-sm text-gray-500">Recebe produtos devolvidos</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                  form.accepts_orders
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.accepts_orders}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, accepts_orders: e.target.checked }));
                    setErrors((prev) => ({ ...prev, operations: "" }));
                  }}
                  className="sr-only"
                />
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    form.accepts_orders ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Aceita Pedidos</p>
                  <p className="text-sm text-gray-500">Recebe pedidos para retirada</p>
                </div>
              </label>
            </div>

            {errors.operations && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.operations}
              </p>
            )}
          </div>

          {/* Additional Services */}
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Serviços Adicionais</h2>
            <p className="text-sm text-gray-500 mb-4">
              Configure os serviços extras oferecidos por este ponto de coleta.
            </p>

            <div className="space-y-3">
              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  form.accepts_uber_delivery
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.accepts_uber_delivery}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accepts_uber_delivery: e.target.checked }))
                  }
                  className="sr-only"
                />
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    form.accepts_uber_delivery ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Aceita envio por Uber</p>
                  <p className="text-sm text-gray-500">Seller pode enviar mercadoria via Uber</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  form.sells_shipping_supplies
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.sells_shipping_supplies}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sells_shipping_supplies: e.target.checked }))
                  }
                  className="sr-only"
                />
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    form.sells_shipping_supplies ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Vende insumos de envio</p>
                  <p className="text-sm text-gray-500">Etiquetas, embalagens, etc.</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  form.provides_resale_merchandise
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.provides_resale_merchandise}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, provides_resale_merchandise: e.target.checked }))
                  }
                  className="sr-only"
                />
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    form.provides_resale_merchandise ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Fornece mercadoria para revenda</p>
                  <p className="text-sm text-gray-500">Disponibiliza produtos para sellers</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                  form.accepts_after_hours
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.accepts_after_hours}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, accepts_after_hours: e.target.checked }))
                  }
                  className="sr-only"
                />
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    form.accepts_after_hours ? "bg-red-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Receber fora do horário</p>
                  <p className="text-sm text-gray-500">Recebe mercadoria mesmo fechado (contato prévio)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Informações de Contato</h2>
            <p className="text-sm text-gray-500 mb-4">
              Configure as informações de contato e vínculo com proprietário.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={form.whatsapp_number}
                  onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_number: e.target.value }))}
                  placeholder="5562999887766"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Com código do país (ex: 5562999887766)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email do Proprietário
                </label>
                <input
                  type="email"
                  value={form.owner_email}
                  onChange={(e) => setForm((prev) => ({ ...prev, owner_email: e.target.value }))}
                  placeholder="proprietario@email.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Usuário com este email poderá solicitar edições
                </p>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                Horários de Funcionamento (Geral)
              </h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Configure os horários padrão de abertura e fechamento para cada dia da semana.
            </p>

            <div className="space-y-3">
              {schedules.map((schedule) => {
                const day = DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week);
                return (
                  <div
                    key={schedule.day_of_week}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition ${
                      schedule.is_closed
                        ? "bg-gray-50 border-gray-200"
                        : "bg-emerald-50/50 border-emerald-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:w-40">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!schedule.is_closed}
                          onChange={(e) =>
                            updateSchedule(schedule.day_of_week, "is_closed", !e.target.checked)
                          }
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span
                          className={`font-medium ${
                            schedule.is_closed ? "text-gray-500" : "text-gray-900"
                          }`}
                        >
                          {day?.label}
                        </span>
                      </label>
                    </div>

                    {!schedule.is_closed ? (
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">das</span>
                          <input
                            type="time"
                            value={schedule.opening_time}
                            onChange={(e) =>
                              updateSchedule(schedule.day_of_week, "opening_time", e.target.value)
                            }
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">às</span>
                          <input
                            type="time"
                            value={schedule.closing_time}
                            onChange={(e) =>
                              updateSchedule(schedule.day_of_week, "closing_time", e.target.value)
                            }
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>

                        <div className="hidden sm:flex items-center gap-1 ml-auto">
                          <button
                            type="button"
                            onClick={() => copyToWeekdays(schedule.day_of_week)}
                            className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded transition"
                            title="Copiar para dias úteis"
                          >
                            → Dias úteis
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToAllDays(schedule.day_of_week)}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition"
                            title="Copiar para todos os dias"
                          >
                            → Todos
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Fechado</span>
                    )}
                  </div>
                );
              })}
            </div>

            {errors.schedules && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.schedules}
              </p>
            )}
          </div>

          {/* Marketplaces Selection */}
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Marketplaces</h2>
            <p className="text-sm text-gray-500 mb-4">
              Selecione os marketplaces que este ponto de coleta atende.{" "}
              <span className="text-red-500">*</span>
            </p>

            {marketplaces.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                <Store className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Nenhum marketplace cadastrado</p>
                <button
                  type="button"
                  onClick={() => navigate("/admin/marketplaces")}
                  className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Cadastrar Marketplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {marketplaces
                  .filter((m) => m.is_active === 1)
                  .map((marketplace) => {
                    const isSelected = selectedMarketplaces.includes(marketplace.id);
                    return (
                      <label
                        key={marketplace.id}
                        className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMarketplace(marketplace.id)}
                          className="sr-only"
                        />
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${
                            isSelected ? "bg-white" : "bg-gray-100"
                          }`}
                        >
                          {marketplace.logo_url ? (
                            <img
                              src={marketplace.logo_url}
                              alt={marketplace.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Store
                              className={`w-5 h-5 ${isSelected ? "text-emerald-600" : "text-gray-400"}`}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium truncate ${
                              isSelected ? "text-emerald-900" : "text-gray-900"
                            }`}
                          >
                            {marketplace.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{marketplace.slug}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </label>
                    );
                  })}
              </div>
            )}

            {errors.marketplaces && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.marketplaces}
              </p>
            )}
          </div>

          {/* Marketplace-specific Schedules */}
          {selectedMarketplaceData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-600" />
                Horários por Marketplace
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Configure horários específicos para cada marketplace, se necessário. Por padrão, os
                marketplaces usam o horário geral configurado acima.
              </p>

              <div className="space-y-3">
                {selectedMarketplaceData.map((marketplace) => {
                  const msData = marketplaceSchedules.find(
                    (ms) => ms.marketplace_id === marketplace.id
                  );
                  const isExpanded = expandedMarketplace === marketplace.id;
                  const hasCustomSchedule = msData?.use_custom_schedule || false;

                  return (
                    <div
                      key={marketplace.id}
                      className={`border-2 rounded-xl overflow-hidden transition ${
                        hasCustomSchedule ? "border-purple-300 bg-purple-50/30" : "border-gray-200"
                      }`}
                    >
                      {/* Marketplace Header */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
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
                            <div>
                              <p className="font-medium text-gray-900">{marketplace.name}</p>
                              <p className="text-xs text-gray-500">
                                {hasCustomSchedule ? "Horário personalizado" : "Usa horário geral"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hasCustomSchedule}
                                onChange={() => toggleCustomSchedule(marketplace.id)}
                                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-sm text-gray-600">Horário específico</span>
                            </label>

                            {hasCustomSchedule && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMarketplace(isExpanded ? null : marketplace.id)
                                }
                                className="p-2 hover:bg-white rounded-lg transition"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* After Hours for this marketplace */}
                        <label
                          className={`flex items-center gap-2 p-2 border rounded-lg transition ${
                            !form.accepts_after_hours
                              ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                              : msData?.accepts_after_hours
                              ? "border-red-400 bg-red-50 cursor-pointer"
                              : "border-gray-200 hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={msData?.accepts_after_hours || false}
                            disabled={!form.accepts_after_hours}
                            onChange={(e) => {
                              setMarketplaceSchedules((prev) =>
                                prev.map((ms) =>
                                  ms.marketplace_id === marketplace.id
                                    ? { ...ms, accepts_after_hours: e.target.checked }
                                    : ms
                                )
                              );
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <Clock className={`w-4 h-4 ${msData?.accepts_after_hours ? "text-red-600" : "text-gray-400"}`} />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${msData?.accepts_after_hours ? "text-red-900" : "text-gray-700"}`}>
                              Recebe fora do horário para {marketplace.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {!form.accepts_after_hours 
                                ? "Ative 'Receber fora do horário' acima para habilitar esta opção"
                                : "Aceita mercadoria mesmo quando fechado"}
                            </p>
                          </div>
                        </label>
                      </div>

                      {/* Expanded Schedule Editor */}
                      {hasCustomSchedule && isExpanded && msData && (
                        <div className="border-t border-gray-200 p-4 bg-white/50">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium text-gray-700">
                              Horários de {marketplace.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => copyGeneralToMarketplace(marketplace.id)}
                              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100 px-2 py-1 rounded transition"
                            >
                              <Copy className="w-3 h-3" />
                              Copiar do horário geral
                            </button>
                          </div>

                          <div className="space-y-2">
                            {msData.schedules.map((schedule) => {
                              const day = DAYS_OF_WEEK.find((d) => d.value === schedule.day_of_week);
                              return (
                                <div
                                  key={schedule.day_of_week}
                                  className={`flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-lg border transition ${
                                    schedule.is_closed
                                      ? "bg-gray-50 border-gray-200"
                                      : "bg-purple-50/50 border-purple-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 sm:w-36">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!schedule.is_closed}
                                        onChange={(e) =>
                                          updateMarketplaceSchedule(
                                            marketplace.id,
                                            schedule.day_of_week,
                                            "is_closed",
                                            !e.target.checked
                                          )
                                        }
                                        className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                      />
                                      <span
                                        className={`text-sm ${
                                          schedule.is_closed ? "text-gray-500" : "text-gray-900"
                                        }`}
                                      >
                                        {day?.short}
                                      </span>
                                    </label>
                                  </div>

                                  {!schedule.is_closed ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="time"
                                        value={schedule.opening_time}
                                        onChange={(e) =>
                                          updateMarketplaceSchedule(
                                            marketplace.id,
                                            schedule.day_of_week,
                                            "opening_time",
                                            e.target.value
                                          )
                                        }
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                      />
                                      <span className="text-xs text-gray-400">-</span>
                                      <input
                                        type="time"
                                        value={schedule.closing_time}
                                        onChange={(e) =>
                                          updateMarketplaceSchedule(
                                            marketplace.id,
                                            schedule.day_of_week,
                                            "closing_time",
                                            e.target.value
                                          )
                                        }
                                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Fechado</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {errors.marketplaceSchedules && (
                <p className="mt-3 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.marketplaceSchedules}
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/collection-points")}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isEditing ? "Salvar Alterações" : "Criar Ponto de Coleta"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
