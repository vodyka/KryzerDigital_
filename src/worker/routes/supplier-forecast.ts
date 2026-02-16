import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

interface ForecastItem {
  sku: string;
  productName: string;
  productImage: string | null;
  currentStock: number;
  avgDailySales: number;
  last30DaysSales: number;
  quantityNeeded: number;
  abcCurve: "A" | "B" | "C";
  reason: string;
  priorityScore: number;
  isInProduction: boolean;
}

// Calculate ABC curve based on sales revenue
function calculateABCCurve(revenue: number, allRevenues: number[]): "A" | "B" | "C" {
  const sorted = [...allRevenues].sort((a, b) => b - a);
  const totalRevenue = sorted.reduce((sum, r) => sum + r, 0);
  
  let cumulative = 0;
  let aThreshold = 0;
  let bThreshold = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i];
    const percentage = (cumulative / totalRevenue) * 100;
    
    if (percentage <= 80 && aThreshold === 0) {
      aThreshold = sorted[i];
    }
    if (percentage <= 95 && bThreshold === 0) {
      bThreshold = sorted[i];
    }
  }
  
  if (revenue >= aThreshold) return "A";
  if (revenue >= bThreshold) return "B";
  return "C";
}

// Calculate priority score (higher = more critical)
function calculatePriorityScore(
  abcCurve: "A" | "B" | "C",
  currentStock: number,
  avgDailySales: number,
  daysOfCoverage: number
): number {
  let score = 0;
  
  // ABC curve priority (A=300, B=200, C=100)
  if (abcCurve === "A") score += 300;
  else if (abcCurve === "B") score += 200;
  else score += 100;
  
  // Stock criticality (no stock = +1000, less coverage = more points)
  if (currentStock === 0) {
    score += 1000;
  } else {
    const criticalityPoints = Math.max(0, 500 - (daysOfCoverage * 50));
    score += criticalityPoints;
  }
  
  // Sales velocity (more sales = higher priority)
  score += Math.min(avgDailySales * 10, 200);
  
  return Math.round(score);
}

// Get production forecast for supplier
app.get("/:supplier_id", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplier_id");
    const filterTag = c.req.query("filter") || "all"; // all, with_tag, without_tag
    
    // Get most recent month from spreadsheet_history
    const latestMonth = await db
      .prepare(`
        SELECT month_year 
        FROM spreadsheet_history 
        WHERE is_complete = 1 
        ORDER BY month_year DESC 
        LIMIT 1
      `)
      .first<{ month_year: string }>();
    
    if (!latestMonth) {
      return c.json({ 
        items: [], 
        message: "Nenhuma planilha de vendas encontrada. Importe dados em /analytics/vendas-variante primeiro." 
      });
    }
    
    // Get supplier's products (both individual and pattern-based)
    const supplierLinks = await db
      .prepare("SELECT * FROM supplier_products WHERE supplier_id = ?")
      .bind(supplierId)
      .all();
    
    const individualProductIds = supplierLinks.results
      ?.filter((l: any) => l.link_type === "individual" && l.product_id)
      .map((l: any) => l.product_id) || [];
    
    const skuPatterns = supplierLinks.results
      ?.filter((l: any) => l.link_type === "pattern" && l.sku_pattern)
      .map((l: any) => l.sku_pattern) || [];
    
    // Get all sales data from last 30 days (most recent month)
    // Group by SKU to handle duplicate entries
    const salesData = await db
      .prepare(`
        SELECT 
          sd.sku,
          sd.name,
          SUM(sd.units) as units,
          SUM(sd.revenue) as revenue
        FROM spreadsheet_data sd
        WHERE sd.month_year = ?
        GROUP BY sd.sku, sd.name
      `)
      .bind(latestMonth.month_year)
      .all();
    
    if (!salesData.results || salesData.results.length === 0) {
      return c.json({ 
        items: [], 
        message: "Nenhum dado de vendas encontrado para o mês mais recente." 
      });
    }
    
    // Get all products with stock info and images
    const allProducts = await db
      .prepare(`
        SELECT 
          p.id,
          p.sku,
          p.name,
          p.stock,
          p.product_type,
          p.image_url
        FROM products p
        WHERE p.is_deleted = 0 OR p.is_deleted IS NULL
      `)
      .all();
    
    const productsMap = new Map(
      (allProducts.results || []).map((p: any) => [p.sku, p])
    );
    
    // Get production queue status
    const productionQueue = await db
      .prepare(`
        SELECT sku, is_in_production
        FROM supplier_production_queue
        WHERE supplier_id = ?
      `)
      .bind(supplierId)
      .all();
    
    const productionStatusMap = new Map(
      (productionQueue.results || []).map((pq: any) => [
        pq.sku, 
        pq.is_in_production === 1
      ])
    );
    
    // Filter sales data to only supplier's products
    const supplierSalesData = (salesData.results || []).filter((sale: any) => {
      const product = productsMap.get(sale.sku);
      if (!product) return false;
      
      // Check individual product links
      if (individualProductIds.includes(product.id)) return true;
      
      // Check SKU pattern links
      for (const pattern of skuPatterns) {
        if (sale.sku.startsWith(pattern)) return true;
      }
      
      return false;
    });
    
    // Calculate all revenues for ABC curve classification
    const allRevenues = supplierSalesData.map((s: any) => s.revenue || 0);
    
    // Analyze each product
    const forecastItems: ForecastItem[] = [];
    
    for (const sale of supplierSalesData) {
      const product = productsMap.get(sale.sku);
      if (!product) continue;
      
      const units = Number(sale.units) || 0;
      const revenue = Number(sale.revenue) || 0;
      
      // Skip if less than 10 sales in last 30 days
      if (units < 10) continue;
      
      const currentStock = Number(product.stock) || 0;
      const avgDailySales = units / 30; // Approximate daily sales
      const daysOfCoverage = avgDailySales > 0 ? currentStock / avgDailySales : 999;
      
      // Determine if product needs production
      let needsProduction = false;
      let reason = "";
      let quantityNeeded = 0;
      
      // Case 1: No stock and has sales
      if (currentStock === 0) {
        needsProduction = true;
        reason = "sem_estoque";
        // Calculate for 30 days of coverage
        quantityNeeded = Math.ceil(avgDailySales * 30);
      }
      // Case 2: Low stock for next 7 days
      else if (daysOfCoverage < 7) {
        needsProduction = true;
        reason = "estoque_baixo";
        // Calculate to reach 30 days coverage
        const targetStock = Math.ceil(avgDailySales * 30);
        quantityNeeded = Math.max(0, targetStock - currentStock);
      }
      
      if (!needsProduction) continue;
      
      const abcCurve = calculateABCCurve(revenue, allRevenues);
      const priorityScore = calculatePriorityScore(
        abcCurve,
        currentStock,
        avgDailySales,
        daysOfCoverage
      );
      
      const isInProduction = productionStatusMap.get(sale.sku) || false;
      
      forecastItems.push({
        sku: String(sale.sku),
        productName: String(product.name),
        productImage: product.image_url || null,
        currentStock,
        avgDailySales,
        last30DaysSales: units,
        quantityNeeded,
        abcCurve,
        reason,
        priorityScore,
        isInProduction,
      });
    }
    
    // Sort by priority score (highest first)
    forecastItems.sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Apply filter
    let filteredItems = forecastItems;
    if (filterTag === "with_tag") {
      filteredItems = forecastItems.filter(item => item.isInProduction);
    } else if (filterTag === "without_tag") {
      filteredItems = forecastItems.filter(item => !item.isInProduction);
    }
    
    return c.json({ 
      items: filteredItems,
      total: forecastItems.length,
      in_production: forecastItems.filter(i => i.isInProduction).length,
      latest_data_month: latestMonth.month_year,
    });
  } catch (error) {
    console.error("Error generating forecast:", error);
    return c.json({ error: "Erro ao gerar previsão" }, 500);
  }
});

// Mark products as in production
app.post("/:supplier_id/mark-production", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplier_id");
    const { skus } = await c.req.json<{ skus: string[] }>();
    
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return c.json({ error: "Lista de SKUs inválida" }, 400);
    }
    
    const timestamp = new Date().toISOString();
    
    // Insert or update production queue
    for (const sku of skus) {
      // Check if already exists
      const existing = await db
        .prepare(`
          SELECT id FROM supplier_production_queue 
          WHERE supplier_id = ? AND sku = ?
        `)
        .bind(supplierId, sku)
        .first();
      
      if (existing) {
        // Update existing
        await db
          .prepare(`
            UPDATE supplier_production_queue 
            SET is_in_production = 1, 
                marked_production_at = ?,
                updated_at = ?
            WHERE supplier_id = ? AND sku = ?
          `)
          .bind(timestamp, timestamp, supplierId, sku)
          .run();
      } else {
        // Get product info
        const product = await db
          .prepare("SELECT name FROM products WHERE sku = ?")
          .bind(sku)
          .first<{ name: string }>();
        
        if (!product) continue;
        
        // Insert new
        await db
          .prepare(`
            INSERT INTO supplier_production_queue (
              supplier_id, sku, product_name, quantity_needed,
              priority_score, abc_curve, reason, is_in_production,
              marked_production_at
            ) VALUES (?, ?, ?, 0, 0, 'C', 'manual', 1, ?)
          `)
          .bind(supplierId, sku, product.name, timestamp)
          .run();
      }
    }
    
    return c.json({ 
      message: `${skus.length} produto(s) marcado(s) como em produção` 
    });
  } catch (error) {
    console.error("Error marking production:", error);
    return c.json({ error: "Erro ao marcar produtos" }, 500);
  }
});

// Remove production tag
app.post("/:supplier_id/unmark-production", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplier_id");
    const { skus } = await c.req.json<{ skus: string[] }>();
    
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return c.json({ error: "Lista de SKUs inválida" }, 400);
    }
    
    const timestamp = new Date().toISOString();
    
    for (const sku of skus) {
      await db
        .prepare(`
          UPDATE supplier_production_queue 
          SET is_in_production = 0, updated_at = ?
          WHERE supplier_id = ? AND sku = ?
        `)
        .bind(timestamp, supplierId, sku)
        .run();
    }
    
    return c.json({ 
      message: `${skus.length} produto(s) desmarcado(s)` 
    });
  } catch (error) {
    console.error("Error unmarking production:", error);
    return c.json({ error: "Erro ao desmarcar produtos" }, 500);
  }
});

export default app;
