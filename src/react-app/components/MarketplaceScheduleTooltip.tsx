import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

interface Schedule {
  day_of_week: number;
  opening_time: string | null;
  closing_time: string | null;
  is_closed: number;
}

interface MarketplaceScheduleTooltipProps {
  pointId: number;
  marketplaceId: number;
  marketplaceName: string;
  marketplaceLogo: string | null;
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function MarketplaceScheduleTooltip({ 
  pointId, 
  marketplaceId, 
  marketplaceName,
  marketplaceLogo 
}: MarketplaceScheduleTooltipProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isMarketplaceSpecific, setIsMarketplaceSpecific] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const fetchSchedules = async () => {
    if (hasLoaded) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/collection-points/${pointId}/schedules?marketplace_id=${marketplaceId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.schedules || []);
        setIsMarketplaceSpecific(data.is_marketplace_specific || false);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseEnter = () => {
    setIsVisible(true);
    fetchSchedules();
    
    // Calculate tooltip position
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
    }
  };

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
    }
  }, [isVisible]);

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const formatSchedule = (schedule: Schedule): string => {
    if (schedule.is_closed === 1 || !schedule.opening_time || !schedule.closing_time) {
      return "Fechado";
    }
    return `${schedule.opening_time} - ${schedule.closing_time}`;
  };

  return (
    <div 
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="w-6 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded flex items-center justify-center p-0.5 cursor-help"
      >
        {marketplaceLogo ? (
          <img
            src={marketplaceLogo}
            alt={marketplaceName}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-[6px] font-semibold text-gray-400">
            {marketplaceName.substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <div 
          className="fixed z-[9999] pointer-events-none" 
          style={{
            left: `${tooltipPosition.left}px`,
            top: `${tooltipPosition.top}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-2xl p-3 min-w-[200px] border border-gray-700">
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900 dark:border-t-gray-800" />
            </div>

            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-xs">{marketplaceName}</span>
            </div>

            {isLoading ? (
              <div className="text-[10px] text-gray-400 text-center py-2">
                Carregando...
              </div>
            ) : schedules.length > 0 ? (
              <div className="space-y-1">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.day_of_week}
                    className="flex items-center justify-between gap-3 text-[10px]"
                  >
                    <span className="text-gray-300 font-medium min-w-[28px]">
                      {DAY_NAMES[schedule.day_of_week]}
                    </span>
                    <span
                      className={
                        schedule.is_closed === 1 || !schedule.opening_time
                          ? "text-red-400"
                          : "text-emerald-400"
                      }
                    >
                      {formatSchedule(schedule)}
                    </span>
                  </div>
                ))}
                {isMarketplaceSpecific && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <span className="text-[9px] text-gray-400">
                      Horário específico para {marketplaceName}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-gray-400 text-center py-2">
                Sem horários cadastrados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
