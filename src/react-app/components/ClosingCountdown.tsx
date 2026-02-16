import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface ClosingCountdownProps {
  closingTime: string | null; // HH:MM format
  isOpen: boolean;
  nextOpeningInfo: string | null;
}

export function ClosingCountdown({ closingTime, isOpen, nextOpeningInfo }: ClosingCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !closingTime) {
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const [closingHour, closingMinute] = closingTime.split(':').map(Number);
      
      const closing = new Date();
      closing.setHours(closingHour, closingMinute, 0, 0);
      
      const diff = closing.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Fechado');
        return;
      }
      
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (hours > 0) {
        setTimeRemaining(`Fecha em ${hours}h ${minutes}min ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`Fecha em ${minutes}min ${seconds}s`);
      } else {
        setTimeRemaining(`Fecha em ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [closingTime, isOpen]);

  if (!isOpen && nextOpeningInfo) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-[10px] font-medium">
        <Clock className="w-2.5 h-2.5" />
        {nextOpeningInfo}
      </span>
    );
  }

  if (!isOpen) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-[10px] font-medium">
        <Clock className="w-2.5 h-2.5" />
        Fechado
      </span>
    );
  }

  if (!timeRemaining) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-medium">
      <Clock className="w-2.5 h-2.5" />
      {timeRemaining}
    </span>
  );
}
