import { useState, useCallback } from "react";
import { useNotification } from "@/react-app/contexts/NotificationContext";
import { useErrorTracking } from "@/react-app/contexts/ErrorTrackingContext";
import { apiRequest } from "@/react-app/lib/apiClient";

interface UseApiRequestOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  showSuccessNotification?: boolean;
  showErrorNotification?: boolean;
  successMessage?: string;
}

export function useApiRequest<T = any>(
  options: UseApiRequestOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const notification = useNotification();
  const errorTracking = useErrorTracking();

  const execute = useCallback(
    async (url: string, requestOptions: RequestInit = {}) => {
      setLoading(true);
      setError(null);

      // Add breadcrumb
      errorTracking.addBreadcrumb(
        "api",
        `${requestOptions.method || 'GET'} ${url}`
      );

      try {
        const result = await apiRequest<T>(url, requestOptions);
        setData(result);

        if (options.showSuccessNotification && options.successMessage) {
          notification.success(options.successMessage);
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        return result;
      } catch (err: any) {
        setError(err);

        // Add error breadcrumb
        errorTracking.addBreadcrumb(
          "error",
          `API Error: ${err.message}`,
          {
            url,
            method: requestOptions.method || 'GET',
            status: err.status,
            correlationId: err.correlationId,
          }
        );

        if (options.showErrorNotification !== false) {
          const errorMessage = err.message || "Ocorreu um erro inesperado";
          notification.error(errorMessage, err.correlationId);
        }

        if (options.onError) {
          options.onError(err);
        }

        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options, notification, errorTracking]
  );

  return {
    execute,
    loading,
    error,
    data,
  };
}
