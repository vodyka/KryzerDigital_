import { useState } from "react";
import { useNavigate } from "react-router";
import { Shield, CreditCard } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import MentoriaHeader from "@/react-app/components/MentoriaHeader";
import Footer from "@/react-app/components/Footer";

type BillingCycle = "monthly" | "annual";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  isPopular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "cristal",
    name: "Cristal",
    description: "Plano inicial para começar",
    monthlyPrice: 5.90,
    annualPrice: 4.72, // 20% desconto
  },
  {
    id: "topazio",
    name: "Topázio",
    description: "Para quem quer crescer",
    monthlyPrice: 14.90,
    annualPrice: 11.92, // 20% desconto
    isPopular: true,
  },
  {
    id: "safira",
    name: "Safira",
    description: "Recursos avançados",
    monthlyPrice: 24.90,
    annualPrice: 19.92, // 20% desconto
  },
  {
    id: "diamante",
    name: "Diamante",
    description: "Solução completa premium",
    monthlyPrice: 29.90,
    annualPrice: 23.92, // 20% desconto
  },
];

export default function PlansPage() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const calculateAnnualSavings = (monthlyPrice: number, annualPrice: number) => {
    const monthlyCost = monthlyPrice * 12;
    const annualCost = annualPrice * 12;
    return monthlyCost - annualCost;
  };

  const calculateSavingsPercentage = (monthlyPrice: number, annualPrice: number) => {
    return Math.round(((monthlyPrice - annualPrice) / monthlyPrice) * 100);
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MentoriaHeader onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <main className="container mx-auto px-4 lg:px-8 py-12" style={{ paddingTop: '140px' }}>
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Escolha o <span style={{ color: '#ffd432' }}>plano ideal</span> para você
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Potencialize suas vendas com análises inteligentes e ferramentas profissionais
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              billingCycle === "monthly"
                ? "bg-gray-900 text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
            }`}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
              billingCycle === "annual"
                ? "bg-gray-900 text-white shadow-lg"
                : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
            }`}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Anual
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
              Economize 20%
            </Badge>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-7xl mx-auto">
          {PLANS.map((plan) => {
            const price = billingCycle === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const originalPrice = billingCycle === "annual" ? plan.monthlyPrice : undefined;
            const annualSavings = calculateAnnualSavings(plan.monthlyPrice, plan.annualPrice);
            const savingsPercent = calculateSavingsPercentage(plan.monthlyPrice, plan.annualPrice);

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all ${
                  plan.isPopular
                    ? "border-[#ffd432] ring-4 ring-[#ffd432]/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Popular Badge */}
                {plan.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#ffd432] text-gray-900 hover:bg-[#f6b201] shadow-lg px-4 py-1 font-semibold">
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {plan.description}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        R$ {price.toFixed(2)}
                      </span>
                      <span className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>/mês</span>
                    </div>
                    {originalPrice && billingCycle === "annual" && (
                      <p className="text-sm text-gray-500 line-through" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        R$ {originalPrice.toFixed(2)}/mês
                      </p>
                    )}
                    {billingCycle === "annual" && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-700 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Economia de R$ {annualSavings.toFixed(2)}/ano ({savingsPercent}%)
                        </p>
                        <p className="text-xs text-emerald-600 mt-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Cobrado anualmente: R$ {(price * 12).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={handleRegisterClick}
                    className={`w-full ${
                      plan.isPopular
                        ? "bg-[#ffd432] hover:bg-[#f6b201] text-gray-900"
                        : "bg-gray-900 hover:bg-gray-800 text-white"
                    }`}
                    style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
                  >
                    Assinar Agora
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust Indicators */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-12 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-8 text-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Pagamento 100% seguro
                </p>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Processado via Stripe
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Cancele quando quiser
                </p>
                <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Sem compromisso
                </p>
              </div>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Sem taxas ocultas • Suporte dedicado • Garantia de 7 dias
          </p>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-[#ffd432] to-[#f6b201] rounded-2xl p-8 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Ainda tem dúvidas?
          </h2>
          <p className="text-lg text-gray-800 mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Fale com nossos especialistas e descubra qual plano é ideal para o seu negócio
          </p>
          <a
            href="https://wa.me/5562998868638"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-[#6BB577] hover:bg-[#4a9960] text-white rounded-xl font-bold transition shadow-lg"
            style={{ fontFamily: 'Poppins, sans-serif', fontSize: '18px' }}
          >
            Falar no WhatsApp
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
