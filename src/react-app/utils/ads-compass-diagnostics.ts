/**
 * Ads Compass Diagnostic Engine
 * Implements GMV Max scenarios and heuristics for automatic diagnosis
 */

import type { CalculationResults } from "./ads-compass-calculator";

export interface DiagnosticInputs {
  // Calculation results
  results: CalculationResults;
  
  // Budget & targets
  roasTarget?: number;
  dailyBudget: number;
  hasMonthlyBudget: boolean;
  
  // Ad data
  impressions: number;
  clicks: number;
  itemsSold: number;
  
  // Operation events (for detecting manual interventions)
  recentEvents?: number;
}

export interface DiagnosticResult {
  scenario: 1 | 2 | 3 | 4;
  scenarioTitle: string;
  scenarioDescription: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  primaryIssues: string[];
  recommendations: string[];
  actionPlan: {
    immediate: string[];
    shortTerm: string[];
    monitoring: string[];
  };
}

/**
 * Apply metric-based heuristics (CTR, conversion, pricing)
 */
function applyMetricHeuristics(
  inputs: DiagnosticInputs,
  recommendations: string[],
  primaryIssues: string[]
): void {
  const { results, impressions, clicks, itemsSold } = inputs;
  
  // Calculate metrics
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const conversionRate = clicks > 0 ? (itemsSold / clicks) * 100 : 0;
  
  // Get price competitiveness data
  const comp = results.competitiveness;
  const pvMll15 = comp?.pvTargetMll15;
  
  // Price range analysis
  const minPrice = results.minPrice;
  const maxPrice = results.maxPrice;
  const avgPrice = minPrice !== undefined && maxPrice !== undefined && minPrice > 0 && maxPrice > 0 ? 
    (minPrice + maxPrice) / 2 : null;
  
  // Rule 1: CTR baixo por preço alto
  if (pvMll15 !== undefined && avgPrice !== null && pvMll15 > avgPrice && ctr < 3) {
    if (!recommendations.some(r => r.includes('perdendo CTR por conta do preço'))) {
      recommendations.push('Você está perdendo CTR por conta do preço acima da média.');
    }
  }
  
  // Rule 2: CTR baixo com preço competitivo (problema na capa)
  if (pvMll15 !== undefined && minPrice !== undefined && pvMll15 <= minPrice && ctr < 3) {
    if (!recommendations.some(r => r.includes('foto de capa'))) {
      recommendations.push('Preço competitivo, mas CTR baixo: sua foto de capa não está atrativa.');
    }
  }
  
  // Rule 3: Muitas impressões e poucos cliques (título/segmentação)
  if (impressions >= 10000 && ctr < 1.5) {
    if (!recommendations.some(r => r.includes('título e a segmentação'))) {
      recommendations.push('Muita visualização e pouco clique: revise o título e a segmentação; pode estar atraindo público errado.');
    }
  }
  
  // Rule 4: Muitos cliques e pouca conversão (página/objeções)
  if (clicks >= 200 && conversionRate < 2) {
    if (!recommendations.some(r => r.includes('quebra de objeções'))) {
      recommendations.push('Muitos cliques e pouca conversão: revise prazo, quebra de objeções, descrição e atendimento (respostas rápidas).');
    }
  }
  
  // Additional critical flags
  if (ctr < 1 && impressions > 1000) {
    if (!primaryIssues.some(i => i.includes('CTR muito baixo'))) {
      primaryIssues.push('CTR muito baixo: o anúncio não está atraindo cliques suficientes.');
    }
  }
  
  if (clicks >= 200 && conversionRate < 1) {
    if (!primaryIssues.some(i => i.includes('Conversão muito baixa'))) {
      primaryIssues.push('Conversão muito baixa: muita gente clica mas quase ninguém compra.');
    }
  }
}

/**
 * Main diagnostic function - analyzes ad performance and returns recommendations
 */
export function diagnoseAdPerformance(inputs: DiagnosticInputs): DiagnosticResult {
  const { results, roasTarget, itemsSold } = inputs;
  
  // Scenario detection logic based on GMV Max methodology
  const scenario = detectScenario(results, roasTarget, itemsSold);
  
  // Apply heuristics based on scenario
  switch (scenario) {
    case 1:
      return analyzeScenario1(inputs);
    case 2:
      return analyzeScenario2(inputs);
    case 3:
      return analyzeScenario3(inputs);
    case 4:
      return analyzeScenario4(inputs);
  }
}

/**
 * Detect which GMV Max scenario applies
 */
function detectScenario(
  results: CalculationResults,
  roasTarget: number | undefined,
  itemsSold: number
): 1 | 2 | 3 | 4 {
  const hasTarget = roasTarget !== undefined && roasTarget > 0;
  
  // Scenario 1: ROAS acima da meta E vendendo
  if (hasTarget && results.roas >= roasTarget && itemsSold > 0) {
    return 1;
  }
  
  // Scenario 2: ROAS abaixo da meta MAS vendendo
  if (hasTarget && results.roas < roasTarget && itemsSold > 0) {
    return 2;
  }
  
  // Scenario 3: Não vendendo
  if (itemsSold === 0 || results.roas === 0) {
    return 3;
  }
  
  // Scenario 4: Performance variável ou sem meta definida
  return 4;
}

/**
 * Scenario 1: ROAS > Meta AND Selling
 * This is the best scenario - maximize volume
 */
function analyzeScenario1(inputs: DiagnosticInputs): DiagnosticResult {
  const { results, dailyBudget, hasMonthlyBudget, roasTarget } = inputs;
  
  const primaryIssues: string[] = [];
  const recommendations: string[] = [];
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const monitoring: string[] = [];
  
  let status: DiagnosticResult['status'] = 'excellent';
  
  // Check MLL health
  if (results.mll < 15) {
    status = 'warning';
    primaryIssues.push(`MLL está em ${results.mll.toFixed(1)}% (abaixo de 15%)`);
    recommendations.push('Mesmo com ROAS acima da meta, a margem líquida está comprometida');
    immediate.push('Revisar estrutura de custos para melhorar MLL');
  } else {
    primaryIssues.push(`ROAS ${results.roas.toFixed(2)} está acima da meta ${roasTarget?.toFixed(2) || 'N/A'}`);
    primaryIssues.push(`MLL saudável em ${results.mll.toFixed(1)}%`);
  }
  
  // Main recommendation: increase budget to maximize sales
  const isUnlimited = !isFinite(dailyBudget);
  
  if (isUnlimited) {
    recommendations.push('📈 Orçamento ilimitado - maximize vendas mantendo ROAS acima da meta');
    immediate.push('Continuar escalando enquanto ROAS permanecer acima da meta');
    monitoring.push('Monitorar gastos totais vs. retorno');
  } else if (hasMonthlyBudget) {
    recommendations.push('📈 Situação ideal: aumente o orçamento para maximizar vendas');
    immediate.push(`Aumentar orçamento diário de R$ ${dailyBudget.toFixed(2)} gradualmente`);
    immediate.push('Monitorar se ROAS se mantém acima da meta com orçamento maior');
  } else {
    recommendations.push('⚠️ Orçamento mensal limitado - maximize dentro do disponível');
    shortTerm.push('Avaliar possibilidade de aumentar orçamento mensal');
  }
  
  // Competitiveness check
  if (results.competitiveness) {
    if (results.competitiveness.status === 'green') {
      recommendations.push('✅ Preço competitivo - mantenha a estratégia atual');
    } else if (results.competitiveness.status === 'yellow') {
      recommendations.push('⚠️ Preço acima da média - considere otimização de custos');
      shortTerm.push('Buscar redução de custos para manter competitividade');
    } else {
      status = 'warning';
      recommendations.push('🔴 Preço não competitivo - ação necessária');
      immediate.push('Urgente: reduzir custos ou aceitar margem menor');
    }
  }
  
  // CTR analysis
  const ctr = results.roas > 0 ? (inputs.clicks / inputs.impressions) * 100 : 0;
  if (ctr < 0.5) {
    recommendations.push('CTR baixo - considere melhorar criativos ou segmentação');
    shortTerm.push('Testar novos criativos e copy');
  }
  
  monitoring.push('Acompanhar ROAS diariamente para detectar mudanças');
  monitoring.push('Verificar se aumento de orçamento mantém performance');
  monitoring.push('Monitorar competitividade de preço semanalmente');
  
  // Apply metric-based heuristics
  applyMetricHeuristics(inputs, recommendations, primaryIssues);
  
  return {
    scenario: 1,
    scenarioTitle: '🎯 Cenário 1: ROAS Acima da Meta',
    scenarioDescription: 'Seu anúncio está performando acima das expectativas. Hora de escalar!',
    status,
    primaryIssues,
    recommendations,
    actionPlan: { immediate, shortTerm, monitoring },
  };
}

/**
 * Scenario 2: ROAS < Meta BUT Selling
 * Need optimization or cost reduction
 */
function analyzeScenario2(inputs: DiagnosticInputs): DiagnosticResult {
  const { results, roasTarget } = inputs;
  
  const primaryIssues: string[] = [];
  const recommendations: string[] = [];
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const monitoring: string[] = [];
  
  let status: DiagnosticResult['status'] = 'warning';
  
  const roasGap = roasTarget ? roasTarget - results.roas : 0;
  
  primaryIssues.push(`ROAS ${results.roas.toFixed(2)} está abaixo da meta ${roasTarget?.toFixed(2) || 'N/A'}`);
  primaryIssues.push(`Gap de ${roasGap.toFixed(2)} pontos no ROAS`);
  
  // Check if MLL is the main issue
  if (results.mll < 15) {
    status = 'critical';
    primaryIssues.push(`MLL crítica: ${results.mll.toFixed(1)}% (precisa ≥ 15%)`);
    recommendations.push('🚨 Problema estrutural de custos - ROAS não é o único problema');
    immediate.push('Reduzir custos fixos e/ou operacionais');
    immediate.push('Renegociar margens com fornecedores');
  } else {
    primaryIssues.push(`MLL aceitável: ${results.mll.toFixed(1)}%`);
  }
  
  // Main recommendations for improving ROAS
  recommendations.push('📊 Foco: melhorar eficiência do investimento em ads');
  
  // Price competitiveness
  if (results.competitiveness) {
    if (results.competitiveness.status === 'red') {
      status = 'critical';
      recommendations.push('🔴 Preço não competitivo é o principal problema');
      immediate.push('Reduzir preço ou custos urgentemente');
    } else if (results.competitiveness.status === 'yellow') {
      recommendations.push('⚠️ Preço acima da média afeta conversão');
      immediate.push('Otimizar custos para baixar preço');
    }
  }
  
  // Ad optimization suggestions
  const ctr = (inputs.clicks / inputs.impressions) * 100;
  const conversionRate = inputs.itemsSold / inputs.clicks;
  
  if (ctr < 0.5) {
    recommendations.push('CTR muito baixo - melhorar criativos e segmentação');
    immediate.push('Criar novos criativos mais atrativos');
    immediate.push('Refinar segmentação de público');
  }
  
  if (conversionRate < 0.05) {
    recommendations.push('Taxa de conversão baixa - otimizar página/oferta');
    shortTerm.push('Melhorar fotos e descrição do produto');
    shortTerm.push('Revisar preço vs. concorrência');
  }
  
  // Budget consideration
  const isUnlimited = !isFinite(inputs.dailyBudget);
  
  if (results.roas < (roasTarget || 0) * 0.7) {
    recommendations.push('⚠️ ROAS muito abaixo da meta - considere pausar e otimizar');
    if (!isUnlimited) {
      immediate.push('Reduzir orçamento enquanto otimiza');
    } else {
      immediate.push('Considere definir um orçamento diário limitado enquanto otimiza');
    }
  } else {
    if (!isUnlimited) {
      immediate.push('Manter orçamento atual enquanto otimiza');
    } else {
      immediate.push('Orçamento ilimitado - foque em otimizar eficiência');
    }
  }
  
  monitoring.push('Acompanhar ROAS após cada mudança');
  monitoring.push('Testar diferentes criativos (A/B test)');
  monitoring.push('Monitorar taxa de conversão diariamente');
  
  // Apply metric-based heuristics
  applyMetricHeuristics(inputs, recommendations, primaryIssues);
  
  return {
    scenario: 2,
    scenarioTitle: '⚠️ Cenário 2: ROAS Abaixo da Meta',
    scenarioDescription: 'Vendendo, mas com eficiência baixa. Otimização necessária.',
    status,
    primaryIssues,
    recommendations,
    actionPlan: { immediate, shortTerm, monitoring },
  };
}

/**
 * Scenario 3: Not Selling
 * Critical scenario - need immediate action
 */
function analyzeScenario3(inputs: DiagnosticInputs): DiagnosticResult {
  const { results, impressions, clicks } = inputs;
  
  const primaryIssues: string[] = [];
  const recommendations: string[] = [];
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const monitoring: string[] = [];
  
  const status: DiagnosticResult['status'] = 'critical';
  
  primaryIssues.push('🚨 Sem vendas no período analisado');
  
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  
  // Diagnostic tree for no sales
  if (impressions === 0) {
    primaryIssues.push('Sem impressões - anúncio não está sendo exibido');
    recommendations.push('🔴 Problema crítico de configuração ou aprovação');
    immediate.push('Verificar se anúncio foi aprovado pela Shopee');
    immediate.push('Verificar orçamento e lances');
    immediate.push('Checar se produto está ativo e em estoque');
  } else if (clicks === 0) {
    primaryIssues.push(`${impressions.toLocaleString()} impressões mas nenhum clique`);
    recommendations.push('🔴 Problema grave de atratividade do anúncio');
    immediate.push('Criar novos criativos urgentemente');
    immediate.push('Revisar título e imagem principal');
    immediate.push('Verificar se preço está visível e competitivo');
  } else if (ctr < 0.3) {
    primaryIssues.push(`CTR muito baixo: ${ctr.toFixed(2)}%`);
    recommendations.push('⚠️ Anúncio tem pouca atratividade');
    immediate.push('Melhorar qualidade das imagens');
    immediate.push('Revisar copy e título do anúncio');
  } else {
    primaryIssues.push(`${clicks} cliques mas sem conversão`);
    recommendations.push('🔴 Problema na página do produto ou preço');
    immediate.push('Revisar preço vs. concorrência');
    immediate.push('Melhorar fotos e descrição do produto');
    immediate.push('Verificar avaliações e reputação');
    immediate.push('Checar se há problemas técnicos na página');
  }
  
  // Price analysis if available
  if (results.competitiveness) {
    if (results.competitiveness.status === 'red') {
      recommendations.push('🔴 Preço muito alto é provavelmente o motivo');
      immediate.push(`Seu PV: R$ ${results.pvReal.toFixed(2)}`);
      immediate.push(`PV ideal: R$ ${results.competitiveness.pvTargetMll15.toFixed(2)}`);
    }
  }
  
  shortTerm.push('Analisar concorrentes diretos (preço, fotos, avaliações)');
  shortTerm.push('Considerar promoções ou cupons de desconto');
  
  monitoring.push('Acompanhar métricas diariamente após mudanças');
  monitoring.push('Definir meta mínima de conversão para continuar');
  
  // Apply metric-based heuristics
  applyMetricHeuristics(inputs, recommendations, primaryIssues);
  
  return {
    scenario: 3,
    scenarioTitle: '🚨 Cenário 3: Sem Vendas',
    scenarioDescription: 'Situação crítica. Ação imediata necessária para começar a vender.',
    status,
    primaryIssues,
    recommendations,
    actionPlan: { immediate, shortTerm, monitoring },
  };
}

/**
 * Scenario 4: Variable Performance or No Clear Target
 * Need to establish baseline and optimize
 */
function analyzeScenario4(inputs: DiagnosticInputs): DiagnosticResult {
  const { results, hasMonthlyBudget, impressions, clicks, itemsSold } = inputs;
  
  const primaryIssues: string[] = [];
  const recommendations: string[] = [];
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const monitoring: string[] = [];
  
  let status: DiagnosticResult['status'] = 'good';
  
  primaryIssues.push('Performance em análise - sem meta ROAS definida');
  
  // Analyze current performance
  if (results.mll >= 15) {
    primaryIssues.push(`✅ MLL saudável: ${results.mll.toFixed(1)}%`);
    recommendations.push('Margem lucrativa - foco em escalar vendas');
  } else if (results.mll >= 10) {
    status = 'warning';
    primaryIssues.push(`⚠️ MLL baixa: ${results.mll.toFixed(1)}%`);
    recommendations.push('Margem próxima do limite - cuidado ao escalar');
  } else {
    status = 'critical';
    primaryIssues.push(`🚨 MLL crítica: ${results.mll.toFixed(1)}%`);
    recommendations.push('Margem insustentável - reduzir custos urgentemente');
  }
  
  // ROAS analysis
  if (results.roas >= 10) {
    primaryIssues.push(`ROAS forte: ${results.roas.toFixed(2)}`);
  } else if (results.roas >= 5) {
    primaryIssues.push(`ROAS moderado: ${results.roas.toFixed(2)}`);
  } else {
    status = status === 'critical' ? 'critical' : 'warning';
    primaryIssues.push(`ROAS baixo: ${results.roas.toFixed(2)}`);
    recommendations.push('Eficiência de anúncios precisa melhorar');
  }
  
  // Main recommendations
  if (!inputs.roasTarget) {
    recommendations.push('📊 Defina uma meta de ROAS para melhor análise');
    immediate.push('Calcular ROAS mínimo: dividir 100 por ACOS máximo aceitável');
    immediate.push('Exemplo: se aceita 10% ACOS, meta ROAS = 100/10 = 10');
  }
  
  const ctr = (clicks / impressions) * 100;
  const conversionRate = clicks > 0 ? itemsSold / clicks : 0;
  
  // CTR analysis
  if (ctr < 0.5) {
    recommendations.push('CTR pode melhorar - otimizar criativos');
    shortTerm.push('Testar diferentes imagens e títulos');
  } else if (ctr >= 1.5) {
    recommendations.push('✅ CTR excelente - manter criativos atuais');
  }
  
  // Conversion analysis
  if (conversionRate < 0.03) {
    recommendations.push('Taxa de conversão baixa - otimizar página');
    shortTerm.push('Melhorar fotos, descrição e social proof');
  } else if (conversionRate >= 0.08) {
    recommendations.push('✅ Conversão boa - página bem otimizada');
  }
  
  // Budget strategy
  const isUnlimited = !isFinite(inputs.dailyBudget);
  
  if (isUnlimited) {
    if (status === 'good') {
      immediate.push('Orçamento ilimitado - continuar escalando com cautela');
    } else if (status === 'warning' || status === 'critical') {
      immediate.push('Considere limitar orçamento diário até melhorar margens');
    }
  } else if (hasMonthlyBudget) {
    if (status === 'good') {
      immediate.push('Considere aumentar orçamento gradualmente');
    }
  }
  
  monitoring.push('Estabelecer métricas de referência (baseline)');
  monitoring.push('Acompanhar tendências ao longo de 14 dias');
  monitoring.push('Documentar mudanças e seus impactos');
  
  // Apply metric-based heuristics
  applyMetricHeuristics(inputs, recommendations, primaryIssues);
  
  return {
    scenario: 4,
    scenarioTitle: '📊 Cenário 4: Performance Variável',
    scenarioDescription: 'Estabelecendo baseline e otimizando. Defina metas claras.',
    status,
    primaryIssues,
    recommendations,
    actionPlan: { immediate, shortTerm, monitoring },
  };
}
