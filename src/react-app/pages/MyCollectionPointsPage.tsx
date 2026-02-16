import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Edit,
  Clock,
  Package,
  Undo2,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  MapPinned,
} from "lucide-react";

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
  accepts_uber_delivery?: number;
  sells_shipping_supplies?: number;
  provides_resale_merchandise?: number;
  accepts_after_hours?: number;
  whatsapp_number?: string;
  owner_email?: string;
  created_at: string;
  updated_at: string;
}

interface Schedule {
  day_of_week: number;
  opening_time: string | null;
  closing_time: string | null;
  is_closed: number;
}

interface PendingChange {
  id: number;
  change_type: string;
  old_value: string;
  new_value: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function MyCollectionPointsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    whatsapp_number: "",
    schedules: [] as Schedule[],
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMyPoints();
  }, []);

  const fetchMyPoints = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/collection-points/my-points");
      if (response.ok) {
        const data = await response.json();
        setPoints(data.points || []);
      }
    } catch (error) {
      console.error("Failed to fetch points:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPointDetails = async (pointId: number) => {
    try {
      const changesRes = await fetch(`/api/admin/pending-changes?point_id=${pointId}`);

      if (changesRes.ok) {
        const data = await changesRes.json();
        setPendingChanges(data.changes || []);
      }
    } catch (error) {
      console.error("Failed to fetch point details:", error);
    }
  };

  const openEditModal = async (point: CollectionPoint) => {
    setSelectedPoint(point);
    await fetchPointDetails(point.id);

    // Initialize form
    const schedulesRes = await fetch(`/api/admin/collection-point-schedules/${point.id}`);
    if (schedulesRes.ok) {
      const data = await schedulesRes.json();
      setEditForm({
        name: point.name,
        whatsapp_number: point.whatsapp_number || "",
        schedules: data.schedules || [],
      });
    }

    setShowEditModal(true);
  };

  const handleScheduleChange = (dayOfWeek: number, field: "opening_time" | "closing_time" | "is_closed", value: string | boolean) => {
    setEditForm((prev) => {
      const newSchedules = [...prev.schedules];
      const scheduleIndex = newSchedules.findIndex((s) => s.day_of_week === dayOfWeek);

      if (scheduleIndex >= 0) {
        if (field === "is_closed") {
          newSchedules[scheduleIndex].is_closed = value ? 1 : 0;
          if (value) {
            newSchedules[scheduleIndex].opening_time = null;
            newSchedules[scheduleIndex].closing_time = null;
          }
        } else {
          newSchedules[scheduleIndex][field] = value as string;
        }
      } else {
        newSchedules.push({
          day_of_week: dayOfWeek,
          opening_time: field === "opening_time" ? (value as string) : null,
          closing_time: field === "closing_time" ? (value as string) : null,
          is_closed: field === "is_closed" ? (value ? 1 : 0) : 0,
        });
      }

      return { ...prev, schedules: newSchedules };
    });
  };

  const getScheduleForDay = (dayOfWeek: number): Schedule | undefined => {
    return editForm.schedules.find((s) => s.day_of_week === dayOfWeek);
  };

  const submitChanges = async () => {
    if (!selectedPoint) return;

    setSubmitting(true);
    try {
      const changes = [];

      // Check for name change
      if (editForm.name !== selectedPoint.name) {
        changes.push({
          type: "name",
          old_value: selectedPoint.name,
          new_value: editForm.name,
        });
      }

      // Check for WhatsApp change
      if (editForm.whatsapp_number !== (selectedPoint.whatsapp_number || "")) {
        changes.push({
          type: "whatsapp_number",
          old_value: selectedPoint.whatsapp_number || "",
          new_value: editForm.whatsapp_number,
        });
      }

      // Check for schedule changes
      const originalSchedulesRes = await fetch(`/api/admin/collection-point-schedules/${selectedPoint.id}`);
      if (originalSchedulesRes.ok) {
        const originalData = await originalSchedulesRes.json();
        const originalSchedules = originalData.schedules || [];

        // Compare schedules
        const schedulesChanged = JSON.stringify(originalSchedules.sort((a: any, b: any) => a.day_of_week - b.day_of_week)) !== 
                                JSON.stringify(editForm.schedules.sort((a, b) => a.day_of_week - b.day_of_week));

        if (schedulesChanged) {
          changes.push({
            type: "schedules",
            old_value: JSON.stringify(originalSchedules),
            new_value: JSON.stringify(editForm.schedules),
          });
        }
      }

      if (changes.length === 0) {
        alert("Nenhuma alteração foi feita.");
        setShowEditModal(false);
        return;
      }

      // Submit pending changes
      const response = await fetch(`/api/collection-points/${selectedPoint.id}/submit-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });

      if (response.ok) {
        alert("Alterações enviadas para aprovação do administrador!");
        setShowEditModal(false);
        fetchMyPoints();
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao enviar alterações");
      }
    } catch (error) {
      console.error("Failed to submit changes:", error);
      alert("Erro ao enviar alterações");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">Meus Pontos de Coleta</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie seus pontos cadastrados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {points.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Nenhum ponto cadastrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Você ainda não possui pontos de coleta cadastrados com o seu email.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Entre em contato com o administrador para cadastrar um novo ponto.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {points.length} ponto{points.length !== 1 ? "s" : ""} cadastrado{points.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {points.map((point) => (
                <div
                  key={point.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Photo */}
                      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-xl flex-shrink-0 overflow-hidden">
                        {point.photo_url ? (
                          <img
                            src={point.photo_url}
                            alt={point.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {point.name}
                          </h4>
                          <span
                            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                              point.is_active
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            }`}
                          >
                            {point.is_active ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                Inativo
                              </>
                            )}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPinned className="w-4 h-4" />
                            <span>
                              {point.street}, {point.number} - {point.neighborhood}
                              {point.complement && `, ${point.complement}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span>{point.owner_email}</span>
                          </div>
                          {point.whatsapp_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="w-4 h-4" />
                              <span>{point.whatsapp_number}</span>
                            </div>
                          )}
                        </div>

                        {/* Services */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {point.accepts_returns === 1 && (
                            <span className="flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-xs font-medium">
                              <Undo2 className="w-3 h-3" />
                              Devoluções
                            </span>
                          )}
                          {point.accepts_orders === 1 && (
                            <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-medium">
                              <Package className="w-3 h-3" />
                              Pedidos
                            </span>
                          )}
                          {point.accepts_after_hours === 1 && (
                            <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              Fora do Horário
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Cadastrado em: {new Date(point.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => openEditModal(point)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Solicitar Edição
                      </button>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Alterações precisam ser aprovadas pelo administrador
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && selectedPoint && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Solicitar Edição: {selectedPoint.name}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Alert */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-medium mb-1">Alterações sujeitas a aprovação</p>
                    <p>
                      Suas solicitações de edição serão enviadas para análise do administrador antes de
                      serem aplicadas ao ponto de coleta. O email vinculado ao ponto só pode ser alterado
                      por um administrador.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pending Changes */}
              {pendingChanges.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                    Alterações Pendentes
                  </h4>
                  <div className="space-y-2">
                    {pendingChanges.map((change) => (
                      <div
                        key={change.id}
                        className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2"
                      >
                        <Clock className="w-3 h-3" />
                        <span>
                          {change.change_type === "name" && "Nome"}
                          {change.change_type === "whatsapp_number" && "WhatsApp"}
                          {change.change_type === "schedules" && "Horários"}
                          {" - "}
                          {change.status === "pending" && "Aguardando aprovação"}
                          {change.status === "approved" && "Aprovado"}
                          {change.status === "rejected" && `Rejeitado: ${change.admin_note}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email (Blocked) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Vinculado
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={selectedPoint.owner_email || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-xl cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Apenas administradores podem alterar o email vinculado ao ponto
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Ponto
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={editForm.whatsapp_number}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, whatsapp_number: e.target.value }))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Schedules */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Horários de Funcionamento
                </label>
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                    const schedule = getScheduleForDay(dayOfWeek);
                    const isClosed = schedule?.is_closed === 1;

                    return (
                      <div
                        key={dayOfWeek}
                        className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                      >
                        <div className="col-span-3 text-sm font-medium text-gray-900 dark:text-white">
                          {DAY_NAMES[dayOfWeek]}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="time"
                            value={schedule?.opening_time || ""}
                            onChange={(e) =>
                              handleScheduleChange(dayOfWeek, "opening_time", e.target.value)
                            }
                            disabled={isClosed}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm disabled:opacity-50"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="time"
                            value={schedule?.closing_time || ""}
                            onChange={(e) =>
                              handleScheduleChange(dayOfWeek, "closing_time", e.target.value)
                            }
                            disabled={isClosed}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm disabled:opacity-50"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isClosed}
                              onChange={(e) =>
                                handleScheduleChange(dayOfWeek, "is_closed", e.target.checked)
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Fechado</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitChanges}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enviar para Aprovação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
