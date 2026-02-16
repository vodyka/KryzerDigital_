import { useState, useMemo } from "react";
import { Calculator, TrendingUp, DollarSign, Target, AlertCircle, CheckCircle, Upload, FileText, X, Calendar, Zap, TrendingDown, Activity, Lightbulb, ListChecks } from "lucide-react";
import { calculateMetrics, validateItemsSold, type CalculationResults } from "../utils/ads-compass-calculator";
import { diagnoseAdPerformance, type DiagnosticResult } from "../utils/ads-compass-diagnostics";

interface CostsData {
  productCost: string;
  taxPercent: string;
  emittedPercent: string;
  operationalCost: string;
  commissionPercent: string;
  fixedCostPerItem: string;
  currentPrice: string;
}

interface PriceRangeData {
  minPrice: string;
  maxPrice: string;
}

interface BudgetData {
  method: "GMV Max - Meta de ROAS" | "GMV Max - Lance Automático";
  roasTarget: string;
  dailyBudget: string;
  hasMonthlyBudget: boolean;
  isUnlimitedDailyBudget: boolean;
  isNewAd: boolean;
  quickBoostEditEnabled: boolean;
}

interface ManualData {
  impressions: string;
  clicks: string;
  ctr: string;
  itemsSold: string;
  gmv: string;
  investment: string;
  roas: string;
}

interface OperationLogEvent {
  datetime: string;
  operator: string;
  device: string;
  eventType: string;
  details: string;
}

interface OperationLogMeta {
  storeName?: string;
  storeId?: string;
  productId?: string;
  reportCreatedAt?: string;
  period?: string;
  campaignId?: string;
  productName?: string;
}

interface ParsedChange {
  datetime: string;
  changedField: string;
  fromValue?: string;
  toValue?: string;
  details: string;
}

interface ChangesSummary {
  impulsaoRapidaChangeCount: number;
  roasTargetChangeCount: number;
  budgetChangeCount: number;
  enableDisableCount: number;
  otherChangesCount: number;
  totalChanges: number;
  isTooManyChanges: boolean;
}

interface AdData {
  impressions: number;
  clicks: number;
  ctr: number;
  itemsSold: number;
  gmv: number;
  investment: number;
  roas: number;
}

export default function AdsCompassPage() {
  const [costs, setCosts] = useState<CostsData>({
    productCost: "",
    taxPercent: "4",
    emittedPercent: "100",
    operationalCost: "",
    commissionPercent: "20",
    fixedCostPerItem: "4.00",
    currentPrice: "",
  });

  const [priceRange, setPriceRange] = useState<PriceRangeData>({
    minPrice: "",
    maxPrice: "",
  });

  const [budget, setBudget] = useState<BudgetData>({
    method: "GMV Max - Meta de ROAS",
    roasTarget: "",
    dailyBudget: "",
    hasMonthlyBudget: false,
    isUnlimitedDailyBudget: false,
    isNewAd: false,
    quickBoostEditEnabled: false,
  });

  const [manualData, setManualData] = useState<ManualData>({
    impressions: "",
    clicks: "",
    ctr: "",
    itemsSold: "",
    gmv: "",
    investment: "",
    roas: "",
  });

  const [operationLogFile, setOperationLogFile] = useState<File | null>(null);
  const [adDataFile, setAdDataFile] = useState<File | null>(null);
  const [operationLogError, setOperationLogError] = useState<string>("");
  const [adDataError, setAdDataError] = useState<string>("");
  const [useManualInput, setUseManualInput] = useState(false);
  
  const [operationEvents, setOperationEvents] = useState<OperationLogEvent[]>([]);
  const [operationLogMeta, setOperationLogMeta] = useState<OperationLogMeta>({});
  const [adData, setAdData] = useState<AdData | null>(null);
  const [analyzedPeriod, setAnalyzedPeriod] = useState<{ start: string; end: string } | null>(null);
  const [showQuickBoostWarning, setShowQuickBoostWarning] = useState(false);

  // Calculate average price
  const averagePrice =
    priceRange.minPrice && priceRange.maxPrice
      ? ((parseFloat(priceRange.minPrice) + parseFloat(priceRange.maxPrice)) / 2).toFixed(2)
      : "";

  // Handle price range changes
  const handlePriceRangeChange = (field: keyof PriceRangeData, value: string) => {
    setPriceRange({ ...priceRange, [field]: value });
  };

  // Get last 7 days INCLUDING today for Operation Log events
  // (We want to see changes made today, even though we analyze performance on complete days)
  const getLast7DaysForEvents = () => {
    const today = new Date();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999); // End of today
    
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // 7 days including today
    start.setHours(0, 0, 0, 0);
    
    return { start, end };
  };

  // Parse change details from event
  const parseChangeDetails = (event: OperationLogEvent): ParsedChange => {
    const { datetime, eventType, details } = event;
    
    // Try to extract field name and from->to values
    let changedField = eventType;
    let fromValue: string | undefined;
    let toValue: string | undefined;
    
    // Pattern: "Field: A -> B" or "Field: A→B"
    const arrowPattern = /(.+?):\s*(.+?)\s*[-–>→]+\s*(.+)/;
    const match = details.match(arrowPattern);
    
    if (match) {
      changedField = match[1].trim();
      fromValue = match[2].trim();
      toValue = match[3].trim();
    } else {
      // Try to identify field from common patterns
      const lowerDetails = details.toLowerCase();
      
      if (lowerDetails.includes('impulsão rápida') || lowerDetails.includes('quick boost')) {
        changedField = 'Impulsão Rápida';
      } else if (lowerDetails.includes('roas') && (lowerDetails.includes('meta') || lowerDetails.includes('target') || lowerDetails.includes('alvo'))) {
        changedField = 'ROAS alvo/meta';
      } else if (lowerDetails.includes('orçamento') || lowerDetails.includes('budget')) {
        changedField = 'Orçamento';
      } else if (lowerDetails.includes('ligar') || lowerDetails.includes('desligar') || lowerDetails.includes('enable') || lowerDetails.includes('disable') || lowerDetails.includes('ativar') || lowerDetails.includes('desativar')) {
        changedField = 'Ligar/Desligar campanha';
      } else if (lowerDetails.includes('lance') || lowerDetails.includes('bid')) {
        changedField = 'Lance/Método';
      }
    }
    
    return {
      datetime,
      changedField,
      fromValue,
      toValue,
      details
    };
  };

  // Suggest optimized ad title
  const suggestAdTitle = (title: string): { suggested: string; reason: string } => {
    if (!title || title.trim() === '') {
      return {
        suggested: '',
        reason: 'Título vazio'
      };
    }

    const trimmed = title.trim();
    
    // If already under 50 chars and well-structured, keep it
    if (trimmed.length <= 50 && !hasRedundantWords(trimmed)) {
      return {
        suggested: 'Manter título (já está otimizado)',
        reason: 'Título conciso e com boas palavras-chave'
      };
    }

    // Split into words
    const words = trimmed.split(/\s+/);
    
    // Common generic/filler words to potentially remove (in Portuguese)
    const genericWords = new Set([
      'de', 'da', 'do', 'para', 'com', 'em', 'a', 'o', 
      'e', 'produto', 'item', 'artigo', 'venda', 'comprar',
      'novo', 'nova', 'novos', 'novas', 'original', 'originais',
      'qualidade', 'barato', 'oferta', 'promoção'
    ]);
    
    // Identify repeated words (case-insensitive)
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      const lower = word.toLowerCase();
      wordCount[lower] = (wordCount[lower] || 0) + 1;
    });
    
    // Remove duplicates and excessive generic words, keeping first occurrence of important words
    const seenWords = new Set<string>();
    const filteredWords: string[] = [];
    let removedGeneric = false;
    let removedDuplicates = false;
    
    for (const word of words) {
      const lower = word.toLowerCase();
      
      // Keep if not seen before and not generic, or if it's a strong keyword
      const isGeneric = genericWords.has(lower);
      const isDuplicate = seenWords.has(lower);
      const isImportant = !isGeneric && word.length > 3;
      
      if (!isDuplicate && (!isGeneric || isImportant)) {
        filteredWords.push(word);
        seenWords.add(lower);
      } else if (isGeneric) {
        removedGeneric = true;
      } else if (isDuplicate) {
        removedDuplicates = true;
      }
    }
    
    let suggested = filteredWords.join(' ');
    
    // If still too long, try to reduce further by keeping only most important words
    if (suggested.length > 60) {
      // Keep first 6-8 most meaningful words
      const important = filteredWords.filter(w => w.length > 3).slice(0, 8);
      suggested = important.join(' ');
    }
    
    // Final check - if still too long, truncate intelligently
    if (suggested.length > 60) {
      // Find last complete word that fits
      let truncated = suggested.substring(0, 60);
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) {
        truncated = truncated.substring(0, lastSpace);
      }
      suggested = truncated;
    }
    
    // Build reason
    const reasons: string[] = [];
    if (removedDuplicates) reasons.push('removi palavras repetidas');
    if (removedGeneric) reasons.push('removi termos genéricos');
    if (suggested.length < trimmed.length) reasons.push('mantive palavras-chave principais');
    
    const reason = reasons.length > 0 
      ? reasons.join(' e ').charAt(0).toUpperCase() + reasons.join(' e ').slice(1)
      : 'Otimizei o título para melhor performance';
    
    return {
      suggested: suggested || trimmed.substring(0, 60),
      reason
    };
  };
  
  // Helper to detect redundant words
  const hasRedundantWords = (title: string): boolean => {
    const words = title.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    return words.length > uniqueWords.size;
  };

  // Analyze changes and create summary
  const analyzeChanges = (events: OperationLogEvent[]): ChangesSummary => {
    const parsedChanges = events.map(parseChangeDetails);
    
    let impulsaoRapidaChangeCount = 0;
    let roasTargetChangeCount = 0;
    let budgetChangeCount = 0;
    let enableDisableCount = 0;
    let otherChangesCount = 0;
    
    for (const change of parsedChanges) {
      const fieldLower = change.changedField.toLowerCase();
      
      if (fieldLower.includes('impulsão rápida') || fieldLower.includes('quick boost')) {
        impulsaoRapidaChangeCount++;
      } else if (fieldLower.includes('roas') && (fieldLower.includes('meta') || fieldLower.includes('target') || fieldLower.includes('alvo'))) {
        roasTargetChangeCount++;
      } else if (fieldLower.includes('orçamento') || fieldLower.includes('budget')) {
        budgetChangeCount++;
      } else if (fieldLower.includes('ligar') || fieldLower.includes('desligar') || fieldLower.includes('enable') || fieldLower.includes('disable') || fieldLower.includes('campanha')) {
        enableDisableCount++;
      } else {
        otherChangesCount++;
      }
    }
    
    const totalChanges = parsedChanges.length;
    const isTooManyChanges = 
      totalChanges >= 5 ||
      impulsaoRapidaChangeCount >= 2 ||
      roasTargetChangeCount >= 2 ||
      enableDisableCount >= 2;
    
    return {
      impulsaoRapidaChangeCount,
      roasTargetChangeCount,
      budgetChangeCount,
      enableDisableCount,
      otherChangesCount,
      totalChanges,
      isTooManyChanges
    };
  };

  // Parse CSV content
  const parseCSV = (content: string): string[][] => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      return values;
    });
  };

  // Handle Operation Log file upload
  const handleOperationLogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate filename
    if (!file.name.startsWith("Shopee-Product-Ads-Operation-Log-")) {
      setOperationLogError("Arquivo inválido: esperado Shopee-Product-Ads-Operation-Log-...");
      setOperationLogFile(null);
      return;
    }

    setOperationLogError("");
    setOperationLogFile(file);

    // Parse CSV
    const content = await file.text();
    const rows = parseCSV(content);
    
    if (rows.length < 2) {
      setOperationLogError("Arquivo CSV vazio ou inválido");
      return;
    }

    // Extract metadata from first 8 rows (before header)
    const meta: OperationLogMeta = {};
    for (let i = 0; i < Math.min(8, rows.length); i++) {
      const row = rows[i];
      if (row.length >= 2) {
        const label = row[0]?.toLowerCase() || "";
        const value = row[1]?.trim() || "";
        
        if (label.includes('nome da loja') || label.includes('store name')) {
          meta.storeName = value;
        } else if (label.includes('id da loja') || label.includes('store id')) {
          meta.storeId = value;
        } else if (label.includes('id do produto') || label.includes('product id')) {
          meta.productId = value;
        } else if (label.includes('criado em') || label.includes('created at')) {
          meta.reportCreatedAt = value;
        } else if (label.includes('período') || label.includes('period')) {
          meta.period = value;
        } else if (label.includes('id da campanha') || label.includes('campaign id')) {
          meta.campaignId = value;
        } else if (i === 7 && label.includes('nome do produto') || label.includes('product name')) {
          meta.productName = value;
        }
      }
    }
    setOperationLogMeta(meta);

    // Find the header row - it contains "Atualizar horário" or similar
    let headerIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstCell = row[0]?.toLowerCase() || "";
      if (firstCell.includes('atualizar') || firstCell.includes('horário') || firstCell.includes('update')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      setOperationLogError("Não foi possível encontrar o cabeçalho no arquivo CSV");
      return;
    }

    // Get last 7 days including today for event tracking
    const { start, end } = getLast7DaysForEvents();
    
    // Parse events (start after header)
    const events: OperationLogEvent[] = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 5) continue;
      
      // Skip empty rows
      if (!row[0] || row[0].trim() === '') continue;
      
      try {
        // Parse date (format: YYYY-MM-DD HH:MM:SS or DD/MM/YYYY HH:MM:SS)
        const dateStr = row[0];
        let eventDate: Date;
        
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
          // Format: YYYY-MM-DD HH:MM:SS
          eventDate = new Date(dateStr);
        } else {
          // Format: DD/MM/YYYY HH:MM:SS
          const [datePart, timePart] = dateStr.split(' ');
          const [day, month, year] = datePart.split('/');
          eventDate = new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);
        }
        
        // Filter to last 7 complete days
        if (!isNaN(eventDate.getTime()) && eventDate >= start && eventDate <= end) {
          events.push({
            datetime: dateStr,
            operator: row[1] || "",
            device: row[2] || "",
            eventType: row[3] || "",
            details: row[4] || "",
          });
        }
      } catch (error) {
        console.error("Error parsing date:", row[0], error);
      }
    }
    
    setOperationEvents(events);
    setAnalyzedPeriod({
      start: start.toLocaleDateString('pt-BR'),
      end: end.toLocaleDateString('pt-BR'),
    });
  };

  // Helper function to parse Portuguese/Brazilian number formats
  const parseNumber = (value: string): number => {
    if (!value) return 0;
    
    // Remove percentage sign
    let cleaned = value.replace('%', '').trim();
    
    // Remove common currency symbols
    cleaned = cleaned.replace(/[R$€£¥]/g, '');
    
    // Handle both formats:
    // "10,942.60" (English) -> 10942.60
    // "10.942,60" (Portuguese) -> 10942.60
    
    // Count dots and commas
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;
    
    if (dotCount > 0 && commaCount > 0) {
      // Both present - determine which is thousands separator
      const lastDot = cleaned.lastIndexOf('.');
      const lastComma = cleaned.lastIndexOf(',');
      
      if (lastDot > lastComma) {
        // English format: 10,942.60
        cleaned = cleaned.replace(/,/g, '');
      } else {
        // Portuguese format: 10.942,60
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
    } else if (commaCount > 0) {
      // Only commas - could be thousands or decimal
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Likely decimal: 10942,60
        cleaned = cleaned.replace(',', '.');
      } else {
        // Likely thousands: 10,942
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    // If only dots, assume English format (already correct)
    
    return parseFloat(cleaned) || 0;
  };

  // Handle Product-Ad-Data file upload
  const handleAdDataUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate filename
    if (!file.name.startsWith("Product-Ad-Data-")) {
      setAdDataError("Arquivo inválido: esperado Product-Ad-Data-...");
      setAdDataFile(null);
      return;
    }

    setAdDataError("");
    setAdDataFile(file);

    // Parse CSV
    const content = await file.text();
    const rows = parseCSV(content);
    
    if (rows.length < 2) {
      setAdDataError("Arquivo CSV vazio ou inválido");
      return;
    }

    // Find the header row
    // Header starts with "#" or contains "Impressões" AND "Cliques" AND "CTR"
    let headerIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowStr = row.join(',');
      
      if (row[0] === '#' || 
          (rowStr.includes('Impressões') && rowStr.includes('Cliques') && rowStr.includes('CTR'))) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      setAdDataError("Não foi possível encontrar o cabeçalho no arquivo CSV");
      return;
    }

    // Get exact column indexes using exact header names
    const header = rows[headerIndex];
    const impressionsIdx = header.indexOf("Impressões");
    const clicksIdx = header.indexOf("Cliques");
    const ctrIdx = header.indexOf("CTR");
    const itemsIdx = header.indexOf("Itens Vendidos");
    const gmvIdx = header.indexOf("GMV");
    const investmentIdx = header.indexOf("Despesas");
    const roasIdx = header.indexOf("ROAS");

    console.log('Header:', header);
    console.log('Column indexes:', { 
      impressionsIdx, 
      clicksIdx, 
      ctrIdx, 
      itemsIdx, 
      gmvIdx, 
      investmentIdx, 
      roasIdx 
    });

    if (impressionsIdx === -1 || clicksIdx === -1) {
      setAdDataError("Colunas obrigatórias não encontradas (Impressões, Cliques)");
      return;
    }

    // Sum all data rows (start after header)
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalItemsSold = 0;
    let totalGMV = 0;
    let totalInvestment = 0;

    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows or rows that don't start with a number
      if (!row[0] || row[0].trim() === '') continue;
      
      // Skip rows where first column isn't numeric (not a data row)
      const firstCol = row[0].trim();
      if (isNaN(parseInt(firstCol))) continue;
      
      console.log('Processing row:', row);
      
      // Sum up values
      if (impressionsIdx >= 0 && row[impressionsIdx]) {
        const value = parseNumber(row[impressionsIdx]);
        totalImpressions += value;
        console.log(`  Impressions: ${row[impressionsIdx]} -> ${value}`);
      }
      
      if (clicksIdx >= 0 && row[clicksIdx]) {
        const value = parseNumber(row[clicksIdx]);
        totalClicks += value;
        console.log(`  Clicks: ${row[clicksIdx]} -> ${value}`);
      }
      
      if (itemsIdx >= 0 && row[itemsIdx]) {
        const value = parseNumber(row[itemsIdx]);
        totalItemsSold += value;
        console.log(`  Items: ${row[itemsIdx]} -> ${value}`);
      }
      
      if (gmvIdx >= 0 && row[gmvIdx]) {
        const value = parseNumber(row[gmvIdx]);
        totalGMV += value;
        console.log(`  GMV: ${row[gmvIdx]} -> ${value}`);
      }
      
      if (investmentIdx >= 0 && row[investmentIdx]) {
        const value = parseNumber(row[investmentIdx]);
        totalInvestment += value;
        console.log(`  Investment: ${row[investmentIdx]} -> ${value}`);
      }
    }

    console.log('Final totals:', { 
      totalImpressions, 
      totalClicks, 
      totalItemsSold, 
      totalGMV, 
      totalInvestment 
    });

    // Validate we got some data
    if (totalImpressions === 0 && totalClicks === 0) {
      setAdDataError("Não foi possível extrair dados numéricos do arquivo");
      return;
    }

    // Recalculate CTR from totals (more reliable than summing CTR)
    const calculatedCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    
    // Calculate ROAS from totals
    const calculatedROAS = totalInvestment > 0 ? totalGMV / totalInvestment : 0;

    console.log('Calculated metrics:', { calculatedCTR, calculatedROAS });

    setAdData({
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: calculatedCTR,
      itemsSold: totalItemsSold,
      gmv: totalGMV,
      investment: totalInvestment,
      roas: calculatedROAS,
    });
  };

  // Handle manual data submission
  const handleManualDataSubmit = () => {
    const calculatedCTR = manualData.ctr 
      ? parseFloat(manualData.ctr)
      : (parseFloat(manualData.clicks) / parseFloat(manualData.impressions)) * 100;
    
    const calculatedROAS = manualData.roas
      ? parseFloat(manualData.roas)
      : parseFloat(manualData.gmv) / parseFloat(manualData.investment);

    setAdData({
      impressions: parseFloat(manualData.impressions) || 0,
      clicks: parseFloat(manualData.clicks) || 0,
      ctr: calculatedCTR || 0,
      itemsSold: parseFloat(manualData.itemsSold) || 0,
      gmv: parseFloat(manualData.gmv) || 0,
      investment: parseFloat(manualData.investment) || 0,
      roas: calculatedROAS || 0,
    });
  };

  // Calculate metrics when all required data is available
  const calculatedResults = useMemo<CalculationResults | null>(() => {
    if (!adData || !costs.productCost || !costs.operationalCost) {
      return null;
    }

    try {
      validateItemsSold(adData.itemsSold);
      
      return calculateMetrics({
        gmv: adData.gmv,
        itemsSold: adData.itemsSold,
        investment: adData.investment,
        productCost: parseFloat(costs.productCost),
        taxPercent: parseFloat(costs.taxPercent),
        emittedPercent: parseFloat(costs.emittedPercent),
        operationalCost: parseFloat(costs.operationalCost),
        commissionPercent: parseFloat(costs.commissionPercent),
        fixedCostPerItem: parseFloat(costs.fixedCostPerItem),
        minPrice: priceRange.minPrice ? parseFloat(priceRange.minPrice) : undefined,
        maxPrice: priceRange.maxPrice ? parseFloat(priceRange.maxPrice) : undefined,
      });
    } catch (error) {
      console.error("Calculation error:", error);
      return null;
    }
  }, [adData, costs, priceRange]);

  // Run diagnostic analysis
  const diagnosticResults = useMemo<DiagnosticResult | null>(() => {
    if (!calculatedResults || !adData) {
      return null;
    }

    try {
      return diagnoseAdPerformance({
        results: calculatedResults,
        roasTarget: budget.roasTarget ? parseFloat(budget.roasTarget) : undefined,
        dailyBudget: budget.isUnlimitedDailyBudget ? Infinity : (parseFloat(budget.dailyBudget) || 0),
        hasMonthlyBudget: budget.hasMonthlyBudget,
        impressions: adData.impressions,
        clicks: adData.clicks,
        itemsSold: adData.itemsSold,
        recentEvents: operationEvents.length,
      });
    } catch (error) {
      console.error("Diagnostic error:", error);
      return null;
    }
  }, [calculatedResults, adData, budget, operationEvents]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Quick Boost Warning Modal */}
      {showQuickBoostWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-2">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  ⚠️ Atenção
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Editar Impulsão Rápida em anúncios ativos pode prejudicar a performance. Tem certeza que deseja ativar?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowQuickBoostWarning(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setBudget({ ...budget, quickBoostEditEnabled: true });
                  setShowQuickBoostWarning(false);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-8 h-8" />
          <h1 className="text-2xl font-bold">GMV Max • Ads Compass</h1>
        </div>
        <p className="text-blue-100">
          Diagnóstico automático + análise de competitividade para seus anúncios
        </p>
      </div>

      {/* Alert - GMV Max Guide */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Guia GMV Max
            </h3>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>• Não analise o dia de hoje (dia incompleto)</li>
              <li>• Dias 1-7: otimizar diariamente com dia completo</li>
              <li>• Após o 8º dia: otimizar de 7 em 7 dias</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Grid - 3 columns on desktop, stacked on mobile */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Card 1: Costs and Current Price */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Custos e Preço Atual
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custo do produto (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.productCost}
                onChange={(e) => setCosts({ ...costs, productCost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Imposto do produto (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.taxPercent}
                onChange={(e) => setCosts({ ...costs, taxPercent: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                % Emitido na nota
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.emittedPercent}
                onChange={(e) => setCosts({ ...costs, emittedPercent: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ex: 5 significa 5% do valor de venda entra na base do imposto
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custo operacional (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.operationalCost}
                onChange={(e) => setCosts({ ...costs, operationalCost: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Embalagem, mão de obra, etc.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comissão do marketplace (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.commissionPercent}
                onChange={(e) => setCosts({ ...costs, commissionPercent: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custo fixo por item (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.fixedCostPerItem}
                onChange={(e) => setCosts({ ...costs, fixedCostPerItem: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="4.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preço de venda atual (R$)
                <span className="text-gray-500 text-xs ml-1">(opcional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={costs.currentPrice}
                onChange={(e) => setCosts({ ...costs, currentPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Apenas referência para comparar com PV calculado
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Price Range (Competition) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Faixa de Preço (Concorrência)
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Menor preço (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceRange.minPrice}
                onChange={(e) => handlePriceRangeChange("minPrice", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maior preço (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={priceRange.maxPrice}
                onChange={(e) => handlePriceRangeChange("maxPrice", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            {averagePrice && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preço médio
                  </span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {averagePrice}
                  </span>
                </div>
              </div>
            )}

            {priceRange.minPrice && priceRange.maxPrice && parseFloat(priceRange.minPrice) > parseFloat(priceRange.maxPrice) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Atenção: preço mínimo é maior que o máximo
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Budget and Method */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Orçamento e Método
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Método de lance
              </label>
              <select
                value={budget.method}
                onChange={(e) => setBudget({ ...budget, method: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="GMV Max - Meta de ROAS">GMV Max - Meta de ROAS</option>
                <option value="Outro">GMV Max - Lance Automático</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Meta de ROAS
              </label>
              <input
                type="number"
                step="0.1"
                value={budget.roasTarget}
                onChange={(e) => setBudget({ ...budget, roasTarget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="15.7"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Orçamento diário (R$)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.01"
                  value={budget.isUnlimitedDailyBudget ? "" : budget.dailyBudget}
                  onChange={(e) => setBudget({ ...budget, dailyBudget: e.target.value })}
                  disabled={budget.isUnlimitedDailyBudget}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0.00"
                />
                <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={budget.isUnlimitedDailyBudget}
                    onChange={(e) => setBudget({ 
                      ...budget, 
                      isUnlimitedDailyBudget: e.target.checked,
                      dailyBudget: e.target.checked ? "" : budget.dailyBudget
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ilimitado
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={budget.hasMonthlyBudget}
                  onChange={(e) => setBudget({ ...budget, hasMonthlyBudget: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tem orçamento mensal disponível?
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                Usado no cenário 4 para decisões de otimização
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={budget.isNewAd}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setBudget({ 
                      ...budget, 
                      isNewAd: newValue,
                      // If unchecking "new ad", automatically disable quick boost edit
                      quickBoostEditEnabled: newValue ? budget.quickBoostEditEnabled : false
                    });
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Este é um anúncio novo
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                Apenas anúncios novos devem editar Impulsão Rápida
              </p>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Editar Impulsão Rápida
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!budget.quickBoostEditEnabled) {
                      // Trying to enable
                      if (!budget.isNewAd) {
                        // Show custom confirmation popup if not a new ad
                        setShowQuickBoostWarning(true);
                      } else {
                        setBudget({ ...budget, quickBoostEditEnabled: true });
                      }
                    } else {
                      // Disabling - no confirmation needed
                      setBudget({ ...budget, quickBoostEditEnabled: false });
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    budget.quickBoostEditEnabled 
                      ? 'bg-red-600' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      budget.quickBoostEditEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${
                  budget.quickBoostEditEnabled 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {budget.quickBoostEditEnabled ? 'Ativado' : 'Desativado'}
                </span>
              </div>
              
              {budget.quickBoostEditEnabled && (
                <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800 dark:text-red-200">
                      <strong>Atenção:</strong> evite editar Impulsão Rápida em anúncios ativos. Use apenas em anúncio novo. Mudanças frequentes prejudicam a performance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data Import Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Importar Dados (últimos 7 dias)
            </h2>
          </div>
          <button
            onClick={() => setUseManualInput(!useManualInput)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {useManualInput ? "Usar upload de CSV" : "Inserir dados manualmente"}
          </button>
        </div>

        {!useManualInput ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Operation Log Upload */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Operation Log (CSV)
              </h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleOperationLogUpload}
                  className="hidden"
                  id="operation-log-upload"
                />
                <label
                  htmlFor="operation-log-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {operationLogFile ? operationLogFile.name : "Clique para selecionar"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    Shopee-Product-Ads-Operation-Log-...
                  </span>
                </label>
              </div>
              {operationLogError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{operationLogError}</p>
                </div>
              )}
              {operationLogFile && !operationLogError && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-800 dark:text-green-200">
                        {operationEvents.length} eventos encontrados
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setOperationLogFile(null);
                        setOperationEvents([]);
                      }}
                      className="text-green-600 dark:text-green-400 hover:text-green-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Product-Ad-Data Upload */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Product-Ad-Data (CSV)
              </h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleAdDataUpload}
                  className="hidden"
                  id="ad-data-upload"
                />
                <label
                  htmlFor="ad-data-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {adDataFile ? adDataFile.name : "Clique para selecionar"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    Product-Ad-Data-...
                  </span>
                </label>
              </div>
              {adDataError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{adDataError}</p>
                </div>
              )}
              {adDataFile && !adDataError && adData && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Dados importados com sucesso
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setAdDataFile(null);
                        setAdData(null);
                      }}
                      className="text-green-600 dark:text-green-400 hover:text-green-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Impressões
                </label>
                <input
                  type="number"
                  value={manualData.impressions}
                  onChange={(e) => setManualData({ ...manualData, impressions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cliques
                </label>
                <input
                  type="number"
                  value={manualData.clicks}
                  onChange={(e) => setManualData({ ...manualData, clicks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  CTR (%)
                  <span className="text-gray-500 text-xs ml-1">(opcional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualData.ctr}
                  onChange={(e) => setManualData({ ...manualData, ctr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Itens Vendidos
                </label>
                <input
                  type="number"
                  value={manualData.itemsSold}
                  onChange={(e) => setManualData({ ...manualData, itemsSold: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GMV (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualData.gmv}
                  onChange={(e) => setManualData({ ...manualData, gmv: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Investimento (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={manualData.investment}
                  onChange={(e) => setManualData({ ...manualData, investment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ROAS
                <span className="text-gray-500 text-xs ml-1">(opcional, calculado automaticamente)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={manualData.roas}
                onChange={(e) => setManualData({ ...manualData, roas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="Auto"
              />
            </div>

            <button
              onClick={handleManualDataSubmit}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Processar Dados Manuais
            </button>
          </div>
        )}

        {analyzedPeriod && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Período analisado: {analyzedPeriod.start} a {analyzedPeriod.end}
              </p>
            </div>
          </div>
        )}

        {/* Ad Title Optimization Card */}
        {operationLogMeta.productName && (() => {
          const titleAnalysis = suggestAdTitle(operationLogMeta.productName);
          const currentLength = operationLogMeta.productName.length;
          const isOptimal = currentLength <= 60 && titleAnalysis.suggested === 'Manter título (já está otimizado)';
          
          return (
            <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Título do Anúncio
                </h4>
              </div>
              
              <div className="space-y-3">
                {/* Current Title */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Nome atual:</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white break-words">
                    {operationLogMeta.productName}
                  </p>
                </div>
                
                {/* Title Length */}
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Tamanho do título:
                  </p>
                  <span className={`text-sm font-bold ${
                    currentLength <= 50 
                      ? 'text-green-600 dark:text-green-400'
                      : currentLength <= 60
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {currentLength}/60
                  </span>
                  {currentLength > 60 && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      (excede o limite)
                    </span>
                  )}
                </div>
                
                {/* AI Suggestion */}
                <div className={`rounded-lg p-3 ${
                  isOptimal
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                }`}>
                  <div className="flex items-start gap-2">
                    <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      isOptimal 
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-xs font-semibold mb-1 ${
                        isOptimal
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-blue-900 dark:text-blue-100'
                      }`}>
                        Sugestão de nome (IA):
                      </p>
                      <p className={`text-sm font-medium break-words ${
                        isOptimal
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-blue-800 dark:text-blue-200'
                      }`}>
                        {titleAnalysis.suggested}
                      </p>
                      <p className={`text-xs mt-1 ${
                        isOptimal
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        {titleAnalysis.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Operation Log Summary */}
        {operationEvents.length > 0 && (() => {
          const summary = analyzeChanges(operationEvents);
          const parsedChanges = operationEvents.map(parseChangeDetails);
          
          return (
            <div className="mt-4 space-y-4">
              {/* Metadata */}
              {(operationLogMeta.storeName || operationLogMeta.productName || operationLogMeta.campaignId) && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Informações do Relatório
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {operationLogMeta.storeName && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Loja:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{operationLogMeta.storeName}</p>
                      </div>
                    )}
                    {operationLogMeta.productName && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Produto:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{operationLogMeta.productName}</p>
                      </div>
                    )}
                    {operationLogMeta.campaignId && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">ID Campanha:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{operationLogMeta.campaignId}</p>
                      </div>
                    )}
                    {operationLogMeta.period && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Período:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{operationLogMeta.period}</p>
                      </div>
                    )}
                    {operationLogMeta.productId && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">ID Produto:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{operationLogMeta.productId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Changes Summary */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Resumo do que foi alterado
                </h4>
                
                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{summary.totalChanges}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-2 text-center">
                    <p className="text-xs text-purple-600 dark:text-purple-400">Impulsão</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{summary.impulsaoRapidaChangeCount}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400">ROAS</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{summary.roasTargetChangeCount}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 text-center">
                    <p className="text-xs text-green-600 dark:text-green-400">Orçamento</p>
                    <p className="text-lg font-bold text-green-900 dark:text-green-100">{summary.budgetChangeCount}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2 text-center">
                    <p className="text-xs text-orange-600 dark:text-orange-400">Liga/Desliga</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{summary.enableDisableCount}</p>
                  </div>
                </div>

                {/* Change Details */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedChanges.slice(0, 10).map((change, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Às {change.datetime}
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Modificou: {change.changedField}
                          </p>
                          {change.fromValue && change.toValue && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              <span className="text-red-600 dark:text-red-400">{change.fromValue}</span>
                              {' → '}
                              <span className="text-green-600 dark:text-green-400">{change.toValue}</span>
                            </p>
                          )}
                          {!change.fromValue && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {change.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {parsedChanges.length > 10 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                    Mostrando 10 de {parsedChanges.length} alterações
                  </p>
                )}
              </div>

              {/* Warning for too many changes */}
              {summary.isTooManyChanges && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                        ⚠️ Muitas alterações detectadas
                      </h4>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Seu anúncio está tendo muitas alterações nos últimos 7 dias. Isso pode prejudicar a performance e a estabilidade do aprendizado do sistema.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Display imported data */}
      {adData && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Dados do Anúncio
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Impressões</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {adData.impressions.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cliques</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {adData.clicks.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">CTR</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {adData.ctr.toFixed(2)}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Itens Vendidos</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {adData.itemsSold}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">GMV</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                R$ {adData.gmv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Investimento</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                R$ {adData.investment.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ROAS</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {adData.roas.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ACOS</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {((adData.investment / adData.gmv) * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Results */}
      {calculatedResults && (
        <>
          {/* Main Results Grid */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-blue-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Resultado da Análise
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Key Metrics Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Métricas Principais
                </h3>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">PV Real</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    R$ {calculatedResults.pvReal.toFixed(2)}
                  </p>
                  {costs.currentPrice && parseFloat(costs.currentPrice) > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Atual: R$ {parseFloat(costs.currentPrice).toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Lucro/Item</p>
                  <p className={`text-2xl font-bold ${calculatedResults.profitPerItem >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    R$ {calculatedResults.profitPerItem.toFixed(2)}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Investimento/Item</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    R$ {calculatedResults.adsPerItem.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Margins Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Margens
                </h3>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">MLB (Margem Líquida Bruta)</p>
                  <p className={`text-2xl font-bold ${calculatedResults.mlb >= 15 ? 'text-green-600 dark:text-green-400' : calculatedResults.mlb >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {calculatedResults.mlb.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">MLL (Margem Líquida Líquida)</p>
                  <p className={`text-2xl font-bold ${calculatedResults.mll >= 15 ? 'text-green-600 dark:text-green-400' : calculatedResults.mll >= 10 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {calculatedResults.mll.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Meta: ≥ 15%
                  </p>
                </div>
              </div>

              {/* Ad Performance Column */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Performance de Anúncios
                </h3>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ROAS</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {calculatedResults.roas.toFixed(2)}
                  </p>
                  {budget.roasTarget && parseFloat(budget.roasTarget) > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Meta: {parseFloat(budget.roasTarget).toFixed(1)}
                    </p>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ACOS</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {calculatedResults.acos.toFixed(2)}%
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">TACOS</p>
                  <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                    {calculatedResults.tacos.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Detalhamento de Custos (por item)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Comissão</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    R$ {calculatedResults.commissionRs.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Imposto</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    R$ {calculatedResults.taxRs.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Imposto Efetivo</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {calculatedResults.effectiveTaxPercent.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Custo Fixo</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    R$ {parseFloat(costs.fixedCostPerItem).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Results */}
          {diagnosticResults && (
            <div className={`rounded-2xl p-6 border-2 ${
              diagnosticResults.status === 'excellent'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : diagnosticResults.status === 'good'
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                : diagnosticResults.status === 'warning'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            }`}>
              <div className="flex items-start gap-3 mb-4">
                <Activity className={`w-7 h-7 flex-shrink-0 ${
                  diagnosticResults.status === 'excellent'
                    ? 'text-green-600 dark:text-green-400'
                    : diagnosticResults.status === 'good'
                    ? 'text-blue-600 dark:text-blue-400'
                    : diagnosticResults.status === 'warning'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`} />
                <div className="flex-1">
                  <h2 className={`text-xl font-bold mb-1 ${
                    diagnosticResults.status === 'excellent'
                      ? 'text-green-900 dark:text-green-100'
                      : diagnosticResults.status === 'good'
                      ? 'text-blue-900 dark:text-blue-100'
                      : diagnosticResults.status === 'warning'
                      ? 'text-yellow-900 dark:text-yellow-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    {diagnosticResults.scenarioTitle}
                  </h2>
                  <p className={`text-sm ${
                    diagnosticResults.status === 'excellent'
                      ? 'text-green-700 dark:text-green-200'
                      : diagnosticResults.status === 'good'
                      ? 'text-blue-700 dark:text-blue-200'
                      : diagnosticResults.status === 'warning'
                      ? 'text-yellow-700 dark:text-yellow-200'
                      : 'text-red-700 dark:text-red-200'
                  }`}>
                    {diagnosticResults.scenarioDescription}
                  </p>
                </div>
              </div>

              {/* Primary Issues */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Situação Atual
                </h3>
                <ul className="space-y-2">
                  {diagnosticResults.primaryIssues.map((issue, idx) => (
                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 flex items-start gap-2">
                      <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Recomendações
                </h3>
                <ul className="space-y-2">
                  {diagnosticResults.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 flex items-start gap-2">
                      <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Plan */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Immediate Actions */}
                {diagnosticResults.actionPlan.immediate.length > 0 && (
                  <div className={`rounded-xl p-4 ${
                    diagnosticResults.status === 'excellent'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : diagnosticResults.status === 'good'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : diagnosticResults.status === 'warning'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${
                      diagnosticResults.status === 'excellent'
                        ? 'text-green-900 dark:text-green-100'
                        : diagnosticResults.status === 'good'
                        ? 'text-blue-900 dark:text-blue-100'
                        : diagnosticResults.status === 'warning'
                        ? 'text-yellow-900 dark:text-yellow-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      <Zap className="w-3 h-3" />
                      Ações Imediatas
                    </h4>
                    <ul className="space-y-1.5">
                      {diagnosticResults.actionPlan.immediate.map((action, idx) => (
                        <li key={idx} className={`text-xs flex items-start gap-1.5 ${
                          diagnosticResults.status === 'excellent'
                            ? 'text-green-800 dark:text-green-200'
                            : diagnosticResults.status === 'good'
                            ? 'text-blue-800 dark:text-blue-200'
                            : diagnosticResults.status === 'warning'
                            ? 'text-yellow-800 dark:text-yellow-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          <span className="mt-0.5">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Short-term Actions */}
                {diagnosticResults.actionPlan.shortTerm.length > 0 && (
                  <div className={`rounded-xl p-4 ${
                    diagnosticResults.status === 'excellent'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : diagnosticResults.status === 'good'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : diagnosticResults.status === 'warning'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${
                      diagnosticResults.status === 'excellent'
                        ? 'text-green-900 dark:text-green-100'
                        : diagnosticResults.status === 'good'
                        ? 'text-blue-900 dark:text-blue-100'
                        : diagnosticResults.status === 'warning'
                        ? 'text-yellow-900 dark:text-yellow-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      Curto Prazo
                    </h4>
                    <ul className="space-y-1.5">
                      {diagnosticResults.actionPlan.shortTerm.map((action, idx) => (
                        <li key={idx} className={`text-xs flex items-start gap-1.5 ${
                          diagnosticResults.status === 'excellent'
                            ? 'text-green-800 dark:text-green-200'
                            : diagnosticResults.status === 'good'
                            ? 'text-blue-800 dark:text-blue-200'
                            : diagnosticResults.status === 'warning'
                            ? 'text-yellow-800 dark:text-yellow-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          <span className="mt-0.5">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Monitoring */}
                {diagnosticResults.actionPlan.monitoring.length > 0 && (
                  <div className={`rounded-xl p-4 ${
                    diagnosticResults.status === 'excellent'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : diagnosticResults.status === 'good'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : diagnosticResults.status === 'warning'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <h4 className={`text-xs font-semibold mb-2 flex items-center gap-1 ${
                      diagnosticResults.status === 'excellent'
                        ? 'text-green-900 dark:text-green-100'
                        : diagnosticResults.status === 'good'
                        ? 'text-blue-900 dark:text-blue-100'
                        : diagnosticResults.status === 'warning'
                        ? 'text-yellow-900 dark:text-yellow-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      <ListChecks className="w-3 h-3" />
                      Monitoramento
                    </h4>
                    <ul className="space-y-1.5">
                      {diagnosticResults.actionPlan.monitoring.map((action, idx) => (
                        <li key={idx} className={`text-xs flex items-start gap-1.5 ${
                          diagnosticResults.status === 'excellent'
                            ? 'text-green-800 dark:text-green-200'
                            : diagnosticResults.status === 'good'
                            ? 'text-blue-800 dark:text-blue-200'
                            : diagnosticResults.status === 'warning'
                            ? 'text-yellow-800 dark:text-yellow-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          <span className="mt-0.5">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Competitiveness Analysis */}
          {calculatedResults.competitiveness && (
            <div className={`rounded-2xl p-6 border ${
              calculatedResults.competitiveness.status === 'green' 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : calculatedResults.competitiveness.status === 'yellow'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3 mb-4">
                {calculatedResults.competitiveness.status === 'green' ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : calculatedResults.competitiveness.status === 'yellow' ? (
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`text-lg font-bold mb-1 ${
                    calculatedResults.competitiveness.status === 'green' 
                      ? 'text-green-900 dark:text-green-100'
                      : calculatedResults.competitiveness.status === 'yellow'
                      ? 'text-yellow-900 dark:text-yellow-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    Análise de Competitividade
                  </h3>
                  <p className={`text-sm ${
                    calculatedResults.competitiveness.status === 'green' 
                      ? 'text-green-800 dark:text-green-200'
                      : calculatedResults.competitiveness.status === 'yellow'
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {calculatedResults.competitiveness.message}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Preço necessário para MLL ≥ 15%
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      R$ {calculatedResults.competitiveness.pvTargetMll15.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Seu preço atual
                    </p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      R$ {calculatedResults.pvReal.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {calculatedResults.competitiveness.suggestions.length > 0 && (
                <div className={`rounded-lg p-3 ${
                  calculatedResults.competitiveness.status === 'green' 
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : calculatedResults.competitiveness.status === 'yellow'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  <p className={`text-xs font-semibold mb-2 ${
                    calculatedResults.competitiveness.status === 'green' 
                      ? 'text-green-900 dark:text-green-100'
                      : calculatedResults.competitiveness.status === 'yellow'
                      ? 'text-yellow-900 dark:text-yellow-100'
                      : 'text-red-900 dark:text-red-100'
                  }`}>
                    Recomendações:
                  </p>
                  <ul className={`text-sm space-y-1 ${
                    calculatedResults.competitiveness.status === 'green' 
                      ? 'text-green-800 dark:text-green-200'
                      : calculatedResults.competitiveness.status === 'yellow'
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {calculatedResults.competitiveness.suggestions.map((suggestion, idx) => (
                      <li key={idx}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Operation Log Events Table */}
      {operationEvents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Eventos dos Últimos 7 Dias
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Data/Hora
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Operador
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Dispositivo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tipo de Evento
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {operationEvents.slice(0, 10).map((event, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {event.datetime}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {event.operator}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {event.device}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {event.eventType}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {event.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {operationEvents.length > 10 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">
                Mostrando 10 de {operationEvents.length} eventos
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
