import { Hono } from "hono";
import type { AppContext } from "../types";

const analytics = new Hono<AppContext>();

// Get all spreadsheet data (historical)
analytics.get("/spreadsheets", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    
    if (!userId || !companyId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const spreadsheets = await db
      .prepare(
        `SELECT * FROM spreadsheet_history 
         WHERE user_id = ? AND company_id = ? 
         ORDER BY month_year DESC`
      )
      .bind(userId, companyId)
      .all();

    return c.json({ spreadsheets: spreadsheets.results || [] });
  } catch (error) {
    console.error("Error fetching spreadsheets:", error);
    return c.json({ error: "Failed to fetch spreadsheets" }, 500);
  }
});

// Get aggregated product data
analytics.get("/products", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    
    if (!userId || !companyId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const period = c.req.query("period") || "30D";
    const monthYear = c.req.query("month_year");
    
    // Calcular quais meses incluir baseado no período
    let monthsToInclude = 1;
    let monthYears: string[];
    
    if (monthYear) {
      // Mês específico
      monthYears = [monthYear];
    } else {
      // Período dinâmico
      switch (period) {
        case "30D":
          monthsToInclude = 1;
          break;
        case "60D":
          monthsToInclude = 2;
          break;
        case "90D":
        case "3M":
          monthsToInclude = 3;
          break;
        case "6M":
          monthsToInclude = 6;
          break;
        case "12M":
          monthsToInclude = 12;
          break;
      }
      
      // Buscar os N meses mais recentes
      const recentMonths = await db
        .prepare(
          `SELECT month_year FROM spreadsheet_history 
           WHERE user_id = ? AND company_id = ?
           ORDER BY month_year DESC 
           LIMIT ?`
        )
        .bind(userId, companyId, monthsToInclude)
        .all();
      
      if (!recentMonths.results || recentMonths.results.length === 0) {
        return c.json({ products: [] });
      }
      
      monthYears = (recentMonths.results as any[]).map(m => m.month_year);
    }
    
    const placeholders = monthYears.map(() => "?").join(",");
    
    // Buscar dados de vendas agregados
    const salesData = await db
      .prepare(
        `SELECT 
          sd.sku,
          sd.company_id,
          COALESCE(p.name, MAX(sd.name)) as name,
          SUM(sd.units) as units,
          SUM(sd.revenue) as revenue,
          p.product_type,
          CASE WHEN p.sku IS NULL THEN 1 ELSE 0 END as notFound
         FROM spreadsheet_data sd
         LEFT JOIN products p ON sd.sku = p.sku AND p.company_id = sd.company_id AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
         WHERE sd.month_year IN (${placeholders}) AND sd.user_id = ? AND sd.company_id = ?
         GROUP BY sd.sku, sd.company_id
         ORDER BY units DESC`
      )
      .bind(...monthYears, userId, companyId)
      .all();

    if (!salesData.results || salesData.results.length === 0) {
      return c.json({ products: [] });
    }

    // Criar um mapa de produtos para acumular vendas
    const productMap = new Map<string, any>();
    
    // Inicializar mapa com dados de vendas
    for (const sale of salesData.results as any[]) {
      productMap.set(sale.sku, {
        sku: sale.sku,
        name: sale.name,
        units: sale.units || 0,
        revenue: sale.revenue || 0,
        notFound: sale.notFound === 1, // Use the calculated notFound from the JOIN
        product_type: sale.product_type,
      });
    }

    // Identificar e processar kits
    const kitsToRemove = new Set<string>();
    
    for (const sale of salesData.results as any[]) {
      if (sale.product_type === "kit") {
        // Buscar componentes do kit
        const kitComponents = await db
          .prepare(
            `SELECT k.component_sku, k.quantity, p.cost_price
             FROM product_kit_items k
             LEFT JOIN products p ON k.component_sku = p.sku AND p.company_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
             WHERE k.kit_sku = ?`
          )
          .bind(companyId, sale.sku)
          .all();

        if (!kitComponents.results || kitComponents.results.length === 0) {
          continue; // Kit sem componentes, manter como está
        }

        // Calcular custo total do kit
        let totalCost = 0;
        for (const component of kitComponents.results as any[]) {
          const cost = (component.cost_price || 0) * (component.quantity || 1);
          totalCost += cost;
        }

        if (totalCost === 0) {
          continue; // Sem custo definido, não é possível ratear
        }

        const kitUnits = sale.units || 0;
        const kitRevenue = sale.revenue || 0;

        // Ratear receita e unidades para cada componente
        for (const component of kitComponents.results as any[]) {
          const componentCost = (component.cost_price || 0) * (component.quantity || 1);
          const percentage = componentCost / totalCost;
          
          // Receita rateada para este componente
          const allocatedRevenue = kitRevenue * percentage;
          
          // Unidades vendidas = quantidade do componente × unidades do kit
          const allocatedUnits = (component.quantity || 1) * kitUnits;

          // Buscar ou criar entrada para o componente
          const componentSku = component.component_sku;
          let componentData = productMap.get(componentSku);
          
          if (!componentData) {
            // Componente não tem vendas diretas, criar entrada
            const componentProduct = await db
              .prepare(
                `SELECT name FROM products WHERE sku = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
              )
              .bind(componentSku, companyId)
              .first() as any;

            componentData = {
              sku: componentSku,
              name: componentProduct?.name || `Componente ${componentSku}`,
              units: 0,
              revenue: 0,
              notFound: !componentProduct, // Boolean: true if product not found
              product_type: "simple",
            };
            productMap.set(componentSku, componentData);
          }

          // Adicionar vendas do kit aos componentes
          componentData.units += allocatedUnits;
          componentData.revenue += allocatedRevenue;
        }

        // Marcar kit para remoção
        kitsToRemove.add(sale.sku);
      }
    }

    // Remover kits da listagem final e calcular avgPrice
    const finalProducts = Array.from(productMap.values())
      .filter(p => !kitsToRemove.has(p.sku))
      .map(p => ({
        sku: p.sku,
        name: p.name,
        units: p.units,
        revenue: p.revenue,
        avgPrice: p.units > 0 ? p.revenue / p.units : 0,
        notFound: p.notFound,
      }))
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

    return c.json({ products: finalProducts });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

// Upload spreadsheet data
analytics.post("/spreadsheets", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    
    console.log("[Analytics Upload] Starting upload", { userId, companyId });
    
    if (!userId || !companyId) {
      console.error("[Analytics Upload] Missing userId or companyId", { userId, companyId });
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { monthYear, monthLabel, data } = body;
    
    console.log("[Analytics Upload] Request data", { 
      monthYear, 
      monthLabel, 
      dataLength: data?.length,
      hasData: Array.isArray(data)
    });

    if (!monthYear || !monthLabel || !Array.isArray(data)) {
      console.error("[Analytics Upload] Invalid request body", { monthYear, monthLabel, dataIsArray: Array.isArray(data) });
      return c.json({ error: "Invalid request body" }, 400);
    }

    // WORKAROUND: Due to UNIQUE constraint on month_year only (not month_year+user_id+company_id),
    // we need to delete ANY existing records for this month first, then insert our new one.
    // This allows each user/company to have their own data for each month.
    console.log("[Analytics Upload] Checking for existing spreadsheet", { monthYear, userId, companyId });
    
    const existingForThisUser = await db
      .prepare(`SELECT id FROM spreadsheet_history WHERE month_year = ? AND user_id = ? AND company_id = ?`)
      .bind(monthYear, userId, companyId)
      .first();
    
    const existingForOthers = await db
      .prepare(`SELECT id, user_id, company_id FROM spreadsheet_history WHERE month_year = ? AND (user_id != ? OR company_id != ?)`)
      .bind(monthYear, userId, companyId)
      .first();
    
    console.log("[Analytics Upload] Existing check result", { 
      foundForThisUser: !!existingForThisUser,
      foundForOthers: !!existingForOthers
    });

    // Start transaction
    const batch = [
      // Delete existing data for this user/company
      db.prepare(`DELETE FROM spreadsheet_data WHERE month_year = ? AND user_id = ? AND company_id = ?`).bind(monthYear, userId, companyId),
    ];

    if (existingForOthers) {
      // Delete records from other users/companies to free the month_year constraint
      batch.push(
        db.prepare(`DELETE FROM spreadsheet_data WHERE month_year = ?`).bind(monthYear)
      );
      batch.push(
        db.prepare(`DELETE FROM spreadsheet_history WHERE month_year = ?`).bind(monthYear)
      );
    } else if (existingForThisUser) {
      // Update existing record for this user
      batch.push(
        db.prepare(
          `UPDATE spreadsheet_history 
           SET month_label = ?, uploaded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE month_year = ? AND user_id = ? AND company_id = ?`
        ).bind(monthLabel, monthYear, userId, companyId)
      );
    }
    
    if (!existingForThisUser || existingForOthers) {
      // Insert new record (either first time or after deleting others' records)
      batch.push(
        db.prepare(
          `INSERT INTO spreadsheet_history (month_year, month_label, user_id, company_id, uploaded_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(monthYear, monthLabel, userId, companyId)
      );
    }
    
    // Insert new data (including slot_number with default value 0 for compatibility)
    batch.push(
      ...data.map((item: any) =>
        db.prepare(
          `INSERT INTO spreadsheet_data (slot_number, month_year, sku, name, units, revenue, avg_price, not_found, user_id, company_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          0, // slot_number (deprecated, using 0 as default)
          monthYear,
          item.sku,
          item.name,
          item.units,
          item.revenue,
          item.avgPrice,
          item.notFound ? 1 : 0,
          userId,
          companyId
        )
      )
    );

    console.log("[Analytics Upload] Executing batch", { statementCount: batch.length });
    await db.batch(batch);
    console.log("[Analytics Upload] Batch executed successfully");

    // Limpar planilhas antigas (manter apenas últimos 36 meses por usuário e empresa)
    const oldMonths = await db
      .prepare(
        `SELECT month_year FROM spreadsheet_history 
         WHERE user_id = ? AND company_id = ?
         ORDER BY month_year DESC 
         LIMIT -1 OFFSET 36`
      )
      .bind(userId, companyId)
      .all();

    if (oldMonths.results && oldMonths.results.length > 0) {
      const toDelete = (oldMonths.results as any[]).map(m => m.month_year);
      const deletePlaceholders = toDelete.map(() => "?").join(",");
      
      await db.batch([
        db.prepare(`DELETE FROM spreadsheet_data WHERE month_year IN (${deletePlaceholders}) AND user_id = ? AND company_id = ?`).bind(...toDelete, userId, companyId),
        db.prepare(`DELETE FROM spreadsheet_history WHERE month_year IN (${deletePlaceholders}) AND user_id = ? AND company_id = ?`).bind(...toDelete, userId, companyId),
      ]);
    }

    console.log("[Analytics Upload] Upload completed successfully", { monthYear, monthLabel, updated: !!existingForThisUser });
    return c.json({ message: "Spreadsheet uploaded successfully", updated: !!existingForThisUser });
  } catch (error: any) {
    console.error("[Analytics Upload] Error uploading spreadsheet:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      cause: error?.cause,
    });
    return c.json({ 
      error: "Failed to upload spreadsheet",
      details: error?.message || "Unknown error"
    }, 500);
  }
});

// Get comparison data between two months
analytics.get("/compare", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    
    if (!userId || !companyId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const monthA = c.req.query("month_a");
    const monthB = c.req.query("month_b");

    if (!monthA || !monthB) {
      return c.json({ error: "Both month_a and month_b are required" }, 400);
    }

    // Get data for both months
    const [dataA, dataB] = await Promise.all([
      db.prepare(
        `SELECT 
          sd.sku,
          COALESCE(p.name, MAX(sd.name)) as name,
          SUM(sd.units) as units,
          SUM(sd.revenue) as revenue,
          SUM(sd.revenue) / SUM(sd.units) as avgPrice
         FROM spreadsheet_data sd
         LEFT JOIN products p ON sd.sku = p.sku AND p.company_id = sd.company_id AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
         WHERE sd.month_year = ? AND sd.user_id = ? AND sd.company_id = ?
         GROUP BY sd.sku`
      ).bind(monthA, userId, companyId).all(),
      db.prepare(
        `SELECT 
          sd.sku,
          COALESCE(p.name, MAX(sd.name)) as name,
          SUM(sd.units) as units,
          SUM(sd.revenue) as revenue,
          SUM(sd.revenue) / SUM(sd.units) as avgPrice
         FROM spreadsheet_data sd
         LEFT JOIN products p ON sd.sku = p.sku AND p.company_id = sd.company_id AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
         WHERE sd.month_year = ? AND sd.user_id = ? AND sd.company_id = ?
         GROUP BY sd.sku`
      ).bind(monthB, userId, companyId).all(),
    ]);

    // Calculate totals for each month
    const totalsA = {
      units: (dataA.results as any[] || []).reduce((sum, p) => sum + (p.units || 0), 0),
      revenue: (dataA.results as any[] || []).reduce((sum, p) => sum + (p.revenue || 0), 0),
      uniqueSkus: (dataA.results as any[] || []).length,
    };

    const totalsB = {
      units: (dataB.results as any[] || []).reduce((sum, p) => sum + (p.units || 0), 0),
      revenue: (dataB.results as any[] || []).reduce((sum, p) => sum + (p.revenue || 0), 0),
      uniqueSkus: (dataB.results as any[] || []).length,
    };

    return c.json({
      monthA: {
        monthYear: monthA,
        totals: totalsA,
        avgPrice: totalsA.units > 0 ? totalsA.revenue / totalsA.units : 0,
      },
      monthB: {
        monthYear: monthB,
        totals: totalsB,
        avgPrice: totalsB.units > 0 ? totalsB.revenue / totalsB.units : 0,
      },
      comparison: {
        unitsDiff: totalsB.units - totalsA.units,
        unitsPercent: totalsA.units > 0 ? ((totalsB.units - totalsA.units) / totalsA.units) * 100 : 0,
        revenueDiff: totalsB.revenue - totalsA.revenue,
        revenuePercent: totalsA.revenue > 0 ? ((totalsB.revenue - totalsA.revenue) / totalsA.revenue) * 100 : 0,
        skusDiff: totalsB.uniqueSkus - totalsA.uniqueSkus,
        skusPercent: totalsA.uniqueSkus > 0 ? ((totalsB.uniqueSkus - totalsA.uniqueSkus) / totalsA.uniqueSkus) * 100 : 0,
      },
    });
  } catch (error) {
    console.error("Error comparing months:", error);
    return c.json({ error: "Failed to compare months" }, 500);
  }
});

// Delete spreadsheet data for a specific month
analytics.delete("/spreadsheets/:monthYear", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    
    if (!userId || !companyId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const monthYear = c.req.param("monthYear");

    if (!monthYear) {
      return c.json({ error: "Invalid month_year" }, 400);
    }

    await db.batch([
      db.prepare(`DELETE FROM spreadsheet_data WHERE month_year = ? AND user_id = ? AND company_id = ?`).bind(monthYear, userId, companyId),
      db.prepare(`DELETE FROM spreadsheet_history WHERE month_year = ? AND user_id = ? AND company_id = ?`).bind(monthYear, userId, companyId),
    ]);

    return c.json({ message: "Spreadsheet removed successfully" });
  } catch (error) {
    console.error("Error removing spreadsheet:", error);
    return c.json({ error: "Failed to remove spreadsheet" }, 500);
  }
});

// Get restock recommendations
analytics.get("/restock-recommendations", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    
    if (!userId || !companyId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const period = c.req.query("period") || "30D";
    const includeInactive = c.req.query("includeInactive") === "true";
    
    // Determine months and days based on period
    // daysForAverage: real days of data
    // targetDays: desired days of stock to maintain
    let monthsToInclude = 1;
    let daysForAverage = 30;
    let targetDays = 30;
    
    switch (period) {
      case "7D":
        monthsToInclude = 1;
        daysForAverage = 30;
        targetDays = 7;
        break;
      case "15D":
        monthsToInclude = 1;
        daysForAverage = 30;
        targetDays = 15;
        break;
      case "30D":
        monthsToInclude = 1;
        daysForAverage = 30;
        targetDays = 30;
        break;
      case "60D":
        monthsToInclude = 2;
        daysForAverage = 60;
        targetDays = 60;
        break;
      case "90D":
        monthsToInclude = 3;
        daysForAverage = 90;
        targetDays = 90;
        break;
    }
    
    // Get recent months
    const recentMonths = await db
      .prepare(
        `SELECT month_year FROM spreadsheet_history 
         WHERE user_id = ? AND company_id = ?
         ORDER BY month_year DESC 
         LIMIT ?`
      )
      .bind(userId, companyId, monthsToInclude)
      .all();
    
    if (!recentMonths.results || recentMonths.results.length === 0) {
      return c.json({ recommendations: [] });
    }
    
    const monthYears = (recentMonths.results as any[]).map(m => m.month_year);
    const placeholders = monthYears.map(() => "?").join(",");
    
    // Get sales data for the period
    const salesData = await db
      .prepare(
        `SELECT 
          sku,
          MAX(name) as name,
          SUM(units) as total_units,
          SUM(revenue) as total_revenue
         FROM spreadsheet_data 
         WHERE month_year IN (${placeholders}) AND user_id = ? AND company_id = ?
         GROUP BY sku`
      )
      .bind(...monthYears, userId, companyId)
      .all();

    // Get current stock from products table
    const productsQuery = includeInactive
      ? `SELECT sku, name, stock, price, status, image_url FROM products WHERE company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
      : `SELECT sku, name, stock, price, status, image_url FROM products WHERE company_id = ? AND status = 'Ativo' AND (is_deleted = 0 OR is_deleted IS NULL)`;
    
    const products = await db
      .prepare(productsQuery)
      .bind(companyId)
      .all();

    // Create a map of sales data
    const salesMap: Record<string, any> = {};
    if (salesData.results) {
      for (const sale of salesData.results as any[]) {
        salesMap[sale.sku] = sale;
      }
    }

    // Calculate ABC curve based on revenue
    const totalRevenue = (salesData.results as any[])?.reduce((sum, s) => sum + (s.total_revenue || 0), 0) || 0;
    const sortedBySales = [...(salesData.results as any[] || [])].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
    
    const abcMap: Record<string, string> = {};
    let cumulativeRevenue = 0;
    
    for (const sale of sortedBySales) {
      cumulativeRevenue += sale.total_revenue || 0;
      const percentage = (cumulativeRevenue / totalRevenue) * 100;
      
      if (percentage <= 80) {
        abcMap[sale.sku] = "A";
      } else if (percentage <= 95) {
        abcMap[sale.sku] = "B";
      } else {
        abcMap[sale.sku] = "C";
      }
    }

    // Calculate recommendations for all products (not just those with shortage)
    const recommendations: any[] = [];
    
    if (products.results) {
      for (const product of products.results as any[]) {
        const salesInfo = salesMap[product.sku];
        
        // Skip if no sales data
        if (!salesInfo || !salesInfo.total_units) continue;
        
        const totalUnits = salesInfo.total_units || 0;
        // Calculate average daily sales based on actual days of data
        const avgDailySales = totalUnits / daysForAverage;
        const currentStock = product.stock || 0;
        
        // Calculate days of stock available
        const daysOfStock = avgDailySales > 0 ? currentStock / avgDailySales : 999;
        const roundedDaysOfStock = daysOfStock >= 0.5 
          ? Math.round(daysOfStock) 
          : Math.floor(daysOfStock);
        
        // Calculate needed quantity for TARGET days of stock (not based on data days)
        const neededForTargetDays = Math.ceil(avgDailySales * targetDays);
        const shortage = Math.max(0, neededForTargetDays - currentStock);
        
        // Color coding for stock status
        let stockStatus: "critical" | "low" | "medium" | "good";
        if (roundedDaysOfStock < 7) {
          stockStatus = "critical"; // red
        } else if (roundedDaysOfStock <= 14) {
          stockStatus = "low"; // yellow
        } else if (roundedDaysOfStock <= 24) {
          stockStatus = "medium"; // orange
        } else {
          stockStatus = "good"; // green
        }
        
        // ABC curve
        const abcCurve = abcMap[product.sku] || "C";
        
        recommendations.push({
          sku: product.sku,
          name: product.name,
          abc_curve: abcCurve,
          current_stock: currentStock,
          needed_for_target: neededForTargetDays,
          shortage: shortage,
          days_of_stock: roundedDaysOfStock,
          stock_status: stockStatus,
          avg_daily_sales: parseFloat(avgDailySales.toFixed(2)),
          total_units_sold: totalUnits,
          product_status: product.status || "Ativo",
          image_url: product.image_url || null,
          urgency: "low", // Will be calculated after sorting
        });
      }
    }
    
    // Calculate urgency based on sales ranking
    // Sort by total units sold (descending) to get ranking
    const sortedByUnits = [...recommendations].sort((a, b) => b.total_units_sold - a.total_units_sold);
    const totalProducts = sortedByUnits.length;
    
    // Assign urgency based on position in ranking
    sortedByUnits.forEach((rec, index) => {
      const percentile = (index / totalProducts) * 100;
      let urgency: "high" | "medium" | "low";
      
      if (percentile < 33.33) {
        urgency = "high"; // Top 33% - most sold products
      } else if (percentile < 66.66) {
        urgency = "medium"; // Middle 33%
      } else {
        urgency = "low"; // Bottom 34% - least sold products
      }
      
      // Update urgency in original recommendations array
      const original = recommendations.find(r => r.sku === rec.sku);
      if (original) {
        original.urgency = urgency;
      }
    });
    
    // Sort by stock status (critical first), then by ABC curve (A first), then by shortage
    recommendations.sort((a, b) => {
      const statusOrder: Record<string, number> = { critical: 0, low: 1, medium: 2, good: 3 };
      const abcOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
      
      const aStatus = statusOrder[a.stock_status] ?? 4;
      const bStatus = statusOrder[b.stock_status] ?? 4;
      
      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }
      
      const aAbc = abcOrder[a.abc_curve] ?? 3;
      const bAbc = abcOrder[b.abc_curve] ?? 3;
      
      if (aAbc !== bAbc) {
        return aAbc - bAbc;
      }
      
      return b.shortage - a.shortage;
    });

    return c.json({ recommendations });
  } catch (error) {
    console.error("Error fetching restock recommendations:", error);
    return c.json({ error: "Failed to fetch restock recommendations" }, 500);
  }
});

export default analytics;
