/**
 * Ads Compass Calculator Engine
 * Implements all calculations for GMV Max analysis
 */

export interface CalculationInputs {
  // Ad Data
  gmv: number;
  itemsSold: number;
  investment: number;
  
  // Costs
  productCost: number;
  taxPercent: number;
  emittedPercent: number;
  operationalCost: number;
  commissionPercent: number;
  fixedCostPerItem: number;
  
  // Price Range (Competition)
  minPrice?: number;
  maxPrice?: number;
}

export interface CalculationResults {
  // Basic metrics
  pvReal: number;
  adsPerItem: number;
  
  // Cost breakdown
  effectiveTaxPercent: number;
  commissionRs: number;
  taxRs: number;
  
  // Profit metrics
  profitPerItem: number;
  mlb: number; // Margem Líquida Bruta (%)
  mll: number; // Margem Líquida Líquida (%)
  
  // Ad metrics
  roas: number;
  acos: number;
  tacos: number;
  
  // Price range (for heuristics)
  minPrice?: number;
  maxPrice?: number;
  
  // Competitiveness analysis
  competitiveness?: {
    pvTargetMll15: number;
    status: 'green' | 'yellow' | 'red';
    message: string;
    suggestions: string[];
  };
}

/**
 * Calculate all metrics based on inputs
 */
export function calculateMetrics(inputs: CalculationInputs): CalculationResults {
  const {
    gmv,
    itemsSold,
    investment,
    productCost,
    taxPercent,
    emittedPercent,
    operationalCost,
    commissionPercent,
    fixedCostPerItem,
    minPrice,
    maxPrice,
  } = inputs;
  
  // Prevent division by zero
  if (itemsSold === 0) {
    throw new Error("Itens vendidos não pode ser 0");
  }
  
  // Basic calculations
  const pvReal = gmv / itemsSold;
  const adsPerItem = investment / itemsSold;
  
  // Cost calculations
  const effectiveTaxPercent = (taxPercent * emittedPercent) / 100;
  const commissionRs = pvReal * (commissionPercent / 100);
  const taxRs = pvReal * (effectiveTaxPercent / 100);
  
  // Profit calculation (including ads)
  const profitPerItem = 
    pvReal -
    commissionRs -
    taxRs -
    fixedCostPerItem -
    productCost -
    operationalCost -
    adsPerItem;
  
  // MLB (Margem Líquida Bruta) = lucro / preço de venda
  const mlb = (profitPerItem / pvReal) * 100;
  
  // Base for MLL (before product cost)
  const baseMll = 
    pvReal -
    commissionRs -
    taxRs -
    fixedCostPerItem -
    operationalCost -
    adsPerItem;
  
  // MLL (Margem Líquida Líquida) = lucro / base antes do produto
  const mll = baseMll > 0 ? (profitPerItem / baseMll) * 100 : 0;
  
  // Ad metrics
  const roas = investment > 0 ? gmv / investment : 0;
  const acos = gmv > 0 ? (investment / gmv) * 100 : 0;
  const tacos = acos; // In this context, TACOS = ACOS (single campaign analysis)
  
  // Competitiveness analysis (if price range provided)
  let competitiveness: CalculationResults['competitiveness'] | undefined;
  
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > 0 && maxPrice > 0) {
    const avgPrice = (minPrice + maxPrice) / 2;
    
    // Solve for PV that gives MLL = 15%
    const pvTargetMll15 = solvePvForTargetMll(
      15, // target MLL
      productCost,
      taxPercent,
      emittedPercent,
      operationalCost,
      commissionPercent,
      fixedCostPerItem,
      adsPerItem
    );
    
    // Determine competitive status
    let status: 'green' | 'yellow' | 'red';
    let message: string;
    const suggestions: string[] = [];
    
    if (pvTargetMll15 <= minPrice) {
      status = 'green';
      message = 'Preço competitivo (MLL ≥ 15% mesmo no menor preço)';
    } else if (pvTargetMll15 <= avgPrice) {
      status = 'green';
      message = 'Preço competitivo dentro da média do mercado';
    } else if (pvTargetMll15 <= maxPrice) {
      status = 'yellow';
      message = 'Atenção: acima da média para manter MLL ≥ 15%';
      suggestions.push(`Para ficar competitivo na média, reduza custos ou aceite MLL menor que 15%`);
      suggestions.push(`Preço médio da concorrência: R$ ${avgPrice.toFixed(2)}`);
    } else {
      status = 'red';
      message = 'Anúncio não competitivo para MLL ≥ 15%';
      suggestions.push(`Para manter MLL ≥ 15%, seu preço precisaria ser R$ ${pvTargetMll15.toFixed(2)}`);
      suggestions.push(`Maior preço da concorrência: R$ ${maxPrice.toFixed(2)}`);
      suggestions.push(`Considere reduzir custos ou aceitar margem menor`);
    }
    
    competitiveness = {
      pvTargetMll15,
      status,
      message,
      suggestions,
    };
  }
  
  return {
    pvReal,
    adsPerItem,
    effectiveTaxPercent,
    commissionRs,
    taxRs,
    profitPerItem,
    mlb,
    mll,
    roas,
    acos,
    tacos,
    minPrice,
    maxPrice,
    competitiveness,
  };
}

/**
 * Solve for PV (price) that achieves target MLL
 * Uses numeric solver (Newton's method)
 */
function solvePvForTargetMll(
  targetMll: number,
  productCost: number,
  taxPercent: number,
  emittedPercent: number,
  operationalCost: number,
  commissionPercent: number,
  fixedCostPerItem: number,
  adsPerItem: number
): number {
  const effectiveTaxPercent = (taxPercent * emittedPercent) / 100;
  
  // Function to calculate MLL for a given PV
  const calculateMllForPv = (pv: number): number => {
    const commissionRs = pv * (commissionPercent / 100);
    const taxRs = pv * (effectiveTaxPercent / 100);
    
    const baseMll = 
      pv -
      commissionRs -
      taxRs -
      fixedCostPerItem -
      operationalCost -
      adsPerItem;
    
    const profit = baseMll - productCost;
    
    if (baseMll <= 0) return -100; // Invalid
    
    return (profit / baseMll) * 100;
  };
  
  // Newton's method for root finding
  // We want: calculateMllForPv(pv) - targetMll = 0
  
  // Start with a reasonable initial guess
  // Rough estimate: PV should cover all costs with target margin
  let pv = productCost * 2.5; // Start at 2.5x product cost
  
  const maxIterations = 120;
  const tolerance = 0.0001;
  
  for (let i = 0; i < maxIterations; i++) {
    const currentMll = calculateMllForPv(pv);
    const error = currentMll - targetMll;
    
    if (Math.abs(error) < tolerance) {
      return pv;
    }
    
    // Numerical derivative (finite difference)
    const h = 0.01;
    const mllPlus = calculateMllForPv(pv + h);
    const derivative = (mllPlus - currentMll) / h;
    
    if (Math.abs(derivative) < 0.001) {
      // Derivative too small, adjust step manually
      pv += error > 0 ? -0.5 : 0.5;
    } else {
      // Newton's method step
      pv -= error / derivative;
    }
    
    // Keep PV positive and reasonable
    if (pv < productCost * 1.05) {
      pv = productCost * 1.05;
    }
  }
  
  return pv;
}

/**
 * Validate if items sold is zero
 */
export function validateItemsSold(itemsSold: number): void {
  if (itemsSold === 0) {
    throw new Error("Itens vendidos não pode ser 0. Insira um valor válido.");
  }
}
