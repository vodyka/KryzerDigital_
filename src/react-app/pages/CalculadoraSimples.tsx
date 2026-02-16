import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Calculator,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Percent,
  Lock,
} from "lucide-react";
import MentoriaHeader from "@/react-app/components/MentoriaHeader";
import Footer from "@/react-app/components/Footer";

interface CalculationInputs {
  custoProduto: number;
  custoFrete: number;
  comissaoPercent: number;
  impostoPercent: number;
  precoVenda: number;
}

interface CalculationResults {
  lucroLiquido: number;
  margemPercent: number;
  custoTotal: number;
}

export default function CalculadoraSimplesPage() {
  const navigate = useNavigate();

  const [inputs, setInputs] = useState<CalculationInputs>({
    custoProduto: 0,
    custoFrete: 4,
    comissaoPercent: 20,
    impostoPercent: 4,
    precoVenda: 0,
  });

  const [results, setResults] = useState<CalculationResults>({
    lucroLiquido: 0,
    margemPercent: 0,
    custoTotal: 0,
  });

  const calculate = useCallback(() => {
    const { custoProduto, custoFrete, comissaoPercent, impostoPercent, precoVenda } = inputs;

    if (precoVenda <= 0) {
      setResults({
        lucroLiquido: 0,
        margemPercent: 0,
        custoTotal: custoProduto + custoFrete,
      });
      return;
    }

    const comissaoRs = precoVenda * (comissaoPercent / 100);
    const impostoRs = precoVenda * (impostoPercent / 100);
    const custoTotal = custoProduto + custoFrete + comissaoRs + impostoRs;
    const lucroLiquido = precoVenda - custoTotal;
    const margemPercent = precoVenda > 0 ? (lucroLiquido / precoVenda) * 100 : 0;

    setResults({
      lucroLiquido,
      margemPercent,
      custoTotal,
    });
  }, [inputs]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleInputChange = (field: keyof CalculationInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setInputs({
      custoProduto: 0,
      custoFrete: 4,
      comissaoPercent: 20,
      impostoPercent: 4,
      precoVenda: 0,
    });
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

      <main className="container mx-auto px-4 lg:px-8 py-8" style={{ paddingTop: '140px' }}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: '#252525' }}>
              <span style={{ color: '#ffd432' }}>Calculadora Simples</span> de Marketplace
            </h1>
            <p className="text-xl text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Calcule o lucro líquido do seu produto rapidamente
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs Section */}
            <div className="space-y-6">
              {/* Custos */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Custos
                </h2>
                <div className="space-y-4">
                  <InputField
                    label="Custo do Produto"
                    value={inputs.custoProduto}
                    onChange={(v) => handleInputChange("custoProduto", v)}
                    prefix="R$"
                  />
                  <InputField
                    label="Custo de Frete"
                    value={inputs.custoFrete}
                    onChange={(v) => handleInputChange("custoFrete", v)}
                    prefix="R$"
                  />
                </div>
              </div>

              {/* Taxas */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Percent className="w-5 h-5 text-emerald-500" />
                  Taxas do Marketplace
                </h2>
                <div className="space-y-4">
                  <InputField
                    label="Comissão"
                    value={inputs.comissaoPercent}
                    onChange={(v) => handleInputChange("comissaoPercent", v)}
                    suffix="%"
                  />
                  <InputField
                    label="Imposto"
                    value={inputs.impostoPercent}
                    onChange={(v) => handleInputChange("impostoPercent", v)}
                    suffix="%"
                  />
                </div>
              </div>

              {/* Preço de Venda */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  Preço de Venda
                </h2>
                <InputField
                  label="Quanto você vai cobrar?"
                  value={inputs.precoVenda}
                  onChange={(v) => handleInputChange("precoVenda", v)}
                  prefix="R$"
                />
              </div>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-xl transition border border-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="font-medium">Limpar Campos</span>
              </button>
            </div>

            {/* Results Section */}
            <div className="space-y-6">
              {/* Main Result */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resultado
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-blue-100 mb-1">Lucro Líquido</p>
                    <p className={`text-4xl font-bold ${results.lucroLiquido >= 0 ? 'text-white' : 'text-red-300'}`}>
                      R$ {results.lucroLiquido.toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-100 mb-1">Margem</p>
                      <p className={`text-2xl font-bold ${results.margemPercent >= 0 ? 'text-white' : 'text-red-300'}`}>
                        {results.margemPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-100 mb-1">Custo Total</p>
                      <p className="text-2xl font-bold text-white">
                        R$ {results.custoTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA para versão completa */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-300 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Lock className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Quer recursos avançados?
                    </h3>
                    <p className="text-sm text-gray-700 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Na versão completa você tem:
                    </p>
                    <ul className="space-y-2 mb-4 text-sm text-gray-700">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                        Cálculo de ROAS de empate e ideal
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                        Múltiplos modos de cálculo (MLB, MLL, etc)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                        Custos operacionais variáveis
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                        Simulação de descontos
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></div>
                        Taxas dinâmicas por marketplace
                      </li>
                    </ul>
                    <button
                      onClick={handleRegisterClick}
                      className="w-full px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 rounded-xl font-bold transition shadow-lg"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Começar Grátis
                    </button>
                  </div>
                </div>
              </div>

              {/* Info adicional */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3">💡 Dica Profissional</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Uma margem saudável para marketplace é entre <strong>20% e 40%</strong>. Margens abaixo de 15% podem comprometer a sustentabilidade do seu negócio, especialmente quando há custos com ads e devoluções.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`w-full bg-gray-50 text-gray-900 border border-gray-300 rounded-lg py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
            prefix ? "pl-10" : "pl-3"
          } ${suffix ? "pr-10" : "pr-3"}`}
          placeholder="0"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
