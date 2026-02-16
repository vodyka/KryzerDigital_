import { useState, useEffect } from "react";
import { MapPin, TrendingUp, Star, Navigation } from "lucide-react";
import { useNavigate } from "react-router";

interface TopPoint {
  id: number;
  name: string;
  photo_url: string | null;
  street: string;
  number: string;
  neighborhood: string;
  total_clicks: number;
  positive_reviews: number;
  total_reviews: number;
  positive_rate: number;
}

export function TopCollectionPointsCard() {
  const navigate = useNavigate();
  const [topPoints, setTopPoints] = useState<TopPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopPoints();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTopPoints, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTopPoints = async () => {
    try {
      const response = await fetch("/api/collection-points/top3");
      if (response.ok) {
        const data = await response.json();
        setTopPoints(data.top_points || []);
      }
    } catch (error) {
      console.error("Failed to fetch top points:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "from-yellow-400 to-yellow-600";
      case 2:
        return "from-gray-300 to-gray-500";
      case 3:
        return "from-orange-400 to-orange-600";
      default:
        return "from-blue-400 to-blue-600";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "🏆";
    }
  };

  if (loading) {
    return null;
  }

  if (topPoints.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top 3 Pontos de Coleta
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mais acessados e bem avaliados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {topPoints.map((point, index) => {
          const rank = index + 1;
          
          return (
            <div
              key={point.id}
              className="relative group flex flex-col"
            >
              {/* Rank Badge */}
              <div className={`absolute -left-2 -top-2 w-10 h-10 bg-gradient-to-br ${getRankColor(rank)} rounded-full flex items-center justify-center text-xl z-10 shadow-lg`}>
                {getRankIcon(rank)}
              </div>

              {/* Card */}
              <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-xl p-4 pl-10 border border-gray-200 dark:border-gray-600 hover:shadow-md transition">
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
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {point.name}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 truncate">
                      {point.street}, {point.number} - {point.neighborhood}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-blue-500" />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {point.total_clicks} {point.total_clicks === 1 ? 'acesso' : 'acessos'}
                        </span>
                      </div>
                      
                      {point.total_reviews > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {point.positive_rate.toFixed(0)}% positivas
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Link */}
      <button
        onClick={() => navigate("/collection-points/list")}
        className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition"
      >
        Ver todos os pontos →
      </button>
    </div>
  );
}
