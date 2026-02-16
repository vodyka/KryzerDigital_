import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Calculator,
  Info,
  DollarSign,
  Percent,
  Target,
  AlertCircle,
  CheckCircle,
  Activity,
  Truck,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

type ModoCalculo = "PV_ESTATICO" | "LL_ESTATICO" | "MLB_ESTATICA" | "MLL_DINAMICO";

interface CalculationInputs {
  custoProduto: number;
  custoOperacionalRs: number;
  custoOperacionalPercent: number;
  custoFixoFrete: number;
  comissaoPercent: number;
  impostoPercent: number;
  percentualEmitidoNota: number | null;

  modoCalculo: ModoCalculo;
  valorModo: number;

  roasAtual7d: number | null;
}

interface RoasRow {
  roas: number;
  adsRs: number;

  // Lucros (R$)
  lucroPlatformOnly: number; // somente comissão + frete fixo + custo produto + ads
  lucroFullCosts: number;    // comissão + frete fixo + custo produto + opRs + imposto + op% + ads

  // Margens (%)
  mlbPlatformOnly: number;   // lucro / PV
  mlbFullCosts: number;      // lucro / PV

  mllPlatformOnly: number;   // lucro / (PV - comissão - frete - ads)
  mllFullCosts: number;      // lucro / (PV - comissão - frete - opRs - imposto - op% - ads)

  variant: "danger" | "warning" | "success";
}

const MODOS_CALCULO = [
  { value: "PV_ESTATICO", label: "Preço de Venda Fixo", description: "Defina o preço final" },
  { value: "LL_ESTATICO", label: "Lucro Líquido Fixo", description: "Defina o lucro em R$" },
  { value: "MLB_ESTATICA", label: "Margem Bruta Fixa", description: "Defina a margem bruta %" },
  { value: "MLL_DINAMICO", label: "Margem Líquida Fixa", description: "Defina a margem líquida %" },
] as const;

function clampPercent(v: number) {
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

export default function RoasCalculatorPage() {

  const [inputs, setInputs] = useState<CalculationInputs>({
    custoProduto: 0,
    custoOperacionalRs: 0,
    custoOperacionalPercent: 0,
    custoFixoFrete: 0,
    comissaoPercent: 20,
    impostoPercent: 4,
    percentualEmitidoNota: 100,
    modoCalculo: "PV_ESTATICO",
    valorModo: 0,
    roasAtual7d: null,
  });

  const [PV, setPV] = useState(0);
  const [lucroBaseSemAds, setLucroBaseSemAds] = useState(0);
  const [mlbBaseSemAds, setMlbBaseSemAds] = useState(0);
  const [mllBaseSemAds, setMllBaseSemAds] = useState(0);

  const [roasTable, setRoasTable] = useState<RoasRow[]>([]);
  const [roasAtualInt, setRoasAtualInt] = useState<number | null>(null);

  const [selectedRoas, setSelectedRoas] = useState<number | null>(null);

  /**
   * Toggle:
   * - true  = ATIVADO  => "PLATAFORMA" (somente comissão + frete fixo + ads + custo produto)
   * - false = DESATIVADO => "COMPLETO" (inclui imposto + operacional R$ + operacional %)
   */
  const [modoPlataforma, setModoPlataforma] = useState(false);

  const calculate = useCallback(() => {
    const {
      custoProduto,
      custoOperacionalRs,
      custoOperacionalPercent,
      custoFixoFrete,
      comissaoPercent,
      impostoPercent,
      percentualEmitidoNota,
      modoCalculo,
      valorModo,
      roasAtual7d,
    } = inputs;

    const emitido = percentualEmitidoNota === null ? 100 : clampPercent(percentualEmitidoNota);
    const impostoEfetivoPercent = clampPercent(impostoPercent) * (emitido / 100);

    const comissaoP = clampPercent(comissaoPercent) / 100;
    const opPerc = clampPercent(custoOperacionalPercent) / 100;
    const impostoP = impostoEfetivoPercent / 100;

    const custosFixos = Math.max(0, custoProduto) + Math.max(0, custoOperacionalRs) + Math.max(0, custoFixoFrete);

    let calculatedPV = 0;

    // Cálculo do PV conforme modo
    switch (modoCalculo) {
      case "PV_ESTATICO":
        calculatedPV = valorModo;
        break;

      case "LL_ESTATICO": {
        // PV = (custosFixos + lucroDesejado) / (1 - (comissao + imposto + op%))
        const lucroDesejado = valorModo;
        const denom = 1 - (comissaoP + impostoP + opPerc);
        calculatedPV = denom > 0 ? (custosFixos + lucroDesejado) / denom : 0;
        break;
      }

      case "MLB_ESTATICA": {
        // MLB = lucro / PV
        // PV = custosFixos / (1 - (comissao+imposto+op%+mlbAlvo))
        const mlbAlvo = valorModo / 100;
        const denom = 1 - (comissaoP + impostoP + opPerc + mlbAlvo);
        calculatedPV = denom > 0 ? custosFixos / denom : 0;
        break;
      }

      case "MLL_DINAMICO": {
        // Solver numérico
        const mllAlvo = (valorModo || 0) / 100;

        let pv = Math.max(custosFixos * 2, 1);
        const maxIter = 120;
        const tol = 0.0001;

        for (let i = 0; i < maxIter; i++) {
          const comissaoRs = pv * comissaoP;
          const impostoRs = pv * impostoP;
          const opPercentRs = pv * opPerc;

          // Base "plataforma" = PV - comissão - frete fixo
          const baseLiquida = pv - comissaoRs - custoFixoFrete;
          if (baseLiquida <= 0) {
            pv += 1;
            continue;
          }

          const lucro =
            baseLiquida -
            custoProduto -
            custoOperacionalRs -
            impostoRs -
            opPercentRs;

          const mllAtual = lucro / baseLiquida;
          const erro = mllAtual - mllAlvo;

          if (Math.abs(erro) < tol) break;

          pv -= erro * pv * 0.7;
          if (!isFinite(pv) || pv <= 0) pv = Math.max(custosFixos * 2, 1);
          if (pv < custosFixos * 1.05) pv = custosFixos * 1.05;
        }

        calculatedPV = pv;
        break;
      }
    }

    if (calculatedPV <= 0 || !isFinite(calculatedPV)) {
      setPV(0);
      setLucroBaseSemAds(0);
      setMlbBaseSemAds(0);
      setMllBaseSemAds(0);
      setRoasTable([]);
      setRoasAtualInt(null);
      return;
    }

    setPV(calculatedPV);

    // ROAS atual inteiro
    if (roasAtual7d !== null && roasAtual7d > 0) setRoasAtualInt(Math.floor(roasAtual7d));
    else setRoasAtualInt(null);

    // Custos em R$
    const comissaoRs = calculatedPV * comissaoP;
    const impostoRs = calculatedPV * impostoP;
    const opPercentRs = calculatedPV * opPerc;

    // ===== Card azul (BASE sem Ads) =====
    // Lucro base (COMPLETO): PV - comissão - frete - custo produto - opRs - imposto - op%
    const lucroBase =
      calculatedPV -
      comissaoRs -
      custoFixoFrete -
      custoProduto -
      custoOperacionalRs -
      impostoRs -
      opPercentRs;

    setLucroBaseSemAds(lucroBase);

    // MLB base
    const mlbBase = calculatedPV > 0 ? (lucroBase / calculatedPV) * 100 : 0;
    setMlbBaseSemAds(mlbBase);

    // MLL base (COMPLETO) conforme seu exemplo:
    // denominador = PV - comissão - frete - imposto - operacionalRs - operacional%
    const baseLiquidaAntesProduto =
      calculatedPV -
      comissaoRs -
      custoFixoFrete -
      impostoRs -
      custoOperacionalRs -
      opPercentRs;

    const mllBase = baseLiquidaAntesProduto > 0 ? (lucroBase / baseLiquidaAntesProduto) * 100 : 0;
    setMllBaseSemAds(mllBase);

    // ===== Régua ROAS 1..30 =====
    const table: RoasRow[] = [];

    for (let roas = 1; roas <= 30; roas++) {
      const adsRs = calculatedPV / roas;

      // --- Plataforma (ATIVADO) ---
      const basePlat = calculatedPV - comissaoRs - custoFixoFrete;
      const lucroPlat = basePlat - custoProduto - adsRs;
      const denomMllPlat = basePlat - adsRs;
      const mllPlat = denomMllPlat > 0 ? (lucroPlat / denomMllPlat) * 100 : 0;
      const mlbPlat = calculatedPV > 0 ? (lucroPlat / calculatedPV) * 100 : 0;

      // --- Completo (DESATIVADO) ---
      const lucroFull = lucroBase - adsRs;
      const denomMllFull = baseLiquidaAntesProduto - adsRs;
      const mllFull = denomMllFull > 0 ? (lucroFull / denomMllFull) * 100 : 0;
      const mlbFull = calculatedPV > 0 ? (lucroFull / calculatedPV) * 100 : 0;

      // Variant baseado no modo plataforma (estável)
      let variant: "danger" | "warning" | "success" = "danger";
      if (lucroPlat < 0) variant = "danger";
      else if (mllPlat >= 15) variant = "success";
      else variant = "warning";

      table.push({
        roas,
        adsRs,
        lucroPlatformOnly: lucroPlat,
        lucroFullCosts: lucroFull,
        mlbPlatformOnly: mlbPlat,
        mlbFullCosts: mlbFull,
        mllPlatformOnly: mllPlat,
        mllFullCosts: mllFull,
        variant,
      });
    }

    setRoasTable(table);
  }, [inputs]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  const handleInputChange = (field: keyof CalculationInputs, value: number | string | null) => {
    setInputs((prev) => ({ ...prev, [field]: value as any }));
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

  const selectedRow = useMemo(() => {
    if (selectedRoas === null) return null;
    return roasTable.find((r) => r.roas === selectedRoas) || null;
  }, [selectedRoas, roasTable]);

  // Helpers para exibição conforme toggle
  const lucroRowToDisplay = (r: RoasRow) => (modoPlataforma ? r.lucroPlatformOnly : r.lucroFullCosts);
  const mlbRowToDisplay = (r: RoasRow) => (modoPlataforma ? r.mlbPlatformOnly : r.mlbFullCosts);
  const mllRowToDisplay = (r: RoasRow) => (modoPlataforma ? r.mllPlatformOnly : r.mllFullCosts);

  // Marcadores com base no modo atual
  const { roasEmpate, roasMinimo, roasIdeal } = useMemo(() => {
    let empate: number | null = null;
    let minimo: number | null = null;
    let ideal: number | null = null;

    for (const row of roasTable) {
      const lucro = lucroRowToDisplay(row);
      const mll = mllRowToDisplay(row);

      if (empate === null && lucro >= 0) empate = row.roas;
      if (minimo === null && mll >= 10) minimo = row.roas;
      if (ideal === null && mll >= 15) ideal = row.roas;
    }

    return { roasEmpate: empate, roasMinimo: minimo, roasIdeal: ideal };
  }, [roasTable, modoPlataforma]);

  const roasAtualTag = roasAtualInt;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#4338ca] to-[#020202] rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Calculadora ROAS</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Régua completa de ROAS 1-30</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Inputs */}
          <div className="lg:col-span-1 space-y-6">
            {/* Custos */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                Custos Diretos
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Custo do Produto"
                  value={inputs.custoProduto}
                  onChange={(v) => handleInputChange("custoProduto", v)}
                  prefix="R$"
                />
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
                  prefix="%"
                  tooltip="Calculado sobre o PV"
                />
              </div>
            </div>

            {/* Taxas e Comissões */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-emerald-500" />
                Taxas e Comissões
              </h2>
              <div className="space-y-4">
                <InputField
                  label="Comissão do Marketplace"
                  value={inputs.comissaoPercent}
                  onChange={(v) => handleInputChange("comissaoPercent", v)}
                  prefix="%"
                />
                <InputField
                  label="Custo Fixo / Frete"
                  value={inputs.custoFixoFrete}
                  onChange={(v) => handleInputChange("custoFixoFrete", v)}
                  prefix="R$"
                />
              </div>
            </div>

            {/* Imposto */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                Imposto
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    label="Imposto"
                    value={inputs.impostoPercent}
                    onChange={(v) => handleInputChange("impostoPercent", v)}
                    prefix="%"
                  />
                  <InputField
                    label="% Emitido na Nota"
                    value={inputs.percentualEmitidoNota}
                    onChange={(v) => handleInputChange("percentualEmitidoNota", v)}
                    prefix="%"
                    tooltip="Imposto efetivo = Imposto × (% emitido)"
                    placeholder="100%"
                    allowNull
                  />
                </div>
              </div>
            </div>

            {/* Modo de Cálculo */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500"
                        : "bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{modo.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{modo.description}</p>
                  </button>
                ))}
              </div>

              <InputField
                label={getValorModoLabel()}
                value={inputs.valorModo}
                onChange={(v) => handleInputChange("valorModo", v)}
                prefix={
                  inputs.modoCalculo === "PV_ESTATICO" || inputs.modoCalculo === "LL_ESTATICO" ? "R$" :
                  inputs.modoCalculo === "MLB_ESTATICA" || inputs.modoCalculo === "MLL_DINAMICO" ? "%" :
                  undefined
                }
              />
            </div>

            {/* ROAS Atual */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500" />
                Performance Atual
              </h2>
              <InputField
                label="ROAS Atual (últimos 7 dias)"
                value={inputs.roasAtual7d}
                onChange={(v) => handleInputChange("roasAtual7d", v)}
                tooltip="Seu ROAS atual será destacado na tabela"
                placeholder="Ex: 8.56"
                allowNull
              />
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Azul ou Laranja (mesma altura) */}
            {selectedRow === null ? (
              <div className="h-[280px] bg-gradient-to-br from-[#4338ca] to-[#020202] rounded-2xl p-6 text-white">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resultado (Base - Sem Ads)
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/10 rounded-xl">
                    <p className="text-sm text-white/80">Preço de Venda (PV)</p>
                    <p className="text-3xl font-bold text-white">R$ {PV.toFixed(2)}</p>
                  </div>

                  <div className="p-4 bg-white/10 rounded-xl">
                    <p className="text-sm text-white/80">Lucro Líquido</p>
                    <p className={`text-3xl font-bold ${lucroBaseSemAds >= 0 ? "text-white" : "text-red-300"}`}>
                      R$ {lucroBaseSemAds.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 bg-white/10 rounded-xl">
                    <p className="text-sm text-white/80">MLB %</p>
                    <p className="text-2xl font-bold text-white">{mlbBaseSemAds.toFixed(2)}%</p>
                  </div>

                  <div className="p-4 bg-white/10 rounded-xl">
                    <p className="text-sm text-white/80">MLL %</p>
                    <p className={`text-2xl font-bold ${mllBaseSemAds >= 0 ? "text-white" : "text-red-300"}`}>
                      {mllBaseSemAds.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[280px] bg-gradient-to-br from-orange-300 to-orange-500 dark:from-orange-400 dark:to-orange-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2 flex-shrink-0">
                    <Calculator className="w-5 h-5" />
                    Resultado (ROAS {selectedRow.roas})
                  </h2>
                  {/* Ads (R$) - expandido para a esquerda */}
                  <div className="flex-1 max-w-[374px] px-4 py-1.5 bg-white/10 rounded-lg">
                    <p className="text-[10px] text-orange-100">Ads (R$)</p>
                    <p className="text-base font-bold">R$ {selectedRow.adsRs.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <p className="text-xs text-orange-100">Preço de Venda (PV)</p>
                    <p className="text-2xl font-bold">R$ {PV.toFixed(2)}</p>
                  </div>

                  <div className="p-3 bg-white/10 rounded-xl">
                    <p className="text-xs text-orange-100">Lucro Líquido</p>
                    <p
                      className={`text-2xl font-bold ${
                        (modoPlataforma ? selectedRow.lucroPlatformOnly : selectedRow.lucroFullCosts) >= 0
                          ? "text-white"
                          : "text-red-200"
                      }`}
                    >
                      R$ {(modoPlataforma ? selectedRow.lucroPlatformOnly : selectedRow.lucroFullCosts).toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3 bg-white/10 rounded-xl">
                    <p className="text-xs text-orange-100">MLB %</p>
                    <p className="text-xl font-bold">{(modoPlataforma ? selectedRow.mlbPlatformOnly : selectedRow.mlbFullCosts).toFixed(2)}%</p>
                  </div>

                  <div className="p-3 bg-white/10 rounded-xl">
                    <p className="text-xs text-orange-100">MLL %</p>
                    <p className="text-xl font-bold">{(modoPlataforma ? selectedRow.mllPlatformOnly : selectedRow.mllFullCosts).toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Indicadores */}
            <div className="grid grid-cols-3 gap-4">
              <IndicatorCard
                title="ROAS Empate"
                color="yellow"
                icon={<AlertCircle className="w-4 h-4" />}
                value={roasEmpate}
                lucro={roasEmpate ? roasTable.find((r) => r.roas === roasEmpate) || null : null}
                modoPlataforma={modoPlataforma}
                tooltip="EMPATE = ROAS mínimo para NÃO ter prejuízo (com o modo selecionado)."
              />
              <IndicatorCard
                title="ROAS Mínimo"
                color="orange"
                icon={<Target className="w-4 h-4" />}
                value={roasMinimo}
                lucro={roasMinimo ? roasTable.find((r) => r.roas === roasMinimo) || null : null}
                modoPlataforma={modoPlataforma}
                tooltip="MÍNIMO = primeiro ROAS com MLL ≥ 10% (no modo selecionado)."
              />
              <IndicatorCard
                title="ROAS Ideal"
                color="emerald"
                icon={<CheckCircle className="w-4 h-4" />}
                value={roasIdeal}
                lucro={roasIdeal ? roasTable.find((r) => r.roas === roasIdeal) || null : null}
                modoPlataforma={modoPlataforma}
                tooltip="IDEAL = primeiro ROAS com MLL ≥ 15% (no modo selecionado)."
              />
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                    Régua de ROAS (1-30)
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Clique em um ROAS para ver o resumo no card laranja acima
                  </p>
                </div>

                <div className="flex items-center gap-3 relative" style={{ zIndex: 99999 }}>
                  <InfoTooltip text={"ATIVADO (Plataforma): considera só comissão + custo fixo + ads + custo do produto.\nDESATIVADO (Completo): inclui imposto + custos operacionais (R$ e %) além disso."} />
                  <ToggleSwitch
                    checked={modoPlataforma}
                    onChange={setModoPlataforma}
                    labelOn="ATIVADO"
                    labelOff="DESATIVADO"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        ROAS
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Ads (R$)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Lucro (R$)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        MLB (%)
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        MLL (%)
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {roasTable.map((row) => {
                      const isEmpate = row.roas === roasEmpate;
                      const isMinimo = row.roas === roasMinimo;
                      const isIdeal = row.roas === roasIdeal;
                      const isAtual = row.roas === roasAtualTag;
                      const isSelected = row.roas === selectedRoas;

                      const marcadores = [isEmpate, isMinimo, isIdeal].filter(Boolean).length;
                      const isPurple = marcadores >= 2;

                      const lucro = lucroRowToDisplay(row);
                      const mlb = mlbRowToDisplay(row);
                      const mll = mllRowToDisplay(row);

                      return (
                        <tr
                          key={row.roas}
                          onClick={() => setSelectedRoas(isSelected ? null : row.roas)}
                          className={`
                            ${isSelected ? "bg-blue-100 dark:bg-blue-900/30" :
                              isPurple ? "bg-purple-50/50 dark:bg-purple-900/10" :
                              row.variant === "danger" ? "bg-red-50/50 dark:bg-red-900/10" :
                              row.variant === "warning" ? "bg-yellow-50/50 dark:bg-yellow-900/10" :
                              "bg-emerald-50/50 dark:bg-emerald-900/10"}
                            ${(isEmpate || isMinimo || isIdeal) ? "ring-2 ring-inset" : ""}
                            ${isPurple ? "ring-purple-400 dark:ring-purple-500" :
                              isEmpate ? "ring-yellow-400 dark:ring-yellow-500" :
                              isMinimo ? "ring-orange-400 dark:ring-orange-500" :
                              isIdeal ? "ring-emerald-400 dark:ring-emerald-500" : ""}
                            hover:bg-gray-100/50 dark:hover:bg-gray-700/20 transition cursor-pointer
                          `}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* sempre o mesmo espaço para alinhar */}
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                ${isSelected ? "bg-blue-600 text-white" : "bg-transparent text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"}`}
                              >
                                {row.roas}
                              </span>

                              <div className="flex items-center gap-2 flex-wrap">
                                {isAtual && (
                                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full">
                                    ATUAL
                                  </span>
                                )}
                                {isEmpate && (
                                  <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold rounded-full">
                                    EMPATE
                                  </span>
                                )}
                                {isMinimo && (
                                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded-full">
                                    MÍNIMO
                                  </span>
                                )}
                                {isIdeal && (
                                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                                    IDEAL
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                            R$ {row.adsRs.toFixed(2)}
                          </td>

                          <td
                            className={`px-4 py-3 text-right text-sm font-medium ${
                              lucro >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            R$ {lucro.toFixed(2)}
                          </td>

                          <td className={`px-4 py-3 text-right text-sm font-medium ${mlb >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>
                            {mlb.toFixed(2)}%
                          </td>

                          <td className={`px-4 py-3 text-right text-sm font-medium ${mll >= 0 ? "text-gray-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>
                            {mll.toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legenda */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700"></div>
                  <span className="text-gray-700 dark:text-gray-300">Prejuízo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700"></div>
                  <span className="text-gray-700 dark:text-gray-300">Lucro Baixo (MLL &lt; 15%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700"></div>
                  <span className="text-gray-700 dark:text-gray-300">Lucro Saudável (MLL ≥ 15%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700"></div>
                  <span className="text-gray-700 dark:text-gray-300">Múltiplos marcadores</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IndicatorCard({
  title,
  value,
  tooltip,
  icon,
  color,
  lucro,
  modoPlataforma,
}: {
  title: string;
  value: number | null;
  tooltip: string;
  icon: React.ReactNode;
  color: "yellow" | "orange" | "emerald";
  lucro: RoasRow | null;
  modoPlataforma: boolean;
}) {
  const border =
    color === "yellow"
      ? "border-yellow-200 dark:border-yellow-700/50"
      : color === "orange"
        ? "border-orange-200 dark:border-orange-700/50"
        : "border-emerald-200 dark:border-emerald-700/50";

  const text =
    color === "yellow"
      ? "text-yellow-600 dark:text-yellow-400"
      : color === "orange"
        ? "text-orange-600 dark:text-orange-400"
        : "text-emerald-600 dark:text-emerald-400";

  const textStrong =
    color === "yellow"
      ? "text-yellow-700 dark:text-yellow-300"
      : color === "orange"
        ? "text-orange-700 dark:text-orange-300"
        : "text-emerald-700 dark:text-emerald-300";

  const lucroValue = lucro ? (modoPlataforma ? lucro.lucroPlatformOnly : lucro.lucroFullCosts) : null;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${border} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={text}>{icon}</span>
        <p className={`text-sm font-medium ${text} flex items-center gap-1`}>
          {title}
          <InfoTooltip text={tooltip} />
        </p>
      </div>
      <p className={`text-3xl font-bold ${textStrong}`}>{value ?? "∞"}</p>
      <p className={`text-xs ${text} mt-1`}>
        {value !== null && lucroValue !== null ? `Lucro: R$ ${lucroValue.toFixed(2)}` : "—"}
      </p>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 select-none"
      aria-pressed={checked}
    >
      <span className={`text-xs font-semibold ${checked ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600 dark:text-gray-300"}`}>
        {checked ? labelOn : labelOff}
      </span>

      <span
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition
          ${checked ? "bg-emerald-200 dark:bg-emerald-900/40" : "bg-gray-200 dark:bg-gray-700"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition
            ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </span>
    </button>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex" style={{ zIndex: 999999 }}>
      <Info className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
      <span
        className="
          fixed
          px-3 py-2 bg-gray-900 text-white text-xs rounded-lg
          opacity-0 group-hover:opacity-100 transition
          pointer-events-none
          max-w-xs whitespace-pre-line text-center shadow-lg
        "
        style={{ 
          zIndex: 999999,
          transform: 'translate(-50%, -100%)',
          marginTop: '-8px'
        }}
      >
        {text}
      </span>
    </span>
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
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
  placeholder?: string;
  allowNull?: boolean;
}) {
  const formatValue = (val: number | null): string => {
    if (val === null) return "";
    if (val < 1 && val > 0) {
      const str = val.toFixed(2);
      return str.startsWith("0") ? str : "0" + str;
    }
    return String(val);
  };

  return (
    <div>
      {label && (
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </label>
      )}

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
            {prefix}
          </span>
        )}

        <input
          type="number"
          step="0.01"
          min="0"
          value={formatValue(value)}
          onChange={(e) => {
            const val = e.target.value;
            if (allowNull && val === "") {
              onChange(null);
            } else {
              const numVal = parseFloat(val);
              // Bloqueia valores negativos
              if (!isNaN(numVal) && numVal >= 0) {
                onChange(numVal);
              } else if (isNaN(numVal)) {
                onChange(0);
              }
            }
          }}
          onKeyDown={(e) => {
            // Previne a digitação do sinal de menos
            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
              e.preventDefault();
            }
          }}
          className={`w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
            prefix ? "pl-10" : "pl-3"
          } pr-12 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          placeholder={placeholder || "0"}
          style={{
            MozAppearance: 'textfield',
          }}
        />

        {suffix && (
          <span className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
            {suffix}
          </span>
        )}

        {/* Custom spinner buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => {
              const newVal = (value || 0) + 0.01;
              onChange(parseFloat(newVal.toFixed(2)));
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
          >
            <ChevronUp className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              const newVal = Math.max(0, (value || 0) - 0.01);
              onChange(parseFloat(newVal.toFixed(2)));
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
          >
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
