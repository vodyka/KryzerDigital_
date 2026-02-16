import { useState } from "react";
import {
  FileText,
  ArrowUp,
  ArrowDown,
  Percent,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";

export default function DREPage() {
  const [periodo, setPeriodo] = useState("mes-atual");
  const [periodoLabel, setPeriodoLabel] = useState("Mês Atual");

  const getDreDataPorPeriodo = (periodoSelecionado: string) => {
    const multiplicadores: Record<string, number> = {
      "mes-atual": 1,
      "mes-anterior": 0.85,
      "trimestre": 3,
      "semestre": 6,
      "ano": 12,
      "personalizado": 1,
    };

    const multiplicador = multiplicadores[periodoSelecionado] || 1;
    const baseReceitaBruta = 850000;

    const receitaBruta = baseReceitaBruta * multiplicador;
    const deducoes = receitaBruta * 0.1;
    const receitaLiquida = receitaBruta - deducoes;
    const cmc = receitaLiquida * 0.5;
    const lucroBruto = receitaLiquida - cmc;
    const despesasAdministrativas = receitaLiquida * 0.125;
    const despesasComerciais = receitaLiquida * 0.075;
    const despesasFinanceiras = receitaLiquida * 0.05;
    const receitasFinanceiras = receitaLiquida * 0.025;
    const despesasOperacionais = despesasAdministrativas + despesasComerciais + despesasFinanceiras - receitasFinanceiras;
    const lucroOperacional = lucroBruto - despesasOperacionais;
    const impostos = lucroOperacional * 0.3;
    const lucroLiquido = lucroOperacional - impostos;

    return {
      receitaBruta,
      deducoes,
      receitaLiquida,
      cmc,
      lucroBruto,
      despesasOperacionais,
      despesasAdministrativas,
      despesasComerciais,
      despesasFinanceiras,
      receitasFinanceiras,
      lucroOperacional,
      lucroAntesImposto: lucroOperacional,
      impostos,
      lucroLiquido,
    };
  };

  const dreData = getDreDataPorPeriodo(periodo);

  const margemBruta = ((dreData.lucroBruto / dreData.receitaLiquida) * 100).toFixed(1);
  const margemOperacional = ((dreData.lucroOperacional / dreData.receitaLiquida) * 100).toFixed(1);
  const margemLiquida = ((dreData.lucroLiquido / dreData.receitaLiquida) * 100).toFixed(1);

  const handlePeriodoChange = (novoPeriodo: string) => {
    setPeriodo(novoPeriodo);
    
    const labels: Record<string, string> = {
      "mes-atual": "Mês Atual",
      "mes-anterior": "Mês Anterior",
      "trimestre": "Trimestre",
      "semestre": "Semestre",
      "ano": "Ano",
      "personalizado": "Personalizado",
    };
    
    setPeriodoLabel(labels[novoPeriodo] || "Período");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Demonstrativo de Resultado do Exercício
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {periodoLabel} - Análise detalhada dos resultados financeiros
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={periodoLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes-atual">Mês atual</SelectItem>
              <SelectItem value="mes-anterior">Mês anterior</SelectItem>
              <SelectItem value="trimestre">Trimestre (3 meses)</SelectItem>
              <SelectItem value="semestre">Semestre (6 meses)</SelectItem>
              <SelectItem value="ano">Ano (12 meses)</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Margem Bruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {margemBruta}%
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Percent className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Margem Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {margemOperacional}%
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Margem Líquida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {margemLiquida}%
              </div>
              <div className="p-2 bg-violet-100 dark:bg-violet-900/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Demonstrativo Detalhado - {periodoLabel}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {periodo === "ano" ? "12 meses" : 
               periodo === "semestre" ? "6 meses" : 
               periodo === "trimestre" ? "3 meses" : 
               periodo === "mes-anterior" ? "Mês passado" : "Mês corrente"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b-2 border-gray-900 dark:border-white">
              <div className="flex items-center gap-2">
                <ArrowUp className="w-5 h-5 text-green-600" />
                <span className="font-bold text-lg">Receita Bruta</span>
              </div>
              <span className="font-bold text-lg text-green-600">
                {formatCurrency(dreData.receitaBruta)}
              </span>
            </div>

            <div className="flex justify-between pl-8 text-gray-600 dark:text-gray-400">
              <span>(−) Deduções e abatimentos</span>
              <span className="text-red-600">({formatCurrency(dreData.deducoes)})</span>
            </div>

            <div className="flex justify-between font-semibold border-t pt-2">
              <span>(=) Receita Líquida</span>
              <span>{formatCurrency(dreData.receitaLiquida)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>(−) Custo da Mercadoria Vendida (CMV)</span>
              <span className="text-red-600">({formatCurrency(dreData.cmc)})</span>
            </div>

            <div className="flex justify-between font-semibold text-green-600 border-t pt-2">
              <span>(=) Lucro Bruto</span>
              <span>{formatCurrency(dreData.lucroBruto)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b-2 border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <ArrowDown className="w-5 h-5 text-red-600" />
                <span className="font-bold">Despesas Operacionais</span>
              </div>
              <span className="font-bold text-red-600">
                ({formatCurrency(dreData.despesasOperacionais)})
              </span>
            </div>

            <div className="flex justify-between pl-8 text-gray-600 dark:text-gray-400">
              <span>Despesas Administrativas</span>
              <span className="text-red-600">({formatCurrency(dreData.despesasAdministrativas)})</span>
            </div>

            <div className="flex justify-between pl-8 text-gray-600 dark:text-gray-400">
              <span>Despesas Comerciais</span>
              <span className="text-red-600">({formatCurrency(dreData.despesasComerciais)})</span>
            </div>

            <div className="flex justify-between pl-8 text-gray-600 dark:text-gray-400">
              <span>Despesas Financeiras</span>
              <span className="text-red-600">({formatCurrency(dreData.despesasFinanceiras)})</span>
            </div>

            <div className="flex justify-between pl-8 text-gray-600 dark:text-gray-400">
              <span>(+) Receitas Financeiras</span>
              <span className="text-green-600">{formatCurrency(dreData.receitasFinanceiras)}</span>
            </div>

            <div className="flex justify-between font-semibold text-blue-600 border-t pt-2">
              <span>(=) Lucro Operacional</span>
              <span>{formatCurrency(dreData.lucroOperacional)}</span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t-2">
            <div className="flex justify-between">
              <span>(−) Impostos sobre o lucro</span>
              <span className="text-red-600">({formatCurrency(dreData.impostos)})</span>
            </div>

            <div className="flex items-center justify-between py-3 bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 rounded-lg px-4 border-2 border-violet-200 dark:border-violet-700">
              <span className="font-bold text-xl">(=) Lucro Líquido</span>
              <span className="font-bold text-2xl text-violet-600 dark:text-violet-400">
                {formatCurrency(dreData.lucroLiquido)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
