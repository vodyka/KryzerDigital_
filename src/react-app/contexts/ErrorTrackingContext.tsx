import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { generateCorrelationId } from "@/react-app/lib/correlation";

interface Breadcrumb {
  timestamp: number;
  type: "navigation" | "action" | "api" | "error";
  message: string;
  data?: any;
}

interface ErrorTrackingContextType {
  addBreadcrumb: (type: Breadcrumb["type"], message: string, data?: any) => void;
  getBreadcrumbs: () => Breadcrumb[];
  clearBreadcrumbs: () => void;
  getCorrelationId: () => string;
  generateNewCorrelationId: () => string;
}

const ErrorTrackingContext = createContext<ErrorTrackingContextType | undefined>(undefined);

const MAX_BREADCRUMBS = 50;

export function ErrorTrackingProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [correlationId, setCorrelationId] = useState<string>(() => {
    // Check if there's an existing correlation ID in session storage
    const existing = sessionStorage.getItem('correlation-id');
    if (existing) return existing;
    
    const newId = generateCorrelationId();
    sessionStorage.setItem('correlation-id', newId);
    return newId;
  });

  const addBreadcrumb = (type: Breadcrumb["type"], message: string, data?: any) => {
    const breadcrumb: Breadcrumb = {
      timestamp: Date.now(),
      type,
      message,
      data,
    };

    setBreadcrumbs(prev => {
      const updated = [...prev, breadcrumb];
      // Keep only last MAX_BREADCRUMBS
      if (updated.length > MAX_BREADCRUMBS) {
        return updated.slice(-MAX_BREADCRUMBS);
      }
      return updated;
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Breadcrumb ${type}]`, message, data);
    }
  };

  const getBreadcrumbs = () => breadcrumbs;

  const clearBreadcrumbs = () => {
    setBreadcrumbs([]);
  };

  const getCorrelationIdValue = () => correlationId;

  const generateNewCorrelationId = () => {
    const newId = generateCorrelationId();
    setCorrelationId(newId);
    sessionStorage.setItem('correlation-id', newId);
    return newId;
  };

  // Track route changes
  useEffect(() => {
    addBreadcrumb("navigation", `Rota: ${window.location.pathname}`);
  }, [window.location.pathname]);

  return (
    <ErrorTrackingContext.Provider
      value={{
        addBreadcrumb,
        getBreadcrumbs,
        clearBreadcrumbs,
        getCorrelationId: getCorrelationIdValue,
        generateNewCorrelationId,
      }}
    >
      {children}
    </ErrorTrackingContext.Provider>
  );
}

export function useErrorTracking() {
  const context = useContext(ErrorTrackingContext);
  if (!context) {
    throw new Error("useErrorTracking must be used within ErrorTrackingProvider");
  }
  return context;
}
