import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  type?: "confirm" | "alert" | "success" | "error";
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  type = "confirm",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case "alert":
        return <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      default:
        return <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case "success":
        return "bg-green-100 dark:bg-green-900/30";
      case "error":
        return "bg-red-100 dark:bg-red-900/30";
      case "alert":
        return "bg-blue-100 dark:bg-blue-900/30";
      default:
        return "bg-amber-100 dark:bg-amber-900/30";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4 p-6">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getIconBg()} flex items-center justify-center`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onCancel}>
            {type === "confirm" ? cancelText : "Fechar"}
          </Button>
          {type === "confirm" && onConfirm && (
            <Button onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
