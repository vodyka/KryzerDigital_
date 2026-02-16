import { createContext, useContext, useState, ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, Info, XCircle, Copy, Check } from "lucide-react";

type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  errorId?: string;
  showErrorId?: boolean;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType, errorId?: string) => void;
  success: (message: string) => void;
  error: (message: string, errorId?: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (message: string, type: NotificationType = "info", errorId?: string) => {
    const id = Math.random().toString(36).substring(7);
    const notification: Notification = { 
      id, 
      type, 
      message,
      errorId,
      showErrorId: type === "error" && !!errorId
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remove após 8 segundos para erros (mais tempo para copiar), 5 para outros
    const timeout = type === "error" ? 8000 : 5000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, timeout);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const contextValue: NotificationContextType = {
    showNotification,
    success: (message) => showNotification(message, "success"),
    error: (message, errorId) => showNotification(message, "error", errorId),
    warning: (message) => showNotification(message, "warning"),
    info: (message) => showNotification(message, "info"),
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

function NotificationToast({ 
  notification, 
  onClose 
}: { 
  notification: Notification;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colors = {
    success: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
    error: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200",
    warning: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200",
    info: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
  };

  const handleCopyErrorId = () => {
    if (notification.errorId) {
      navigator.clipboard.writeText(notification.errorId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      className={`
        pointer-events-auto
        min-w-[320px] max-w-md
        rounded-lg border shadow-lg
        p-4 pr-12
        animate-in slide-in-from-right
        ${colors[notification.type]}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {icons[notification.type]}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium leading-relaxed">
            {notification.message}
          </div>
          {notification.showErrorId && notification.errorId && (
            <div className="mt-2 pt-2 border-t border-current/20">
              <div className="text-xs opacity-75 mb-1">Código do Erro:</div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-black/10 dark:bg-white/10 px-2 py-1 rounded flex-1 truncate">
                  {notification.errorId}
                </code>
                <button
                  onClick={handleCopyErrorId}
                  className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                  title="Copiar código do erro"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
}
