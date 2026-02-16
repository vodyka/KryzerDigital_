import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Star,
  Loader2,
  MapPin,
  Crown,
  LogOut,
  Edit2,
  Trash2,
  X,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

interface AppUser {
  id: number;
  email: string;
  is_active: number;
  is_admin: number;
  access_level: string;
  penalty_points: number;
}

interface Review {
  id: number;
  collection_point_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  point_name: string;
  point_address: string;
  point_photo_url: string | null;
  is_moderated: number;
  moderated_at: string | null;
}

const ACCESS_LEVELS: Record<string, { label: string; bg: string; text: string }> = {
  free: { label: "FREE", bg: "#e5e7eb", text: "#374151" },
  gold: { label: "GOLD", bg: "#fef3c7", text: "#92400e" },
  platinum: { label: "PLATINUM", bg: "#dbeafe", text: "#1e40af" },
  diamond: { label: "DIAMOND", bg: "#e0e7ff", text: "#4338ca" },
  enterprise: { label: "ENTERPRISE", bg: "#ddd6fe", text: "#5b21b6" },
  admin: { label: "ADMIN", bg: "#fecaca", text: "#991b1b" },
};

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, reviewsRes] = await Promise.all([
        fetch("/api/users/me"),
        fetch("/api/my-reviews"),
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setAppUser(data.appUser);
      }

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  const openEditModal = (review: Review) => {
    setEditRating(review.rating);
    setEditComment(review.comment || "");
    setEditModal(review);
  };

  const saveEdit = async () => {
    if (!editModal || editRating === 0) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/collection-points/${editModal.collection_point_id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: editRating, comment: editComment || null }),
      });

      if (response.ok) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === editModal.id
              ? { ...r, rating: editRating, comment: editComment || null, updated_at: new Date().toISOString() }
              : r
          )
        );
        setEditModal(null);
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao salvar avaliação");
      }
    } catch (error) {
      console.error("Failed to save review:", error);
      alert("Erro ao salvar avaliação");
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async (reviewId: number, pointId: number) => {
    try {
      const response = await fetch(`/api/collection-points/${pointId}/reviews`, {
        method: "DELETE",
      });

      if (response.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } else {
        const data = await response.json();
        alert(data.error || "Erro ao excluir avaliação");
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      alert("Erro ao excluir avaliação");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const accessLevel = ACCESS_LEVELS[(appUser?.access_level || "free").toLowerCase()];

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Minhas Avaliações</h1>
                  <p className="text-xs text-gray-500">Gerencie suas avaliações</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: accessLevel.bg, color: accessLevel.text }}
              >
                <Crown className="w-3.5 h-3.5" />
                {accessLevel.label}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Blocked User Warning */}
        {appUser && appUser.penalty_points >= 3 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">
                  Você foi bloqueado de avaliar pontos de coleta
                </h3>
                <p className="text-sm text-red-800">
                  Suas avaliações foram moderadas 3 ou mais vezes. Você não pode mais criar novas
                  avaliações, mas pode visualizar as existentes.
                </p>
              </div>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma avaliação ainda
            </h3>
            <p className="text-gray-500 mb-4">
              Você ainda não avaliou nenhum ponto de coleta. Busque pontos próximos e deixe sua
              avaliação!
            </p>
            <button
              onClick={() => navigate("/collection-points/list")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium"
            >
              <MapPin className="w-4 h-4" />
              Buscar Pontos de Coleta
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {reviews.length} avaliação{reviews.length !== 1 ? "ões" : ""} encontrada
              {reviews.length !== 1 ? "s" : ""}
            </p>

            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Photo */}
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                      {review.point_photo_url ? (
                        <img
                          src={review.point_photo_url}
                          alt={review.point_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">
                        {review.point_name}
                      </h4>
                      <p className="text-sm text-gray-500 mb-2">{review.point_address}</p>

                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= review.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-500 ml-2">
                          {formatDate(review.updated_at)}
                        </span>
                      </div>

                      {review.comment && (
                        <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                          "{review.comment}"
                        </p>
                      )}

                      {/* Moderated Badge */}
                      {review.is_moderated === 1 && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                          <ShieldAlert className="w-4 h-4 text-red-600" />
                          <div>
                            <p className="text-sm font-semibold text-red-900">
                              Avaliação Moderada
                            </p>
                            <p className="text-xs text-red-700">
                              Esta avaliação foi editada pela administração e não pode mais ser
                              modificada.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(review)}
                        disabled={review.is_moderated === 1}
                        className={`p-2 rounded-lg transition ${
                          review.is_moderated === 1
                            ? "opacity-30 cursor-not-allowed"
                            : "hover:bg-gray-100"
                        }`}
                        title={review.is_moderated === 1 ? "Não pode editar avaliações moderadas" : "Editar"}
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(review.id)}
                        disabled={review.is_moderated === 1}
                        className={`p-2 rounded-lg transition ${
                          review.is_moderated === 1
                            ? "opacity-30 cursor-not-allowed"
                            : "hover:bg-red-50"
                        }`}
                        title={review.is_moderated === 1 ? "Não pode excluir avaliações moderadas" : "Excluir"}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === review.id && (
                  <div className="bg-red-50 border-t border-red-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-red-700">Excluir esta avaliação?</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-white rounded-lg transition"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => deleteReview(review.id, review.collection_point_id)}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Editar Avaliação</h3>
                <button
                  onClick={() => setEditModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <p className="text-sm text-gray-500 mb-4">{editModal.point_name}</p>

              {/* Stars */}
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setEditRating(star)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= editRating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Deixe um comentário (opcional)"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setEditModal(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editRating === 0 || saving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
