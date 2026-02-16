import { useState, useEffect, useCallback } from "react";
import {
  Calculator,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Percent,
  Target,
  BarChart3,
  Info,
  Package,
} from "lucide-react";

type ModoCalculo = "PV_ESTATICO" | "LL_ESTATICO" | "MLB_ESTATICA" | "MLL_DINAMICO";
type ModoTaxas = "MANUAL" | "SHOPEE";

interface CalculationInputs {
  custoProduto: number;
  custoOperacionalRs: number;
  custoOperacionalPercent: number;
  custoFixoFrete: number;
  comissaoPercent: number;
  impostoPercent: number;
  percentualEmitidoNota: number | null;
  adsPercent: number;
  modoCalculo: ModoCalculo;
  valorModo: number;
  descontoPercent: number;
  modoTaxas: ModoTaxas;
}

interface CalculationResults {
  precoFinal: number;
  lucroLiquidoRs: number;
  mlbPercent: number;
  mllPercent: number;
  roasEmpate: number;
  roasIdeal: number;
  precoBaseParaDesconto: number;
  custoTotal: number;
  comissaoRs: number;
  impostoRs: number;
  adsRs: number;
  custoOperacionalPercentRs: number;
}

const MODOS_CALCULO = [
  { value: "PV_ESTATICO", label: "Preço de Venda Fixo", description: "Defina o preço final" },
  { value: "LL_ESTATICO", label: "Lucro Líquido Fixo", description: "Defina o lucro em R$" },
  { value: "MLB_ESTATICA", label: "Margem Bruta Fixa", description: "Defina a margem bruta %" },
  { value: "MLL_DINAMICO", label: "Margem Líquida Fixa", description: "Defina a margem líquida %" },
] as const;

const MARKETPLACES = [
  { 
    id: "MANUAL" as const,
    nome: "Manual",
    icon: "⚙️",
    comissao: 20,
    custoFixo: 0
  },
  {
    id: "SHOPEE" as const,
    nome: "Shopee",
    logo: "https://019c2e7d-2422-7044-84c7-e8b4f5bcbf85.mochausercontent.com/image.png_5261.png",
    comissao: 20,
    custoFixo: 4
  }
];

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<CalculationInputs>({
    custoProduto: 0,
    custoOperacionalRs: 0,
    custoOperacionalPercent: 0,
    custoFixoFrete: 0,
    comissaoPercent: 20,
    impostoPercent: 4,
    percentualEmitidoNota: 100,
    adsPercent: 5,
    modoCalculo: "PV_ESTATICO",
    valorModo: 0,
    descontoPercent: 0,
    modoTaxas: "MANUAL",
  });

  const [skuSearch, setSkuSearch] = useState("");
  const [productName, setProductName] = useState("");
  const [skuError, setSkuError] = useState("");
  const [loadingSku, setLoadingSku] = useState(false);

  const [results, setResults] = useState<CalculationResults>({
    precoFinal: 0,
    lucroLiquidoRs: 0,
    mlbPercent: 0,
    mllPercent: 0,
    roasEmpate: 0,
    roasIdeal: 0,
    precoBaseParaDesconto: 0,
    custoTotal: 0,
    comissaoRs: 0,
    impostoRs: 0,
    adsRs: 0,
    custoOperacionalPercentRs: 0,
  });

  useEffect(() => {
    if (inputs.modoTaxas === "SHOPEE" && results.precoFinal > 0) {
      let novaComissao = 20;
      let novoCustoFixo = 4;

      if (results.precoFinal >= 500) {
        novaComissao = 14;
        novoCustoFixo = 26;
      } else if (results.precoFinal >= 200) {
        novaComissao = 14;
        novoCustoFixo = 26;
      } else if (results.precoFinal >= 100) {
        novaComissao = 14;
        novoCustoFixo = 20;
      } else if (results.precoFinal >= 80) {
        novaComissao = 14;
        novoCustoFixo = 16;
      } else {
        novaComissao = 20;
        novoCustoFixo = 4;
      }

      if (inputs.comissaoPercent !== novaComissao || inputs.custoFixoFrete !== novoCustoFixo) {
        setInputs(prev => ({
          ...prev,
          comissaoPercent: novaComissao,
          custoFixoFrete: novoCustoFixo,
        }));
      }
    }
  }, [inputs.modoTaxas, results.precoFinal, inputs.comissaoPercent, inputs.custoFixoFrete]);

  const handleMarketplaceSelect = (marketplaceId: ModoTaxas) => {
    const marketplace = MARKETPLACES.find(m => m.id === marketplaceId);
    if (!marketplace) return;

    setInputs(prev => ({
      ...prev,
      modoTaxas: marketplaceId,
      comissaoPercent: marketplace.comissao,
      custoFixoFrete: marketplace.custoFixo,
    }));
  };

  const calculate = useCallback(() => {
    const {
      custoProduto,
      custoOperacionalRs,
      custoOperacionalPercent,
      custoFixoFrete,
      comissaoPercent,
      impostoPercent,
      percentualEmitidoNota,
      adsPercent,
      modoCalculo,
      valorModo,
      descontoPercent,
    } = inputs;

    const percentualEmitido = percentualEmitidoNota === null ? 100 : Math.max(0, Math.min(100, percentualEmitidoNota));
    const impostoEfetivoPercent = impostoPercent * (percentualEmitido / 100);
    const taxaPercentEfetiva = comissaoPercent + adsPercent + impostoEfetivoPercent;
    const taxa = taxaPercentEfetiva / 100;
    const opPerc = custoOperacionalPercent / 100;
    const custosFixos = custoProduto + custoOperacionalRs + custoFixoFrete;

    let PV = 0;

    switch (modoCalculo) {
      case "PV_ESTATICO":
        PV = valorModo;
        break;

      case "LL_ESTATICO": {
        const lucroDesejado = valorModo;
        const denominador = 1 - taxa - opPerc;
        PV = denominador > 0 ? (custosFixos + lucroDesejado) / denominador : 0;
        break;
      }

      case "MLB_ESTATICA": {
        const mlbAlvo = valorModo;
        const denominador = 1 - taxa - opPerc - (mlbAlvo / 100);
        PV = denominador > 0 ? custosFixos / denominador : 0;
        break;
      }

      case "MLL_DINAMICO": {
        const mllAlvo = valorModo / 100;
        let pvEstimado = custosFixos * 2;
        const maxIteracoes = 100;
        const tolerancia = 0.01;
        
        for (let i = 0; i < maxIteracoes; i++) {
          const comissaoRsEst = pvEstimado * (comissaoPercent / 100);
          const baseLiquidaEst = pvEstimado - comissaoRsEst - custoFixoFrete;
          
          if (baseLiquidaEst <= 0) {
            pvEstimado += 1;
            continue;
          }
          
          const impostoRsEst = pvEstimado * (impostoEfetivoPercent / 100);
          const adsRsEst = pvEstimado * (adsPercent / 100);
          const custoOpPercentRsEst = pvEstimado * opPerc;
          
          const llEst = baseLiquidaEst - custoProduto - custoOperacionalRs - impostoRsEst - adsRsEst - custoOpPercentRsEst;
          const mllAtual = llEst / baseLiquidaEst;
          
          const erro = mllAtual - mllAlvo;
          
          if (Math.abs(erro) < tolerancia / 100) {
            break;
          }
          
          const ajuste = erro * pvEstimado * 0.5;
          pvEstimado -= ajuste;
          
          if (pvEstimado < custosFixos) {
            pvEstimado = custosFixos * 1.1;
          }
        }
        
        PV = pvEstimado;
        break;
      }
    }

    if (PV <= 0 || !isFinite(PV)) {
      setResults({
        precoFinal: 0,
        lucroLiquidoRs: 0,
        mlbPercent: 0,
        mllPercent: 0,
        roasEmpate: 0,
        roasIdeal: adsPercent === 0 ? Infinity : 0,
        precoBaseParaDesconto: 0,
        custoTotal: custosFixos,
        comissaoRs: 0,
        impostoRs: 0,
        adsRs: 0,
        custoOperacionalPercentRs: 0,
      });
      return;
    }

    const comissaoRs = PV * (comissaoPercent / 100);
    const impostoRs = PV * (impostoEfetivoPercent / 100);
    const adsRs = PV * (adsPercent / 100);
    const custoOperacionalPercentRs = PV * opPerc;
    const lucroLiquidoRs = PV - comissaoRs - custoFixoFrete - custoProduto - custoOperacionalRs - impostoRs - adsRs - custoOperacionalPercentRs;
    const mlbPercent = PV > 0 ? (lucroLiquidoRs / PV) * 100 : 0;
    const baseLiquida = PV - comissaoRs - custoFixoFrete;
    const mllPercent = baseLiquida > 0 ? (lucroLiquidoRs / baseLiquida) * 100 : 0;
    const custoTotal = custoProduto + custoOperacionalRs + custoFixoFrete + custoOperacionalPercentRs;

    const roundUp = (num: number, decimals: number) => {
      const multiplicador = Math.pow(10, decimals);
      return Math.ceil(num * multiplicador) / multiplicador;
    };

    const base = (PV - comissaoRs - custoFixoFrete) - custoProduto - custoOperacionalRs - impostoRs - custoOperacionalPercentRs;
    const roasEmpate = base <= 0 ? 0 : roundUp(PV / base, 2);
    const den = base - lucroLiquidoRs;
    const roasIdeal = adsPercent === 0 ? Infinity : den <= 0 ? 0 : roundUp(PV / den, 2);
    const precoBaseParaDesconto = descontoPercent > 0 ? PV / (1 - descontoPercent / 100) : PV;

    setResults({
      precoFinal: PV,
      lucroLiquidoRs,
      mlbPercent,
      mllPercent,
      roasEmpate,
      roasIdeal,
      precoBaseParaDesconto,
      custoTotal,
      comissaoRs,
      impostoRs,
      adsRs,
      custoOperacionalPercentRs,
    });
  }, [inputs]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleInputChange = (field: keyof CalculationInputs, value: number | string | null) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setInputs({
      custoProduto: 0,
      custoOperacionalRs: 0,
      custoOperacionalPercent: 0,
      custoFixoFrete: 0,
      comissaoPercent: 20,
      impostoPercent: 4,
      percentualEmitidoNota: 100,
      adsPercent: 5,
      modoCalculo: "PV_ESTATICO",
      valorModo: 0,
      descontoPercent: 0,
      modoTaxas: "MANUAL",
    });
    setSkuSearch("");
    setProductName("");
    setSkuError("");
  };

  const searchProductBySku = async (sku: string) => {
    if (!sku.trim()) {
      setProductName("");
      setSkuError("");
      setInputs(prev => ({ ...prev, custoProduto: 0 }));
      return;
    }

    setLoadingSku(true);
    setSkuError("");
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/products?search=${encodeURIComponent(sku)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const product = data.products?.find((p: any) => 
          p.sku?.toUpperCase() === sku.toUpperCase()
        );
        
        if (product) {
          setProductName(product.name || "Produto sem nome");
          setInputs(prev => ({ ...prev, custoProduto: product.cost_price || 0 }));
          setSkuError("");
        } else {
          setProductName("");
          setSkuError("Produto não encontrado. Digite o custo manualmente.");
        }
      } else {
        setProductName("");
        setSkuError("Erro ao buscar produto. Digite o custo manualmente.");
      }
    } catch (error) {
      console.error("Error searching product:", error);
      setProductName("");
      setSkuError("Erro ao buscar produto. Digite o custo manualmente.");
    } finally {
      setLoadingSku(false);
    }
  };

  const getValorModoLabel = () => {
    switch (inputs.modoCalculo) {
      case "PV_ESTATICO":
        return "Preço de Venda (R$)";
      case "LL_ESTATICO":
        return "Lucro Líquido (R$)";
      case "MLB_ESTATICA":
        return "Margem Bruta (%)";
      case "MLL_DINAMICO":
        return "Margem Líquida (%)";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#4338ca] to-[#020202] rounded-xl flex items-center justify-center">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Calculadora de Marketplace</h1>
            <p className="text-xs text-muted-foreground">Calcule preços e margens em tempo real</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2.5 text-muted-foreground hover:bg-muted rounded-lg transition border border-border"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Limpar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs Section */}
          <div className="space-y-6">
            {/* Buscar Produto por SKU */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Buscar Produto
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    SKU do Produto
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={skuSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSkuSearch(value);
                        if (!value.trim()) {
                          setProductName("");
                          setSkuError("");
                          setInputs(prev => ({ ...prev, custoProduto: 0 }));
                        }
                      }}
                      onBlur={(e) => searchProductBySku(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          searchProductBySku(skuSearch);
                        }
                      }}
                      className="w-full bg-card text-foreground border border-border rounded-lg py-2.5 px-3 focus:ring-2 focus:ring-primary focus:border-transparent transition"
                      placeholder="Digite o SKU e pressione Enter"
                    />
                    {loadingSku && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {productName && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Produto Encontrado</p>
                    <p className="font-medium text-foreground">{productName}</p>
                  </div>
                )}
                
                {skuError && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{skuError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Custos */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Custos
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Custo do Produto"
                  value={inputs.custoProduto}
                  onChange={(v) => handleInputChange("custoProduto", v)}
                  prefix="R$"
                  disabled={!!skuSearch && !!productName}
                  tooltip={skuSearch && productName ? "Limpe o campo SKU para editar manualmente" : undefined}
                />
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="Custo Operacional (R$)"
                    value={inputs.custoOperacionalRs}
                    onChange={(v) => handleInputChange("custoOperacionalRs", v)}
                    prefix="R$"
                    tooltip="Embalagem, mão de obra, etc."
                  />
                  <InputField
                    label="Custo Operacional (%)"
                    value={inputs.custoOperacionalPercent}
                    onChange={(v) => handleInputChange("custoOperacionalPercent", v)}
                    suffix="%"
                    tooltip="Use esse campo caso pague % de comissão por venda para alguma agência ou consultoria."
                  />
                </div>
              </div>
            </div>

            {/* Taxas e Comissões */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-500" />
                Taxas e Comissões
              </h2>
              
              {/* Seletor de Marketplaces */}
              <div className="flex flex-wrap gap-2 mb-6">
                {MARKETPLACES.map((marketplace) => (
                  <button
                    key={marketplace.id}
                    onClick={() => handleMarketplaceSelect(marketplace.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition border ${
                      inputs.modoTaxas === marketplace.id
                        ? "bg-primary/10 border-primary text-foreground shadow-sm"
                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80 hover:border-border"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition ${
                      inputs.modoTaxas === marketplace.id
                        ? "bg-primary border-primary" 
                        : "bg-card border-border"
                    }`}>
                      {marketplace.logo ? (
                        <img src={marketplace.logo} alt={marketplace.nome} className="w-4 h-4" />
                      ) : (
                        <span className="text-base">{marketplace.icon}</span>
                      )}
                    </div>
                    <span className="font-medium text-sm">{marketplace.nome}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <InputField
                  label="Comissão do Marketplace"
                  value={inputs.comissaoPercent}
                  onChange={(v) => handleInputChange("comissaoPercent", v)}
                  suffix="%"
                  disabled={inputs.modoTaxas !== "MANUAL"}
                />
                <InputField
                  label="Custo Fixo / Frete"
                  value={inputs.custoFixoFrete}
                  onChange={(v) => handleInputChange("custoFixoFrete", v)}
                  prefix="R$"
                  disabled={inputs.modoTaxas !== "MANUAL"}
                />
                <InputField
                  label="Investimento em Ads"
                  value={inputs.adsPercent}
                  onChange={(v) => handleInputChange("adsPercent", v)}
                  suffix="%"
                />
              </div>
            </div>

            {/* Imposto */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-orange-500" />
                Imposto
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Imposto"
                  value={inputs.impostoPercent}
                  onChange={(v) => handleInputChange("impostoPercent", v)}
                  suffix="%"
                />
                <InputField
                  label="% Emitido na Nota"
                  value={inputs.percentualEmitidoNota}
                  onChange={(v) => handleInputChange("percentualEmitidoNota", v)}
                  suffix="%"
                  tooltip="Base do imposto será PV × (% emitido). Ex.: 10% = imposto sobre 10% do PV."
                  placeholder="Vazio = 100%"
                  allowNull
                />
              </div>
            </div>

            {/* Modo de Cálculo */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Modo de Cálculo
              </h2>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {MODOS_CALCULO.map((modo) => (
                  <button
                    key={modo.value}
                    onClick={() => handleInputChange("modoCalculo", modo.value)}
                    className={`p-3 rounded-xl text-left transition ${
                      inputs.modoCalculo === modo.value
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted border-2 border-transparent hover:bg-muted/80"
                    }`}
                  >
                    <p className="font-medium text-sm text-foreground">{modo.label}</p>
                    <p className="text-xs text-muted-foreground">{modo.description}</p>
                  </button>
                ))}
              </div>
              <InputField
                label={getValorModoLabel()}
                value={inputs.valorModo}
                onChange={(v) => handleInputChange("valorModo", v)}
                prefix={inputs.modoCalculo.includes("ESTATICO") && inputs.modoCalculo === "LL_ESTATICO" ? "R$" : inputs.modoCalculo === "PV_ESTATICO" ? "R$" : undefined}
                suffix={inputs.modoCalculo.includes("ESTATICA") || inputs.modoCalculo === "MLL_DINAMICO" ? "%" : undefined}
              />
              <div className="mt-4">
                <InputField
                  label="Desconto Promocional"
                  value={inputs.descontoPercent}
                  onChange={(v) => handleInputChange("descontoPercent", v)}
                  suffix="%"
                  tooltip="O preço base será calculado para atingir o preço final após este desconto"
                />
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {/* Main Results */}
            <div className="bg-gradient-to-br from-[#4338ca] to-[#020202] rounded-2xl p-6 text-white">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Resultado
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <ResultCard
                  label="Preço Final"
                  value={`R$ ${results.precoFinal.toFixed(2)}`}
                  highlight
                />
                <ResultCard
                  label="Lucro Líquido"
                  value={`R$ ${results.lucroLiquidoRs.toFixed(2)}`}
                  variant={results.lucroLiquidoRs >= 0 ? "success" : "danger"}
                />
                <ResultCard
                  label="MLB %"
                  value={`${results.mlbPercent.toFixed(1)}%`}
                  tooltip="Margem de Lucro Bruta"
                />
                <ResultCard
                  label="MLL %"
                  value={`${results.mllPercent.toFixed(1)}%`}
                  tooltip="Margem de Lucro Líquida"
                  variant={results.mllPercent >= 0 ? "success" : "danger"}
                />
              </div>
              {inputs.descontoPercent > 0 && (
                <div className="mt-4 p-3 bg-white/10 rounded-xl">
                  <p className="text-sm opacity-80">Preço Base (antes do desconto)</p>
                  <p className="text-2xl font-bold">R$ {results.precoBaseParaDesconto.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* ROAS */}
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Indicadores de Ads
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-xl">
                  <p className="text-sm text-orange-600 font-medium">ROAS de Empate</p>
                  <p className="text-2xl font-bold text-orange-700">{results.roasEmpate.toFixed(2)}</p>
                  <p className="text-xs text-orange-500 mt-1">Mínimo para não ter prejuízo</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-sm text-emerald-600 font-medium">ROAS Ideal</p>
                  <p className="text-2xl font-bold text-emerald-700">{results.roasIdeal === Infinity ? "∞" : results.roasIdeal.toFixed(2)}</p>
                  <p className="text-xs text-emerald-500 mt-1">Para margem saudável</p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-muted-foreground" />
                Detalhamento
              </h2>
              <div className="space-y-3">
                <BreakdownRow label="Custo Total" value={results.custoTotal} />
                {results.custoOperacionalPercentRs > 0 && (
                  <BreakdownRow 
                    label="  └ Custo Op. %" 
                    value={results.custoOperacionalPercentRs} 
                    percent={inputs.custoOperacionalPercent}
                  />
                )}
                <BreakdownRow label="Comissão" value={results.comissaoRs} percent={inputs.comissaoPercent} />
                <BreakdownRow 
                  label="Imposto" 
                  value={results.impostoRs} 
                  percent={inputs.impostoPercent * ((inputs.percentualEmitidoNota || 100) / 100)} 
                />
                <BreakdownRow label="Ads" value={results.adsRs} percent={inputs.adsPercent} />
                <div className="border-t border-border pt-3 mt-3">
                  <BreakdownRow label="Lucro Líquido" value={results.lucroLiquidoRs} highlight />
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  tooltip,
  placeholder,
  allowNull,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  placeholder?: string;
  allowNull?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-sm font-medium text-foreground mb-1">
        {label}
        {tooltip && (
          <span className="group relative">
            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none z-10 max-w-xs text-center">
              {tooltip}
            </span>
          </span>
        )}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value === null ? "" : value || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (allowNull && val === "") {
              onChange(null);
            } else {
              onChange(parseFloat(val) || 0);
            }
          }}
          disabled={disabled}
          className={`w-full bg-card text-foreground border border-border rounded-lg py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition ${
            prefix ? "pl-10" : "pl-3"
          } ${suffix ? "pr-10" : "pr-3"} ${disabled ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}
          placeholder={placeholder || "0"}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  label,
  value,
  highlight,
  variant,
  tooltip,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  variant?: "success" | "danger";
  tooltip?: string;
}) {
  return (
    <div className={`p-4 rounded-xl ${highlight ? "bg-white/20" : "bg-white/10"}`}>
      <p className="text-sm text-white/80 flex items-center gap-1">
        {label}
        {tooltip && (
          <span className="group relative">
            <Info className="w-3 h-3 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
              {tooltip}
            </span>
          </span>
        )}
      </p>
      <p
        className={`text-2xl font-bold ${
          variant === "success"
            ? "text-emerald-300"
            : variant === "danger"
            ? "text-red-300"
            : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BreakdownRow({
  label,
  value,
  percent,
  highlight,
}: {
  label: string;
  value: number;
  percent?: number;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${highlight ? "font-semibold" : ""}`}>
      <span className={highlight ? "text-foreground" : "text-muted-foreground"}>
        {label}
        {percent !== undefined && (
          <span className="text-muted-foreground/60 text-sm ml-1">({percent.toFixed(2)}%)</span>
        )}
      </span>
      <span
        className={`${
          highlight
            ? value >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
            : "text-foreground"
        }`}
      >
        R$ {value.toFixed(2)}
      </span>
    </div>
  );
}
