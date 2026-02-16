import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import portalCancelOrder from "./portal-cancel-order";

const app = new Hono<{ Bindings: Env }>();

app.route("/orders", portalCancelOrder);

// JWT secret (in production, use env variable)
const JWT_SECRET = "portal_secret_key_change_in_production";

// Portal login
app.post("/login", async (c) => {
  try {
    const db = c.env.DB;
    const { portal_id, password } = await c.req.json();

    if (!portal_id || !password) {
      return c.json({ error: "ID do portal e senha são obrigatórios" }, 400);
    }

    // Find supplier by portal_id and password
    const supplier = await db
      .prepare(
        "SELECT * FROM suppliers WHERE portal_id = ? AND portal_password = ?"
      )
      .bind(portal_id, password)
      .first();

    if (!supplier) {
      return c.json({ error: "Credenciais inválidas" }, 401);
    }

    if (supplier.status !== "Ativo") {
      return c.json({ error: "Sua conta está inativa. Entre em contato com o administrador." }, 403);
    }

    // Generate JWT token
    const token = await sign(
      {
        supplier_id: supplier.id,
        portal_id: supplier.portal_id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      },
      JWT_SECRET
    );

    return c.json({
      message: "Login realizado com sucesso",
      token,
      supplier: {
        id: supplier.id,
        portal_id: supplier.portal_id,
        person_type: supplier.person_type,
        name: supplier.name,
        company_name: supplier.company_name,
        trade_name: supplier.trade_name,
        contact_email: supplier.contact_email,
        contact_phone: supplier.contact_phone,
        status: supplier.status,
      },
    });
  } catch (error) {
    console.error("Error during portal login:", error);
    return c.json({ error: "Erro ao realizar login" }, 500);
  }
});

// Get supplier orders
app.get("/orders", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Token não fornecido" }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET) as any;
    
    if (!payload.supplier_id) {
      return c.json({ error: "Token inválido" }, 401);
    }

    const db = c.env.DB;
    const supplierId = payload.supplier_id;
    const statusFilter = c.req.query("status");

    // Build query based on status filter
    let query = `
      SELECT 
        o.id,
        o.order_number,
        o.created_at as order_date,
        o.status,
        o.total_amount,
        o.is_urgent
      FROM orders o
      WHERE o.supplier_id = ? AND (o.is_deleted IS NULL OR o.is_deleted = 0)
    `;

    if (statusFilter === "production") {
      query += " AND o.status = 'Produção'";
    }

    query += `
      ORDER BY 
        CASE 
          WHEN o.status = 'Pendente' THEN 1
          WHEN o.status = 'Produção' THEN 2
          WHEN o.status = 'Trânsito' THEN 3
          WHEN o.status = 'Completo' THEN 4
          ELSE 5
        END,
        CASE 
          WHEN o.status IN ('Pendente', 'Produção', 'Trânsito') THEN o.created_at
          ELSE NULL
        END DESC,
        CASE 
          WHEN o.status = 'Completo' THEN o.created_at
          ELSE NULL
        END ASC
    `;

    // Get orders with items
    const orders = await db
      .prepare(query)
      .bind(supplierId)
      .all();

    // For each order, get items
    const ordersWithItems = await Promise.all(
      (orders.results || []).map(async (order: any) => {
        // For complete orders, include receipt data
        if (order.status === 'Completo') {
          const items = await db
            .prepare(`
              SELECT 
                oi.product_name,
                oi.sku,
                oi.quantity as quantity_ordered,
                COALESCE(orec.quantity_received, 0) as quantity_received,
                oi.unit_price,
                CASE 
                  WHEN orec.quantity_received IS NOT NULL THEN orec.quantity_received * oi.unit_price
                  ELSE 0
                END as total_price,
                p.image_url,
                p.product_id
              FROM order_items oi
              LEFT JOIN order_receipts orec ON oi.order_id = orec.order_id AND oi.product_id = orec.product_id
              LEFT JOIN products p ON oi.product_id = p.id
              WHERE oi.order_id = ?
            `)
            .bind(order.id)
            .all();

          // Get error items (items received but not ordered)
          const errorItems = await db
            .prepare(`
              SELECT 
                ore.product_name,
                ore.sku,
                0 as quantity_ordered,
                ore.quantity as quantity_received,
                ore.unit_cost as unit_price,
                ore.quantity * ore.unit_cost as total_price,
                p.image_url,
                p.product_id,
                ore.error_reason
              FROM order_receipt_errors ore
              LEFT JOIN products p ON ore.product_id = p.id
              WHERE ore.order_id = ?
            `)
            .bind(order.id)
            .all();

          const allItems = [
            ...(items.results || []),
            ...(errorItems.results || [])
          ];

          // Check if order has any error items
          const hasErrorItems = (errorItems.results?.length || 0) > 0 || 
            (items.results || []).some((item: any) => item.quantity_received === 0);

          return {
            ...order,
            items: allItems,
            has_error_items: hasErrorItems ? 1 : 0,
          };
        } else {
          // For non-complete orders, show original quantities
          const items = await db
            .prepare(`
              SELECT 
                oi.product_name,
                oi.sku,
                oi.quantity,
                oi.unit_price,
                oi.subtotal as total_price,
                p.image_url,
                p.product_id
              FROM order_items oi
              LEFT JOIN products p ON oi.product_id = p.id
              WHERE oi.order_id = ?
            `)
            .bind(order.id)
            .all();

          return {
            ...order,
            items: items.results || [],
          };
        }
      })
    );

    return c.json({
      orders: ordersWithItems,
    });
  } catch (error) {
    console.error("Error fetching portal orders:", error);
    return c.json({ error: "Erro ao buscar pedidos" }, 500);
  }
});

// Get supplier financial data (accounts payable)
app.get("/financeiro", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Token não fornecido" }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET) as any;
    
    if (!payload.supplier_id) {
      return c.json({ error: "Token inválido" }, 401);
    }

    const db = c.env.DB;
    const supplierId = payload.supplier_id;

    // Get all accounts payable for this supplier
    const accountsPayable = await db
      .prepare(`
        SELECT 
          ap.id,
          ap.description,
          ap.amount,
          ap.due_date,
          ap.competence_date,
          ap.paid_date as payment_date,
          ap.is_paid,
          ap.order_ids,
          ap.is_grouped,
          ap.grouped_order_number,
          CASE 
            WHEN ap.is_paid = 1 THEN 'paid'
            WHEN DATE(ap.due_date) < DATE('now') THEN 'overdue'
            ELSE 'pending'
          END as payment_status,
          CAST(julianday(ap.due_date) - julianday('now') AS INTEGER) as days_until_due
        FROM accounts_payable ap
        WHERE ap.supplier_id = ?
        ORDER BY 
          CASE 
            WHEN ap.is_paid = 0 AND DATE(ap.due_date) < DATE('now') THEN 1
            WHEN ap.is_paid = 0 THEN 2
            ELSE 3
          END,
          ap.due_date DESC
      `)
      .bind(supplierId)
      .all();

    // For each account payable, get order number from order_ids
    const accountsWithOrderNumbers = await Promise.all(
      (accountsPayable.results || []).map(async (account: any) => {
        let orderNumber = null;
        if (account.order_ids) {
          // Get first order ID from comma-separated list
          const firstOrderId = account.order_ids.split(',')[0];
          const order = await db
            .prepare("SELECT order_number FROM orders WHERE id = ?")
            .bind(firstOrderId)
            .first();
          orderNumber = order?.order_number || null;
        }
        return {
          ...account,
          order_number: orderNumber,
        };
      })
    );

    // Calculate stats
    const stats = await db
      .prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN is_paid = 0 THEN amount ELSE 0 END), 0) as total_pending,
          COALESCE(SUM(CASE WHEN is_paid = 0 AND DATE(due_date) < DATE('now') THEN amount ELSE 0 END), 0) as total_overdue,
          COALESCE(SUM(CASE WHEN is_paid = 1 AND strftime('%Y-%m', paid_date) = strftime('%Y-%m', 'now') THEN amount ELSE 0 END), 0) as total_paid_this_month
        FROM accounts_payable
        WHERE supplier_id = ?
      `)
      .bind(supplierId)
      .first();

    return c.json({
      accounts_payable: accountsWithOrderNumbers,
      stats: stats || { total_pending: 0, total_overdue: 0, total_paid_this_month: 0 },
    });
  } catch (error) {
    console.error("Error fetching portal financeiro data:", error);
    return c.json({ error: "Erro ao buscar dados financeiros" }, 500);
  }
});

// Get grouped order details
app.get("/grouped-order/:orderId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Token não fornecido" }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET) as any;
    
    if (!payload.supplier_id) {
      return c.json({ error: "Token inválido" }, 401);
    }

    const db = c.env.DB;
    const orderId = c.req.param("orderId");

    // Get order details
    const order = await db
      .prepare(`
        SELECT 
          o.id as order_id,
          o.order_number,
          o.created_at as order_date,
          o.total_amount
        FROM orders o
        WHERE o.id = ? AND o.supplier_id = ?
      `)
      .bind(orderId, payload.supplier_id)
      .first();

    if (!order) {
      return c.json({ error: "Pedido não encontrado" }, 404);
    }

    // Get order items
    const items = await db
      .prepare(`
        SELECT 
          oi.product_name,
          oi.sku,
          oi.quantity,
          oi.unit_price,
          oi.subtotal as total_price,
          p.image_url,
          p.product_id
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `)
      .bind(orderId)
      .all();

    return c.json({
      ...order,
      items: items.results || [],
    });
  } catch (error) {
    console.error("Error fetching grouped order details:", error);
    return c.json({ error: "Erro ao buscar detalhes do pedido" }, 500);
  }
});

// Verify token
app.get("/verify", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Token não fornecido" }, 401);
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    const payload = await verify(token, JWT_SECRET);
    
    if (!payload.supplier_id) {
      return c.json({ error: "Token inválido" }, 401);
    }

    // Get supplier data
    const db = c.env.DB;
    const supplier = await db
      .prepare("SELECT * FROM suppliers WHERE id = ?")
      .bind(payload.supplier_id)
      .first();

    if (!supplier) {
      return c.json({ error: "Fornecedor não encontrado" }, 404);
    }

    return c.json({
      valid: true,
      supplier: {
        id: supplier.id,
        portal_id: supplier.portal_id,
        person_type: supplier.person_type,
        name: supplier.name,
        company_name: supplier.company_name,
        trade_name: supplier.trade_name,
        contact_email: supplier.contact_email,
        contact_phone: supplier.contact_phone,
        status: supplier.status,
      },
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    return c.json({ error: "Token inválido" }, 401);
  }
});

// Get production forecast for supplier
app.get("/forecast", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Token não fornecido" }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET) as any;
    
    if (!payload.supplier_id) {
      return c.json({ error: "Token inválido" }, 401);
    }

    const db = c.env.DB;
    const supplierId = payload.supplier_id;
    const filterTag = c.req.query("filter") || "all"; // all, with_tag, without_tag
    
    console.log("[Forecast] supplierId:", supplierId);
    
    // Get supplier info to get company_id
    const supplier = await db
      .prepare("SELECT company_id FROM suppliers WHERE id = ?")
      .bind(supplierId)
      .first<{ company_id: number }>();
    
    if (!supplier) {
      return c.json({ error: "Fornecedor não encontrado" }, 404);
    }
    
    const companyId = supplier.company_id;
    console.log("[Forecast] companyId:", companyId);
    
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
    
    console.log("[Forecast] latestMonth:", latestMonth);
    
    if (!latestMonth) {
      return c.json({ 
        items: [], 
        message: "Nenhuma planilha de vendas encontrada." 
      });
    }
    
    // Get supplier's products (both individual and pattern-based)
    const supplierLinks = await db
      .prepare("SELECT * FROM supplier_products WHERE supplier_id = ?")
      .bind(supplierId)
      .all();
    
    console.log("[Forecast] supplierLinks count:", supplierLinks.results?.length || 0);
    console.log("[Forecast] supplierLinks:", supplierLinks.results);
    
    const individualProductIds = supplierLinks.results
      ?.filter((l: any) => l.link_type === "individual" && l.product_id)
      .map((l: any) => l.product_id) || [];
    
    const skuPatterns = supplierLinks.results
      ?.filter((l: any) => l.link_type === "pattern" && l.sku_pattern)
      .map((l: any) => l.sku_pattern) || [];
    
    // Get all sales data from last 30 days (most recent month)
    const salesData = await db
      .prepare(`
        SELECT 
          sd.sku,
          MAX(sd.name) as name,
          SUM(sd.units) as units,
          SUM(sd.revenue) as revenue
        FROM spreadsheet_data sd
        WHERE sd.month_year = ?
        GROUP BY sd.sku
      `)
      .bind(latestMonth.month_year)
      .all();
    
    console.log("[Forecast] salesData count:", salesData.results?.length || 0);
    
    if (!salesData.results || salesData.results.length === 0) {
      return c.json({ 
        items: [], 
        message: "Nenhum dado de vendas encontrado." 
      });
    }
    
    // Get all products with stock info and images (only from supplier's company)
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
        WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL) AND p.company_id = ?
      `)
      .bind(companyId)
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
    
    console.log("[Forecast] individualProductIds:", individualProductIds);
    console.log("[Forecast] skuPatterns:", skuPatterns);
    console.log("[Forecast] supplierSalesData count:", supplierSalesData.length);
    
    // Calculate all revenues for ABC curve classification
    const allRevenues = supplierSalesData.map((s: any) => s.revenue || 0);
    
    // Calculate ABC curve
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
    
    // Calculate priority score
    function calculatePriorityScore(
      abcCurve: "A" | "B" | "C",
      currentStock: number,
      avgDailySales: number,
      daysOfCoverage: number
    ): number {
      let score = 0;
      
      if (abcCurve === "A") score += 300;
      else if (abcCurve === "B") score += 200;
      else score += 100;
      
      if (currentStock === 0) {
        score += 1000;
      } else {
        const criticalityPoints = Math.max(0, 500 - (daysOfCoverage * 50));
        score += criticalityPoints;
      }
      
      score += Math.min(avgDailySales * 10, 200);
      
      return Math.round(score);
    }
    
    // Analyze each product
    const forecastItems: any[] = [];
    
    for (const sale of supplierSalesData) {
      const product = productsMap.get(sale.sku);
      if (!product) continue;
      
      const units = Number(sale.units) || 0;
      const revenue = Number(sale.revenue) || 0;
      
      // Skip if less than 10 sales in last 30 days
      if (units < 10) continue;
      
      const currentStock = Number(product.stock) || 0;
      const avgDailySales = units / 30;
      const daysOfCoverage = avgDailySales > 0 ? currentStock / avgDailySales : 999;
      
      let needsProduction = false;
      let reason = "";
      let quantityNeeded = 0;
      
      if (currentStock === 0) {
        needsProduction = true;
        reason = "sem_estoque";
        quantityNeeded = Math.ceil(avgDailySales * 30);
      } else if (daysOfCoverage < 7) {
        needsProduction = true;
        reason = "estoque_baixo";
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
    
    // Sort by priority score
    forecastItems.sort((a, b) => b.priorityScore - a.priorityScore);
    
    console.log("[Forecast] forecastItems count before dedup:", forecastItems.length);
    
    // Deduplicate by SKU - keep only the highest priority item for each SKU
    const deduplicatedItems: any[] = [];
    const seenSkus = new Set<string>();
    
    for (const item of forecastItems) {
      if (!seenSkus.has(item.sku)) {
        seenSkus.add(item.sku);
        deduplicatedItems.push(item);
      }
    }
    
    console.log("[Forecast] deduplicatedItems count:", deduplicatedItems.length);
    
    // Apply filter
    let filteredItems = deduplicatedItems;
    if (filterTag === "with_tag") {
      filteredItems = deduplicatedItems.filter(item => item.isInProduction);
    } else if (filterTag === "without_tag") {
      filteredItems = deduplicatedItems.filter(item => !item.isInProduction);
    }
    
    console.log("[Forecast] filteredItems count:", filteredItems.length);
    console.log("[Forecast] Returning response with", filteredItems.length, "items");
    
    return c.json({ 
      items: filteredItems,
      total: deduplicatedItems.length,
      in_production: deduplicatedItems.filter(i => i.isInProduction).length,
      latest_data_month: latestMonth.month_year,
    });
  } catch (error) {
    console.error("Error generating forecast:", error);
    return c.json({ error: "Erro ao gerar previsão" }, 500);
  }
});

// Mark products as in production
app.post("/forecast/mark-production", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Token não fornecido" }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET) as any;
    
    if (!payload.supplier_id) {
      return c.json({ error: "Token inválido" }, 401);
    }

    const db = c.env.DB;
    const supplierId = payload.supplier_id;
    const { skus } = await c.req.json<{ skus: string[] }>();
    
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return c.json({ error: "Lista de SKUs inválida" }, 400);
    }
    
    const timestamp = new Date().toISOString();
    
    for (const sku of skus) {
      const existing = await db
        .prepare(`
          SELECT id FROM supplier_production_queue 
          WHERE supplier_id = ? AND sku = ?
        `)
        .bind(supplierId, sku)
        .first();
      
      if (existing) {
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
        const product = await db
          .prepare("SELECT name FROM products WHERE sku = ?")
          .bind(sku)
          .first<{ name: string }>();
        
        if (!product) continue;
        
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
app.post("/forecast/unmark-production", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Token não fornecido" }, 401);
    }

    const token = authHeader.substring(7);
    const payload = await verify(token, JWT_SECRET) as any;
    
    if (!payload.supplier_id) {
      return c.json({ error: "Token inválido" }, 401);
    }

    const db = c.env.DB;
    const supplierId = payload.supplier_id;
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
