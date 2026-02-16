import { useNavigate } from "react-router";
import MentoriaHeader from "@/react-app/components/MentoriaHeader";
import MentoriaHeroSection from "@/react-app/components/MentoriaHeroSection";
import ThreeStepsSection from "@/react-app/components/ThreeStepsSection";
import RevolutionSection from "@/react-app/components/RevolutionSection";
import FAQSection from "@/react-app/components/FAQSection";
import Footer from "@/react-app/components/Footer";

export default function MentoriaPage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  return (
    <div className="min-h-screen">
      <MentoriaHeader onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />
      <MentoriaHeroSection />
      
      {/* Benefícios Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
              O que você <span style={{ color: '#ffd432' }}>vai alcançar</span>
            </h2>
            <p className="text-xl text-center text-gray-600 mb-12" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Transforme sua operação com nossa mentoria especializada
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Benefit 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-[#ffd432] to-[#f6b201] rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
                  Análise de Performance
                </h3>
                <p className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Entenda seus números reais, identifique gargalos e descubra oportunidades de otimização baseadas em dados concretos.
                </p>
              </div>

              {/* Benefit 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-[#6BB577] to-[#4a9960] rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
                  Estratégia Estruturada
                </h3>
                <p className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Saia do operacional e crie processos escaláveis. Planejamento trimestral com metas claras e alcançáveis.
                </p>
              </div>

              {/* Benefit 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-[#4169E1] to-[#2948b3] rounded-xl flex items-center justify-center mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
                  Suporte Contínuo
                </h3>
                <p className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Reuniões semanais, grupo exclusivo e acesso direto aos consultores para resolver dúvidas em tempo real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ThreeStepsSection />
      <RevolutionSection />

      {/* Ferramentas Gratuitas Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
              <span style={{ color: '#ffd432' }}>Ferramentas Gratuitas</span> para você testar
            </h2>
            <p className="text-xl text-center text-gray-600 mb-12" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Experimente nossas ferramentas sem compromisso
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Tool 1 - Calculator */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 hover:shadow-xl transition-shadow border-2 border-blue-200">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="2" width="16" height="20" rx="2"/>
                      <line x1="8" y1="6" x2="16" y2="6"/>
                      <line x1="8" y1="10" x2="16" y2="10"/>
                      <line x1="8" y1="14" x2="16" y2="14"/>
                      <line x1="8" y1="18" x2="12" y2="18"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
                      Calculadora de Marketplace
                    </h3>
                    <p className="text-gray-700 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Calcule preços, margens e ROAS ideais para seus produtos. Entenda o impacto de cada custo no seu lucro final.
                    </p>
                    <a
                      href="/calculadora-simples"
                      className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Testar Calculadora →
                    </a>
                  </div>
                </div>
              </div>

              {/* Tool 2 - Collection Points */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 hover:shadow-xl transition-shadow border-2 border-green-200">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
                      Busca de Pontos de Coleta
                    </h3>
                    <p className="text-gray-700 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Encontre pontos de coleta próximos para envio e devolução de produtos dos principais marketplaces.
                    </p>
                    <a
                      href="/buscar-pontos-coleta"
                      className="inline-block px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Buscar Pontos →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQSection />
      <Footer />
    </div>
  );
}
