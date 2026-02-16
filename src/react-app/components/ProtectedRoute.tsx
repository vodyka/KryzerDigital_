import { Navigate } from "react-router";
import { useAuth } from "@/react-app/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  console.log("[ProtectedRoute] Checking auth - loading:", loading, "user:", user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log("[ProtectedRoute] No user found, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  console.log("[ProtectedRoute] User authenticated, rendering protected content");
  return <>{children}</>;
}
