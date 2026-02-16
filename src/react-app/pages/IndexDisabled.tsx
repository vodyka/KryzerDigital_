import { useNavigate } from "react-router";
import { useEffect } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import Header from "@/react-app/components/Header";
import HeroSection from "@/react-app/components/HeroSection";
import ClientLogos from "@/react-app/components/ClientLogos";
import ThreeStepsSection from "@/react-app/components/ThreeStepsSection";
import RevolutionSection from "@/react-app/components/RevolutionSection";
import AboutSection from "@/react-app/components/AboutSection";
import RegisterSection from "@/react-app/components/RegisterSection";
import FAQSection from "@/react-app/components/FAQSection";
import Footer from "@/react-app/components/Footer";
import { Lock } from "lucide-react";

export default function IndexDisabled() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Block access - only admins can view this page
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not logged in - redirect to login
        navigate("/login", { replace: true });
      } else if (!user.is_admin) {
        // Logged in but not admin - redirect to dashboard
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate]);



  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  // Show loading state while checking auth
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

  // If not admin, show nothing (redirect will happen)
  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Admin Warning Banner */}
      <div className="bg-red-600 text-white py-2 px-4 text-center font-semibold flex items-center justify-center gap-2">
        <Lock className="w-4 h-4" />
        MODO ADMIN - Esta página está desabilitada para usuários normais
      </div>
      <Header onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />
      <HeroSection onRegisterClick={handleRegisterClick} />
      <ClientLogos />
      <ThreeStepsSection />
      <RevolutionSection />
      <AboutSection />
      <RegisterSection />
      <FAQSection />
      <Footer />
    </div>
  );
}
