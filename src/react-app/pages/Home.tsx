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

export default function Home() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard, otherwise to mentoria
  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/mentoria", { replace: true });
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

  return (
    <div className="min-h-screen">
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
