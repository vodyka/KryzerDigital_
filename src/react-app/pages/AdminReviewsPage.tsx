import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  MessageSquare,
  Search,
  Filter,
  Star,
  AlertTriangle,
  Edit2,
  X,
  Save,
  Loader2,
  ShieldAlert,
  Check,
  AlertCircle,
} from "lucide-react";

interface Review {
  id: number;
  collection_point_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  is_moderated: number;
  moderated_at: string | null;
  moderated_by_admin_id: number | null;
  original_message: string | null;
  original_rating: number | null;
  point_name: string;
  point_id: number;
  user_email: string;
  user_penalty_points: number;
}

interface CollectionPoint {
  id: number;
  name: string;
}

interface User {
  id: number;
  email: string;
}

export default function AdminReviewsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [collectionPoints, setCollectionPoints] = useState<CollectionPoint[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filter states
  const [selectedPoint, setSelectedPoint] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [searchText, setSearchText] = useState("");

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

  // Toast states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reviews, selectedPoint, selectedUser, selectedStatus, selectedRating, searchText]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchData = async () => {
    try {
      const [reviewsRes, pointsRes, usersRes] = await Promise.all([
        fetch("/api/admin/reviews"),
        fetch("/api/admin/collection-points"),
        fetch("/api/admin/users"),
      ]);

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }

      if (pointsRes.ok) {
        const data = await pointsRes.json();
        setCollectionPoints(data.points || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setErrorMessage("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reviews];

    if (selectedPoint) {
      filtered = filtered.filter((r) => r.collection_point_id === parseInt(selectedPoint));
    }

    if (selectedUser) {
      filtered = filtered.filter((r) => r.user_id === parseInt(selectedUser));
    }

    if (selectedStatus === "moderated") {
      filtered = filtered.filter((r) => r.is_moderated === 1);
    } else if (selectedStatus === "normal") {
      filtered = filtered.filter((r) => r.is_moderated === 0);
    }

    if (selectedRating) {
      filtered = filtered.filter((r) => r.rating === parseInt(selectedRating));
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.comment?.toLowerCase().includes(search) ||
          r.point_name.toLowerCase().includes(search) ||
          r.user_email.toLowerCase().includes(search)
      );
    }

    setFilteredReviews(filtered);
  };

  const handleEditClick = (review: Review) => {
    setSelectedReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || "");
    setShowEditModal(true);
  };

  const handleSaveModeration = async () => {
    if (!selectedReview) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/reviews/${selectedReview.id}/moderate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: editRating,
          comment: editComment,
        }),
      });

      if (response.ok) {
        await fetchData();
        setShowEditModal(false);
        setSuccessMessage("Avaliação moderada com sucesso!");
      } else {
        setErrorMessage("Erro ao moderar avaliação");
      }
    } catch (error) {
      console.error("Failed to moderate review:", error);
      setErrorMessage("Erro ao moderar avaliação");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setShowEditModal(false);
    setSelectedReview(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const getPenaltyStatus = (points: number) => {
    if (points >= 3) return { text: "BLOQUEADO", color: "bg-red-500 text-white" };
    if (points === 2) return { text: `${points}/3 CRÍTICO`, color: "bg-orange-500 text-white" };
    if (points === 1) return { text: `${points}/3 AVISO`, color: "bg-yellow-500 text-white" };
    return { text: "0/3 OK", color: "bg-emerald-100 text-emerald-700" };
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
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg animate-slide-in">
          <Check className="w-5 h-5" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg animate-slide-in">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Gestão de Avaliações</h1>
                <p className="text-xs text-gray-500">Modere avaliações e gerencie penalidades</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ponto de Coleta
              </label>
              <select
                value={selectedPoint}
                onChange={(e) => setSelectedPoint(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {collectionPoints.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="normal">Normal</option>
                <option value="moderated">Moderada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estrelas</label>
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} {rating === 1 ? "estrela" : "estrelas"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por texto
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar na mensagem, ponto ou usuário..."
                  className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredReviews.length} {filteredReviews.length === 1 ? "avaliação encontrada" : "avaliações encontradas"}
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma avaliação encontrada</p>
              <p className="text-sm mt-1">Ajuste os filtros para ver mais resultados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ponto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avaliação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Penalidades
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReviews.map((review) => {
                    const penalty = getPenaltyStatus(review.user_penalty_points);
                    return (
                      <tr key={review.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(review.updated_at)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-gray-900 font-medium truncate max-w-xs">
                            {review.user_email}
                          </div>
                          <div className="text-gray-500 text-xs">ID: {review.user_id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="text-gray-900 font-medium truncate max-w-xs">
                            {review.point_name}
                          </div>
                          <div className="text-gray-500 text-xs">ID: {review.point_id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1 mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          {review.comment && (
                            <div className="text-gray-600 text-xs line-clamp-2 max-w-sm">
                              {review.comment}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {review.is_moderated ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                              <ShieldAlert className="w-3 h-3" />
                              Moderada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${penalty.color}`}
                          >
                            {review.user_penalty_points >= 3 && (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {penalty.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleEditClick(review)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                            Moderar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Edit/Moderate Modal */}
      {showEditModal && selectedReview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Moderar Avaliação</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedReview.is_moderated
                    ? "Esta avaliação já foi moderada anteriormente"
                    : "Ao salvar, o usuário receberá uma penalidade"}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Original Values (if moderated) */}
              {selectedReview.is_moderated && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 mb-2">Valores Originais</h4>
                      <div className="space-y-2 text-sm text-yellow-800">
                        <div>
                          <span className="font-medium">Estrelas originais:</span>{" "}
                          {selectedReview.original_rating || selectedReview.rating}
                        </div>
                        <div>
                          <span className="font-medium">Mensagem original:</span>
                          <p className="mt-1 text-yellow-700 italic">
                            {selectedReview.original_message || "Sem mensagem"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Informações do Usuário</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{selectedReview.user_email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Penalidades:</span>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full ${
                          getPenaltyStatus(selectedReview.user_penalty_points).color
                        }`}
                      >
                        {selectedReview.user_penalty_points >= 3 && (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {getPenaltyStatus(selectedReview.user_penalty_points).text}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Ponto de Coleta:</span>
                    <p className="font-medium text-gray-900">{selectedReview.point_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Data:</span>
                    <p className="font-medium text-gray-900">
                      {formatDate(selectedReview.updated_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Estrelas (1-5)
                </label>
                <div className="flex items-center gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setEditRating(i + 1)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          i < editRating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300 hover:text-gray-400"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-lg font-semibold text-gray-700">
                    {editRating} {editRating === 1 ? "estrela" : "estrelas"}
                  </span>
                </div>
              </div>

              {/* Edit Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  placeholder="Edite a mensagem da avaliação..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Warning */}
              {!selectedReview.is_moderated && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">Atenção!</p>
                      <p>
                        Ao moderar esta avaliação:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>O usuário receberá +1 penalidade ({selectedReview.user_penalty_points}/3 → {selectedReview.user_penalty_points + 1}/3)</li>
                        <li>A avaliação ficará marcada como "MODERADA" com badge vermelho</li>
                        <li>O usuário não poderá mais editar ou deletar esta avaliação</li>
                        {selectedReview.user_penalty_points + 1 >= 3 && (
                          <li className="font-bold">
                            O usuário será BLOQUEADO de avaliar pontos de coleta!
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModeration}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {selectedReview.is_moderated ? "Atualizar Moderação" : "Moderar Avaliação"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
