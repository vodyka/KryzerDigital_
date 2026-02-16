import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { DollarSign, TrendingUp, Package, AlertCircle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Button } from "@/react-app/components/ui/button";
import { Progress } from "@/react-app/components/ui/progress";

type CalculatorMode = "unitario" | "percentual";

/* ===========================
   NOVO (somente para %)
=========================== */

const INPUT_BASE =
  "flex h-10 w-full rounded-md border px-3 py-2 text-base ring-offset-background " +
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parsePercentBR(value: string): number {
  if (!value) return 0;
  const v = value.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatBRLFromCents(cents: number) {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * ✅ Máscara BRL estável (sem bug de cursor/foco):
 * - Digita apenas números: 1 => 0,01 | 10 => 0,10 | 2999 => 29,99 | 12745080 => 127.450,80
 * - Se colar "1.234,56" também funciona (extrai dígitos)
 * - Mantém caret no final após formatar (sem perder foco)
 */
function useCurrencyInput(initialCents: number) {
  const [cents, setCents] = useState<number>(initialCents);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setCaretToEnd = () => {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      try {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      } catch {
        // ignore
      }
    });
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value ?? "";
    const digits = raw.replace(/\D/g, ""); // pega só números
    const next = digits ? Number(digits) : 0;
    if (!Number.isFinite(next)) return;
    setCents(next);
    setCaretToEnd();
  };

  const onFocus = () => setCaretToEnd();

  return {
    cents,
    setCents,
    display: formatBRLFromCents(cents),
    onChange,
    onFocus,
    inputRef,
  };
}

export default function PontoEquilibrioTab() {
  const [mode, setMode] = useState<CalculatorMode>("unitario");

  // =========================
  // UNITÁRIO (NÃO MEXER)
  // =========================
  const [custoFixo, setCustoFixo] = useState<string>("");
  const [precoVenda, setPrecoVenda] = useState<string>("");
  const [custoVariavel, setCustoVariavel] = useState<string>("");

  const [resultadoUnitario, setResultadoUnitario] = useState<{
    quantidadeEquilibrio: number;
    receitaEquilibrio: number;
    margemContribuicao: number;
  } | null>(null);

  const calcularPontoEquilibrioUnitario = () => {
    const fixo = parseFloat(custoFixo) || 0;
    const preco = parseFloat(precoVenda) || 0;
    const variavel = parseFloat(custoVariavel) || 0;

    if (preco <= 0 || preco <= variavel) {
      alert("O preço de venda deve ser maior que o custo variável");
      return;
    }

    const margemContribuicao = preco - variavel;
    const quantidadeEquilibrio = Math.ceil(fixo / margemContribuicao);
    const receitaEquilibrio = quantidadeEquilibrio * preco;

    setResultadoUnitario({
      quantidadeEquilibrio,
      receitaEquilibrio,
      margemContribuicao,
    });
  };

  const limparUnitario = () => {
    setCustoFixo("");
    setPrecoVenda("");
    setCustoVariavel("");
    setResultadoUnitario(null);
  };

  // =========================
  // PERCENTUAL (NOVO: layout + cálculo)
  // =========================
  const totalDespesas = useCurrencyInput(0);
  const faturamentoAtual = useCurrencyInput(0);
  const [margemContribuicaoPercent, setMargemContribuicaoPercent] = useState<string>("");

  const perc = useMemo(() => {
    const despesas = totalDespesas.cents / 100;
    const faturamento = faturamentoAtual.cents / 100;
    const margem = parsePercentBR(margemContribuicaoPercent);

    const valid = despesas >= 0 && margem > 0 && margem <= 100;

    if (!valid) {
      return {
        valid: false,
        mensagemErro:
          margem <= 0 || margem > 100 ? "A margem de contribuição deve estar entre 0 e 100%." : "",
        pontoEquilibrio: 0,
        progressoPercent: 0,
        faltaEquilibrio: 0,
        lucroAcima: 0,
        isAcima: false,
      };
    }

    const pontoEquilibrio = despesas / (margem / 100);
    const progressoPercent =
      pontoEquilibrio > 0 ? clamp((faturamento / pontoEquilibrio) * 100, 0, 100) : 0;

    const diff = faturamento - pontoEquilibrio;
    const isAcima = diff >= 0;

    return {
      valid: true,
      mensagemErro: "",
      pontoEquilibrio,
      progressoPercent,
      faltaEquilibrio: isAcima ? 0 : Math.abs(diff),
      lucroAcima: isAcima ? diff : 0,
      isAcima,
    };
  }, [totalDespesas.cents, faturamentoAtual.cents, margemContribuicaoPercent]);

  const isAcimaEquilibrio = perc.valid
    ? faturamentoAtual.cents / 100 >= perc.pontoEquilibrio
    : false;

  const prevIsAcimaRef = useRef<boolean>(isAcimaEquilibrio);
  const [pulse, setPulse] = useState<"none" | "green" | "red">("none");

  useEffect(() => {
    const prev = prevIsAcimaRef.current;
    if (perc.valid && prev !== isAcimaEquilibrio) {
      setPulse(isAcimaEquilibrio ? "green" : "red");
      const t = setTimeout(() => setPulse("none"), 650);
      prevIsAcimaRef.current = isAcimaEquilibrio;
      return () => clearTimeout(t);
    }
    prevIsAcimaRef.current = isAcimaEquilibrio;
  }, [isAcimaEquilibrio, perc.valid]);

  const limparPercentual = () => {
    totalDespesas.setCents(0);
    setMargemContribuicaoPercent("");
    faturamentoAtual.setCents(0);
  };

  return (
    <div className="space-y-6">
      {/* Keyframes locais (sem mexer no tailwind.config) */}
      <style>{`
        @keyframes pePulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); transform: translateY(0); }
          55% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.00); transform: translateY(-1px); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.00); transform: translateY(0); }
        }
        @keyframes pePulseRed {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45); transform: translateY(0); }
          55% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.00); transform: translateY(-1px); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.00); transform: translateY(0); }
        }
        .pe-pulse-green { animation: pePulseGreen 650ms ease-out; }
        .pe-pulse-red { animation: pePulseRed 650ms ease-out; }
      `}</style>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Calculadora de Ponto de Equilíbrio
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Escolha o método de cálculo que melhor se adequa ao seu negócio
        </p>
      </div>

      {/* Mode Selector (mantido) */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setMode("unitario")}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            mode === "unitario"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Package className="w-4 h-4 inline-block mr-2" />
          Cálculo Unitário
        </button>

        <button
          onClick={() => setMode("percentual")}
          className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
            mode === "percentual"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Target className="w-4 h-4 inline-block mr-2" />
          Cálculo por Margem %
        </button>
      </div>

      {/* ========================= UNITÁRIO (NÃO MEXER) ========================= */}
      {mode === "unitario" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Dados para Cálculo
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="custoFixo" className="text-sm font-medium">
                    Custos Fixos Totais (R$)
                  </Label>
                  <Input
                    id="custoFixo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={custoFixo}
                    onChange={(e) => setCustoFixo(e.target.value)}
                    placeholder="Ex: 10000.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Aluguel, salários, energia, etc. (valor mensal)
                  </p>
                </div>

                <div>
                  <Label htmlFor="precoVenda" className="text-sm font-medium">
                    Preço de Venda Unitário (R$)
                  </Label>
                  <Input
                    id="precoVenda"
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoVenda}
                    onChange={(e) => setPrecoVenda(e.target.value)}
                    placeholder="Ex: 50.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Preço pelo qual você vende cada unidade
                  </p>
                </div>

                <div>
                  <Label htmlFor="custoVariavel" className="text-sm font-medium">
                    Custo Variável Unitário (R$)
                  </Label>
                  <Input
                    id="custoVariavel"
                    type="number"
                    step="0.01"
                    min="0"
                    value={custoVariavel}
                    onChange={(e) => setCustoVariavel(e.target.value)}
                    placeholder="Ex: 20.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Custo de matéria-prima, embalagem, comissão por unidade
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={calcularPontoEquilibrioUnitario} className="flex-1">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Calcular
                  </Button>
                  <Button variant="outline" onClick={limparUnitario}>
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  Resultado
                </CardTitle>
              </CardHeader>

              <CardContent>
                {resultadoUnitario ? (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                        Ponto de Equilíbrio
                      </div>
                      <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {resultadoUnitario.quantidadeEquilibrio.toLocaleString("pt-BR")} unidades
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        Você precisa vender pelo menos{" "}
                        {resultadoUnitario.quantidadeEquilibrio.toLocaleString("pt-BR")} unidades para
                        cobrir todos os custos
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                        Receita no Ponto de Equilíbrio
                      </div>
                      <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                        R${" "}
                        {resultadoUnitario.receitaEquilibrio.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                        Faturamento necessário para atingir o equilíbrio
                      </p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">
                        Margem de Contribuição Unitária
                      </div>
                      <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                        R${" "}
                        {resultadoUnitario.margemContribuicao.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                        Quanto cada unidade vendida contribui para cobrir os custos fixos
                      </p>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800 dark:text-yellow-200">
                          <p className="font-semibold mb-1">Interpretação</p>
                          <ul className="space-y-1 list-disc ml-5">
                            <li>
                              Vendendo menos que {resultadoUnitario.quantidadeEquilibrio} unidades:
                              você terá prejuízo
                            </li>
                            <li>
                              Vendendo exatamente {resultadoUnitario.quantidadeEquilibrio} unidades:
                              você não terá lucro nem prejuízo
                            </li>
                            <li>
                              Vendendo mais que {resultadoUnitario.quantidadeEquilibrio} unidades:
                              você terá lucro
                            </li>
                            <li>
                              Cada unidade vendida acima do ponto de equilíbrio gera R${" "}
                              {resultadoUnitario.margemContribuicao.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}{" "}
                              de lucro
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Preencha os dados ao lado
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Insira os custos fixos, preço de venda e custo variável para calcular o ponto de
                      equilíbrio
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Formula Explanation */}
          <Card>
            <CardHeader>
              <CardTitle>Como Funciona o Cálculo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <p className="font-semibold mb-2">Fórmula do Ponto de Equilíbrio:</p>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg font-mono text-center">
                    PE = Custos Fixos ÷ (Preço de Venda - Custo Variável)
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Custos Fixos</h4>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Despesas que não variam com a quantidade produzida (aluguel, salários fixos,
                      seguros, etc.)
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Custos Variáveis
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Despesas que variam com cada unidade produzida (matéria-prima, embalagem,
                      comissões, etc.)
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      Margem de Contribuição
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      Diferença entre o preço de venda e o custo variável. Indica quanto cada venda
                      contribui para cobrir os custos fixos
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Exemplo Prático:</h4>
                  <p className="mb-2">Uma loja tem:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Custos Fixos mensais: R$ 10.000 (aluguel, salários, etc.)</li>
                    <li>Preço de Venda por produto: R$ 50</li>
                    <li>Custo Variável por produto: R$ 20 (produto + embalagem)</li>
                  </ul>

                  <p className="mt-3 font-mono bg-white dark:bg-gray-900 p-3 rounded">
                    PE = 10.000 ÷ (50 - 20) = 10.000 ÷ 30 = 333,33 ≈ <strong>334 unidades</strong>
                  </p>
                  <p className="mt-2">
                    A loja precisa vender <strong>334 produtos</strong> para cobrir todos os custos.
                    A partir da unidade 335, cada venda gera R$ 30 de lucro.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ========================= PERCENTUAL (NOVO + SEM BUG) ========================= */}
      {mode === "percentual" && (
        <div className="space-y-6">
          <Card className="bg-card/60 backdrop-blur border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-lg">Ponto de Equilíbrio</h3>
                  <p className="text-sm text-muted-foreground">Calcule seu break-even</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Total de Despesas</label>
                  <input
                    ref={totalDespesas.inputRef}
                    inputMode="numeric"
                    className={`${INPUT_BASE} bg-gray-100 text-gray-900 border-gray-200`}
                    placeholder="0,00"
                    value={totalDespesas.display}
                    onChange={totalDespesas.onChange}
                    onFocus={totalDespesas.onFocus}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite somente números (ex: 2999 → 29,99)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Margem de Contribuição (%)</label>
                  <div className="relative">
                    <input
                      className={`${INPUT_BASE} bg-gray-100 text-gray-900 border-gray-200 pr-8`}
                      placeholder="15"
                      value={margemContribuicaoPercent}
                      onChange={(e) => setMargemContribuicaoPercent(e.target.value)}
                      inputMode="decimal"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Faturamento Atual</label>
                  <input
                    ref={faturamentoAtual.inputRef}
                    inputMode="numeric"
                    className={`${INPUT_BASE} bg-gray-100 text-gray-900 border-gray-200`}
                    placeholder="0,00"
                    value={faturamentoAtual.display}
                    onChange={faturamentoAtual.onChange}
                    onFocus={faturamentoAtual.onFocus}
                  />
                </div>
              </div>

              {perc.mensagemErro ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5" />
                    <div>{perc.mensagemErro}</div>
                  </div>
                </div>
              ) : null}

              {/* Card do PE */}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Ponto de Equilíbrio</p>
                    <p className="text-4xl font-bold text-primary">
                      {perc.valid ? `R$ ${formatBRL(perc.pontoEquilibrio)}` : "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Você precisa faturar este valor para cobrir todas as despesas
                    </p>
                  </div>
                  <div className="p-4 rounded-full bg-primary/15">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>

              {/* Progresso */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Progresso para o Equilíbrio</p>
                  <p className="text-sm font-mono text-muted-foreground">
                    {perc.valid ? `${perc.progressoPercent.toFixed(1)}%` : "—"}
                  </p>
                </div>
                <Progress value={perc.valid ? perc.progressoPercent : 0} className="h-3" />
              </div>

              {/* Cards inferiores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {perc.valid && perc.isAcima ? (
                  <Card className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-900/10">
                    <CardContent className="p-5">
                      <p className="text-xs text-muted-foreground">Lucro Acima do Equilíbrio</p>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        R$ {formatBRL(perc.lucroAcima)}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-orange-200 bg-orange-50/70 dark:border-orange-900/40 dark:bg-orange-900/10">
                    <CardContent className="p-5">
                      <p className="text-xs text-muted-foreground">Falta para o Equilíbrio</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-300">
                        R$ {formatBRL(perc.valid ? perc.faltaEquilibrio : 0)}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Faturamento Atual: verde/vermelho + pulso ao cruzar */}
                <Card
                  className={[
                    "border transition-colors",
                    perc.valid
                      ? isAcimaEquilibrio
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-red-200 bg-red-50/70"
                      : "bg-secondary/30 border-border",
                    pulse === "green" ? "pe-pulse-green" : "",
                    pulse === "red" ? "pe-pulse-red" : "",
                  ].join(" ")}
                >
                  <CardContent className="p-5">
                    <p
                      className={[
                        "text-xs",
                        perc.valid
                          ? isAcimaEquilibrio
                            ? "text-emerald-700"
                            : "text-red-700"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      Faturamento Atual
                    </p>
                    <p
                      className={[
                        "text-2xl font-bold",
                        perc.valid
                          ? isAcimaEquilibrio
                            ? "text-emerald-800"
                            : "text-red-800"
                          : "",
                      ].join(" ")}
                    >
                      R$ {faturamentoAtual.display}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Fórmula */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Fórmula do Ponto de Equilíbrio:
                </p>
                <p className="font-mono text-sm">PE = Total Despesas ÷ (Margem de Contribuição ÷ 100)</p>
                {perc.valid ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    PE = R$ {totalDespesas.display} ÷{" "}
                    {(parsePercentBR(margemContribuicaoPercent) / 100).toFixed(4)} = R${" "}
                    {formatBRL(perc.pontoEquilibrio)}
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={limparPercentual}>
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como Funciona este Método</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  Este método calcula o ponto de equilíbrio baseado na{" "}
                  <strong>margem de contribuição percentual</strong> do seu negócio.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
