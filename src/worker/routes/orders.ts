import { Hono } from "hono";
import type { AppContext } from "../types";
import { getUserIdFromToken } from "../middleware/auth";
import { getCompanyId } from "../middleware/company";
import * as XLSX from "xlsx";

const app = new Hono<AppContext>();

// Upload spreadsheet and create order
app.post("/upload-spreadsheet", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    
    // Get the uploaded file
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const applyRoundingStr = formData.get("applyRounding") as string;
    const applyRounding = applyRoundingStr === "true";
    const stockPeriod = formData.get("stockPeriod") as string;
    const useColumnHStr = formData.get("useColumnH") as string;
    const useColumnH = useColumnHStr === "true";
    
    if (!file) {
      return c.json({ error: "Nenhum arquivo enviado" }, 400);
    }
    
    // Read file as array buffer
    const buffer = await file.arrayBuffer();
    
    // Parse XLSX
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    if (!data || data.length < 2) {
      return c.json({ error: "Planilha vazia ou sem dados" }, 400);
    }
    
    // Skip header row (index 0) and process data rows
    const itemsBySupplier: Map<number, any[]> = new Map();
    const notFoundSkus: string[] = [];
    const skusWithoutSupplier: string[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 7) continue;
      
      const sku = String(row[0] || "").trim();
      const quantityColumnIndex = useColumnH ? 7 : 6; // Column H (index 7) or G (index 6)
      const rawQuantity = parseInt(String(row[quantityColumnIndex] || "0"));
      
      if (!sku || rawQuantity <= 0) continue;
      
      // Look up product by SKU first
      const product = await db
        .prepare("SELECT * FROM products WHERE sku = ? AND company_id = ?")
        .bind(sku, companyId)
        .first();
      
      if (!product) {
        notFoundSkus.push(sku);
        continue;
      }
      
      let finalQuantity = rawQuantity;
      
      // If stock period is selected, calculate based on analytics data
      if (stockPeriod) {
        // Get sales from analytics (slot 3 = last 30 days)
        const salesData = await db
          .prepare(`
            SELECT SUM(units) as total_units
            FROM spreadsheet_data
            WHERE slot_number = 3 AND sku = ?
          `)
          .bind(sku)
          .first();
        
        const soldIn30Days = parseInt(salesData?.total_units as string) || 0;
        
        if (soldIn30Days > 0) {
          // Calculate average daily sales (vendas dos últimos 30 dias / 30)
          const avgDailySales = soldIn30Days / 30;
          
          // Determine target days based on period
          const targetDays = stockPeriod === "7D" ? 7 : stockPeriod === "15D" ? 15 : 30;
          
          // Calculate needed quantity for target period (média diária * dias desejados)
          const neededForPeriod = avgDailySales * targetDays;
          
          // Get current stock
          const currentStock = parseInt(product.stock as string) || 0;
          
          // Calculate final quantity: (needed for period) + (order quantity) - (current stock)
          // Exemplo: (64.63) + (7) - (5) = 66.63 → arredonda para cima = 67
          const calculatedQty = Math.ceil(neededForPeriod + rawQuantity - currentStock);
          
          // Use calculated quantity if positive, otherwise use raw quantity
          finalQuantity = Math.max(calculatedQty, 0);
        }
      }
      
      // Apply rounding rules if enabled: 1-14→10, 15-24→20, etc.
      const quantity = applyRounding ? roundToMultipleOf10(finalQuantity) : finalQuantity;
      
      // Get supplier for this product (check individual links first)
      let supplierId: number | null = null;
      
      const individualLink = await db
        .prepare(`
          SELECT sp.supplier_id 
          FROM supplier_products sp
          INNER JOIN suppliers s ON sp.supplier_id = s.id
          WHERE sp.product_id = ? AND sp.link_type = 'individual' AND s.company_id = ?
          LIMIT 1
        `)
        .bind(product.id, companyId)
        .first();
      
      if (individualLink) {
        supplierId = individualLink.supplier_id as number;
      } else {
        // Check pattern-based links
        const allPatterns = await db
          .prepare(`
            SELECT sp.supplier_id, sp.sku_pattern 
            FROM supplier_products sp
            INNER JOIN suppliers s ON sp.supplier_id = s.id
            WHERE sp.link_type = 'pattern' AND s.company_id = ?
          `)
          .bind(companyId)
          .all();
        
        for (const pattern of (allPatterns.results || [])) {
          const skuPattern = pattern.sku_pattern as string;
          if (sku.startsWith(skuPattern)) {
            supplierId = pattern.supplier_id as number;
            break;
          }
        }
      }
      
      if (!supplierId) {
        skusWithoutSupplier.push(sku);
        continue;
      }
      const price = parseFloat(product.cost_price as string) || 0;
      const subtotal = quantity * price;
      
      const item = {
        product_id: product.id,
        sku: product.sku,
        product_name: product.name,
        quantity: quantity,
        unit_price: price,
        purchase_cost: price,
        subtotal: subtotal,
      };
      
      if (!itemsBySupplier.has(supplierId)) {
        itemsBySupplier.set(supplierId, []);
      }
      itemsBySupplier.get(supplierId)!.push(item);
    }
    
    if (itemsBySupplier.size === 0) {
      const errors = [];
      if (notFoundSkus.length > 0) {
        errors.push(`SKUs não encontrados: ${notFoundSkus.join(", ")}`);
      }
      if (skusWithoutSupplier.length > 0) {
        errors.push(`SKUs sem fornecedor vinculado: ${skusWithoutSupplier.join(", ")}`);
      }
      if (errors.length === 0) {
        errors.push("Nenhum produto válido encontrado na planilha");
      }
      return c.json({ error: errors.join(". ") }, 400);
    }
    
    // Create orders for each supplier
    const createdOrders = [];
    
    for (const [supplierId, items] of itemsBySupplier.entries()) {
      // Generate order number
      const prefix = `PO${userId}`;
      const lastOrder = await db
        .prepare(`
          SELECT order_number 
          FROM orders 
          WHERE company_id = ? AND order_number LIKE ? 
          ORDER BY id DESC 
          LIMIT 1
        `)
        .bind(companyId, `${prefix}%`)
        .first();
      
      let nextSequence = 1;
      if (lastOrder?.order_number) {
        const orderNum = lastOrder.order_number as string;
        const sequencePart = orderNum.slice(-4);
        const currentSequence = parseInt(sequencePart);
        if (!isNaN(currentSequence)) {
          nextSequence = currentSequence + 1;
        }
      }
      
      const orderNumber = `${prefix}${nextSequence.toString().padStart(4, '0')}`;
      const totalAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
      
      // Create order with status "Pendente"
      const orderResult = await db
        .prepare(`
          INSERT INTO orders (
            user_id, company_id, supplier_id, order_number, discount, shipping_cost, other_costs,
            payment_method, payment_type, installments, is_grouped, status, total_amount, stock_period
          ) VALUES (?, ?, ?, ?, 0, 0, 0, 'Pix', 'À Vista', 1, 0, 'Pendente', ?, ?)
        `)
        .bind(userId, companyId, supplierId, orderNumber, totalAmount, stockPeriod || null)
        .run();
      
      const orderId = orderResult.meta.last_row_id;
      
      // Insert order items
      for (const item of items) {
        await db
          .prepare(`
            INSERT INTO order_items (
              order_id, product_id, sku, product_name, quantity, unit_price, purchase_cost, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            orderId,
            item.product_id,
            item.sku,
            item.product_name,
            item.quantity,
            item.unit_price,
            item.purchase_cost,
            item.subtotal
          )
          .run();
      }
      
      createdOrders.push({
        order_id: orderId,
        order_number: orderNumber,
        supplier_id: supplierId,
        items_count: items.length,
        total_amount: totalAmount,
      });
    }
    
    return c.json({
      success: true,
      orders: createdOrders,
      total_orders: createdOrders.length,
    });
  } catch (error) {
    console.error("Error uploading spreadsheet:", error);
    return c.json({ error: "Erro ao processar planilha" }, 500);
  }
});

// Smart order preview
app.get("/smart-preview", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    
    const supplierId = c.req.query("supplier_id");
    const generationType = c.req.query("generation_type") as "days" | "out_of_stock" | "curve_a" | "recommended";
    const days = parseInt(c.req.query("days") || "30");
    const includeInactive = c.req.query("include_inactive") === "true";
    const applyRounding = c.req.query("apply_rounding") === "true";
    const spuPrefixes = c.req.query("spu_prefixes");
    
    if (!supplierId || !generationType) {
      return c.json({ error: "supplier_id and generation_type are required" }, 400);
    }
    
    // Get products linked to this supplier (individual links)
    const statusFilter = includeInactive ? "" : "AND p.status = 'Ativo'";
    const individualProducts = await db
      .prepare(`
        SELECT p.*, sp.supplier_id
        FROM products p
        INNER JOIN supplier_products sp ON p.id = sp.product_id
        WHERE sp.supplier_id = ? AND sp.link_type = 'individual' AND p.company_id = ? ${statusFilter}
      `)
      .bind(supplierId, companyId)
      .all();
    
    // Get products linked by SKU pattern
    const skuPatterns = await db
      .prepare(`
        SELECT sku_pattern
        FROM supplier_products
        WHERE supplier_id = ? AND link_type = 'pattern'
      `)
      .bind(supplierId)
      .all();
    
    // Get products matching SKU patterns
    const patternProducts: any[] = [];
    const patternStatusFilter = includeInactive ? "" : "AND status = 'Ativo'";
    for (const pattern of (skuPatterns.results || [])) {
      const matchingProducts = await db
        .prepare(`SELECT * FROM products WHERE sku LIKE ? AND company_id = ? ${patternStatusFilter}`)
        .bind(`${pattern.sku_pattern}%`, companyId)
        .all();
      patternProducts.push(...(matchingProducts.results || []));
    }
    
    // Combine both lists and remove duplicates
    const allProducts = [...(individualProducts.results || []), ...patternProducts];
    const uniqueProducts = allProducts.filter((product, index, self) =>
      index === self.findIndex((p: any) => p.id === product.id)
    );
    
    const supplierProducts = { results: uniqueProducts };
    
    if (!supplierProducts.results || supplierProducts.results.length === 0) {
      return c.json({ error: "Nenhum produto vinculado a este fornecedor" }, 400);
    }
    
    const items: any[] = [];
    
    for (const product of supplierProducts.results as any[]) {
      // Apply SPU filter if provided
      if (spuPrefixes) {
        const prefixes = spuPrefixes.split(',').map((p: string) => p.trim()).filter((p: string) => p);
        const matchesSPU = prefixes.some((prefix: string) => product.sku.startsWith(prefix));
        if (!matchesSPU) continue;
      }
      
      let shouldInclude = false;
      let quantity = 0;
      
      const currentStock = parseInt(product.stock) || 0;
      const minStock = parseInt(product.min_stock) || 0;
      
      switch (generationType) {
        case "out_of_stock":
          shouldInclude = currentStock === 0;
          if (shouldInclude) {
            quantity = minStock || 1;
          }
          break;
          
        case "curve_a":
          // Get sales from analytics data (use latest slot with data for this company)
          const curveASalesData = await db
            .prepare(`
              SELECT SUM(units) as total_units
              FROM spreadsheet_data
              WHERE slot_number = (
                SELECT slot_number 
                FROM spreadsheet_data 
                WHERE company_id = ? 
                ORDER BY slot_number DESC 
                LIMIT 1
              )
              AND sku = ?
              AND company_id = ?
            `)
            .bind(companyId, product.sku, companyId)
            .first();
          
          const soldLast30Days = parseInt(curveASalesData?.total_units as string) || 0;
          const curveADailySales = soldLast30Days / 30;
          const neededStockCurveA = curveADailySales * days;
          
          // Curva A: produtos com 30+ vendas nos últimos 30 dias E estoque abaixo do necessário
          shouldInclude = soldLast30Days >= 30 && neededStockCurveA > 0;
          if (shouldInclude) {
            quantity = Math.ceil(neededStockCurveA - currentStock);
            if (quantity <= 0) {
              shouldInclude = false;
            }
          }
          break;
          
        case "recommended":
          // Get average daily sales from analytics data (use latest slot with data for this company)
          const salesData = await db
            .prepare(`
              SELECT SUM(units) as total_units
              FROM spreadsheet_data
              WHERE slot_number = (
                SELECT slot_number 
                FROM spreadsheet_data 
                WHERE company_id = ? 
                ORDER BY slot_number DESC 
                LIMIT 1
              )
              AND sku = ?
              AND company_id = ?
            `)
            .bind(companyId, product.sku, companyId)
            .first();
          
          const totalSold = parseInt(salesData?.total_units as string) || 0;
          const recommendedDailySales = totalSold / 30;
          const stockFor30Days = Math.ceil(recommendedDailySales * 30);
          
          shouldInclude = stockFor30Days > 0;
          if (shouldInclude) {
            quantity = Math.ceil(stockFor30Days - currentStock);
            if (quantity <= 0) {
              shouldInclude = false;
            }
          }
          break;
          
        case "days":
          // Get average daily sales from analytics data (use latest slot with data for this company)
          const dailySalesData = await db
            .prepare(`
              SELECT SUM(units) as total_units
              FROM spreadsheet_data
              WHERE slot_number = (
                SELECT slot_number 
                FROM spreadsheet_data 
                WHERE company_id = ? 
                ORDER BY slot_number DESC 
                LIMIT 1
              )
              AND sku = ?
              AND company_id = ?
            `)
            .bind(companyId, product.sku, companyId)
            .first();
          
          const soldIn30Days = parseInt(dailySalesData?.total_units as string) || 0;
          const avgDailySales = soldIn30Days / 30;
          const neededForDays = avgDailySales * days;
          
          shouldInclude = neededForDays > 0;
          if (shouldInclude) {
            quantity = Math.ceil(neededForDays - currentStock);
            if (quantity <= 0) {
              shouldInclude = false;
            }
          }
          break;
      }
      
      if (shouldInclude && quantity > 0) {
        // Apply rounding rules only if enabled
        const finalQty = applyRounding ? roundToMultipleOf10(quantity) : quantity;
        
        items.push({
          product_id: product.id,
          sku: product.sku,
          product_name: product.name,
          current_stock: currentStock,
          quantity: finalQty,
          unit_price: parseFloat(product.cost_price) || 0,
          subtotal: finalQty * (parseFloat(product.cost_price) || 0),
        });
      }
    }
    
    // Calculate summary
    const summary = {
      total_skus: items.length,
      total_pieces: items.reduce((sum, item) => sum + item.quantity, 0),
      total_value: items.reduce((sum, item) => sum + item.subtotal, 0),
    };
    
    return c.json({ items, summary });
  } catch (error) {
    console.error("Error generating smart order preview:", error);
    return c.json({ error: "Failed to generate preview" }, 500);
  }
});

// Create smart order
app.post("/smart-create", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const body = await c.req.json();
    
    const { supplier_id, items } = body;
    
    if (!supplier_id || !items || items.length === 0) {
      return c.json({ error: "Invalid request" }, 400);
    }
    
    // Get next order number
    const prefix = `PO${userId}`;
    const lastOrder = await db
      .prepare(`
        SELECT order_number 
        FROM orders 
        WHERE company_id = ? AND order_number LIKE ? 
        ORDER BY id DESC 
        LIMIT 1
      `)
      .bind(companyId, `${prefix}%`)
      .first();
    
    let nextSequence = 1;
    if (lastOrder?.order_number) {
      const orderNum = lastOrder.order_number as string;
      const sequencePart = orderNum.slice(-4);
      const currentSequence = parseInt(sequencePart);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
    
    const orderNumber = `${prefix}${nextSequence.toString().padStart(4, '0')}`;
    
    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    
    // Create order with status "Pendente"
    const orderResult = await db
      .prepare(`
        INSERT INTO orders (
          user_id, company_id, supplier_id, order_number, discount, shipping_cost, other_costs,
          payment_method, payment_type, installments, is_grouped, status, total_amount
        ) VALUES (?, ?, ?, ?, 0, 0, 0, 'Pix', 'À Vista', 1, 0, 'Pendente', ?)
      `)
      .bind(userId, companyId, supplier_id, orderNumber, totalAmount)
      .run();
    
    const orderId = orderResult.meta.last_row_id;
    
    // Create order items
    for (const item of items) {
      await db
        .prepare(`
          INSERT INTO order_items (
            order_id, product_id, sku, product_name, quantity,
            unit_price, allocated_cost, purchase_cost, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        `)
        .bind(
          orderId,
          item.product_id,
          item.sku,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.unit_price,
          item.subtotal
        )
        .run();
    }
    
    return c.json({ 
      success: true, 
      order_id: orderId,
      orderNumber 
    });
  } catch (error) {
    console.error("Error creating smart order:", error);
    return c.json({ error: "Failed to create smart order" }, 500);
  }
});

// Get next order number for user
app.get("/next-number", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    
    // Get the last PO order for this company (not PR orders)
    const prefix = `PO${userId}`;
    const lastOrder = await db
      .prepare(`
        SELECT order_number 
        FROM orders 
        WHERE company_id = ? AND order_number LIKE ? 
        ORDER BY id DESC 
        LIMIT 1
      `)
      .bind(companyId, `${prefix}%`)
      .first();
    
    let nextSequence = 1;
    
    if (lastOrder?.order_number) {
      // Extract the last 4 digits from the order number
      const orderNum = lastOrder.order_number as string;
      const sequencePart = orderNum.slice(-4); // Get last 4 characters
      const currentSequence = parseInt(sequencePart);
      if (!isNaN(currentSequence)) {
        nextSequence = currentSequence + 1;
      }
    }
    
    const nextOrderNumber = `${prefix}${nextSequence.toString().padStart(4, '0')}`;
    
    return c.json({ order_number: nextOrderNumber });
  } catch (error) {
    console.error("Error getting next order number:", error);
    return c.json({ error: "Failed to get next order number" }, 500);
  }
});

// Get all orders
app.get("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    
    const orders = await db
      .prepare(`
        SELECT 
          o.*,
          s.person_type,
          s.name,
          s.trade_name,
          s.company_name,
          (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
          (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_pieces
        FROM orders o
        LEFT JOIN suppliers s ON o.supplier_id = s.id
        WHERE o.company_id = ? AND o.is_deleted = 0
        ORDER BY o.created_at DESC
      `)
      .bind(companyId)
      .all();
    
    // Recalculate totals based on receipts or unavailable items
    const ordersWithRecalculatedTotals = [];
    for (const order of (orders.results || []) as any[]) {
      // Check if there are any receipts for this order
      const receipts = await db
        .prepare("SELECT * FROM order_receipts WHERE order_id = ?")
        .bind(order.id)
        .all();
      
      const hasReceipts = receipts.results && receipts.results.length > 0;
      
      if (hasReceipts) {
        // Calculate total based on received items
        const items = await db
          .prepare(`
            SELECT oi.*, ore.quantity_received
            FROM order_items oi
            LEFT JOIN order_receipts ore ON ore.order_id = oi.order_id AND ore.product_id = oi.product_id
            WHERE oi.order_id = ?
          `)
          .bind(order.id)
          .all();
        
        let receivedTotal = 0;
        for (const item of (items.results || []) as any[]) {
          const receivedQty = item.quantity_received || 0;
          const unitPrice = parseFloat(item.unit_price || 0);
          receivedTotal += receivedQty * unitPrice;
        }
        
        // Add error items to the total
        const errorItems = await db
          .prepare("SELECT * FROM order_receipt_errors WHERE order_id = ?")
          .bind(order.id)
          .all();
        
        for (const errorItem of (errorItems.results || []) as any[]) {
          receivedTotal += (errorItem.quantity || 0) * (errorItem.unit_cost || 0);
        }
        
        // Apply costs proportionally
        const originalItemsTotal = (items.results || []).reduce((sum: number, item: any) => {
          return sum + (parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0));
        }, 0);
        
        const proportion = originalItemsTotal > 0 ? receivedTotal / originalItemsTotal : 1;
        
        const discount = parseFloat(order.discount || 0);
        const shipping = parseFloat(order.shipping_cost || 0);
        const otherCosts = parseFloat(order.other_costs || 0);
        
        const adjustedTotal = receivedTotal - (discount * proportion) + (shipping * proportion) + (otherCosts * proportion);
        
        ordersWithRecalculatedTotals.push({
          ...order,
          total_amount: adjustedTotal
        });
      } else {
        // No receipts - calculate based on unavailable items
        const items = await db
          .prepare(`
            SELECT oi.*, 
              COALESCE(sui.is_unavailable, 0) as is_unavailable,
              ROW_NUMBER() OVER (ORDER BY oi.id) - 1 as item_index
            FROM order_items oi
            LEFT JOIN supplier_unavailable_items sui 
              ON sui.order_id = oi.order_id 
              AND sui.item_index = (
                SELECT COUNT(*) FROM order_items oi2 
                WHERE oi2.order_id = oi.order_id AND oi2.id < oi.id
              )
            WHERE oi.order_id = ?
          `)
          .bind(order.id)
          .all();
        
        // Calculate total from available items only
        let recalculatedTotal = 0;
        for (const item of (items.results || []) as any[]) {
          if (item.is_unavailable !== 1) {
            recalculatedTotal += parseFloat(item.subtotal || 0);
          }
        }
        
        // Add discount, shipping, and other costs
        recalculatedTotal = recalculatedTotal - (parseFloat(order.discount || 0)) + 
                            (parseFloat(order.shipping_cost || 0)) + 
                            (parseFloat(order.other_costs || 0));
        
        ordersWithRecalculatedTotals.push({
          ...order,
          total_amount: recalculatedTotal
        });
      }
    }
    
    return c.json({ orders: ordersWithRecalculatedTotals });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return c.json({ error: "Failed to fetch orders" }, 500);
  }
});

// Get orders by supplier (for supplier portal)
app.get("/by-supplier/:supplierId", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const supplierId = c.req.param("supplierId");
    
    const orders = await db
      .prepare(`
        SELECT 
          o.*,
          (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
          (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_pieces,
          (SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END FROM order_receipt_errors WHERE order_id = o.id) as has_error_items
        FROM orders o
        WHERE o.supplier_id = ? AND o.company_id = ? AND o.is_deleted = 0
        ORDER BY o.created_at DESC
      `)
      .bind(supplierId, companyId)
      .all();
    
    return c.json({ orders: orders.results || [] });
  } catch (error) {
    console.error("Error fetching supplier orders:", error);
    return c.json({ error: "Failed to fetch supplier orders" }, 500);
  }
});

// Get single order with items
app.get("/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    
    const order = await db
      .prepare(`
        SELECT 
          o.*,
          s.person_type,
          s.name,
          s.trade_name,
          s.company_name,
          s.contact_email,
          s.contact_phone
        FROM orders o
        LEFT JOIN suppliers s ON o.supplier_id = s.id
        WHERE o.id = ? AND o.company_id = ? AND o.is_deleted = 0
      `)
      .bind(orderId, companyId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    const items = await db
      .prepare(`
        SELECT oi.*, p.image_url 
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ? 
        ORDER BY oi.sku ASC
      `)
      .bind(orderId)
      .all();
    
    const installments = await db
      .prepare("SELECT * FROM payment_installments WHERE order_id = ? ORDER BY installment_number ASC")
      .bind(orderId)
      .all();
    
    return c.json({ 
      order, 
      items: items.results || [],
      installments: installments.results || []
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return c.json({ error: "Failed to fetch order" }, 500);
  }
});

// Create new order
app.post("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const body = await c.req.json();
    
    const {
      supplier_id,
      order_number,
      discount = 0,
      shipping_cost = 0,
      other_costs = 0,
      payment_method,
      payment_type,
      installments = 1,
      installment_schedule,
      is_grouped = false,
      items = [],
    } = body;
    
    if (!supplier_id || !order_number) {
      return c.json({ error: "Supplier and order number are required" }, 400);
    }
    
    if (!items || items.length === 0) {
      return c.json({ error: "At least one item is required" }, 400);
    }
    
    // Calculate totals
    const itemsTotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const totalAmount = itemsTotal - discount + shipping_cost + other_costs;
    
    // Create order
    const orderResult = await db
      .prepare(`
        INSERT INTO orders (
          user_id, company_id, supplier_id, order_number, discount, shipping_cost, other_costs,
          payment_method, payment_type, installments, is_grouped, status, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente', ?)
      `)
      .bind(
        userId,
        companyId,
        supplier_id,
        order_number,
        discount,
        shipping_cost,
        other_costs,
        payment_method,
        payment_type,
        installments,
        is_grouped ? 1 : 0,
        totalAmount
      )
      .run();
    
    const orderId = orderResult.meta.last_row_id;
    
    // Create order items
    for (const item of items) {
      await db
        .prepare(`
          INSERT INTO order_items (
            order_id, product_id, sku, product_name, quantity,
            unit_price, allocated_cost, purchase_cost, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          orderId,
          item.product_id,
          item.sku,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.allocated_cost || 0,
          item.purchase_cost || item.unit_price,
          item.subtotal
        )
        .run();
    }
    
    // Create payment installments if needed
    if (payment_type === 'Parcelado' && installment_schedule && installment_schedule.length > 0) {
      for (const inst of installment_schedule) {
        await db
          .prepare(`
            INSERT INTO payment_installments (
              order_id, installment_number, amount, due_date
            ) VALUES (?, ?, ?, ?)
          `)
          .bind(orderId, inst.number, inst.amount, inst.due_date)
          .run();
      }
    }
    
    return c.json({ 
      success: true, 
      order_id: orderId,
      order_number 
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return c.json({ error: "Failed to create order" }, 500);
  }
});

// Create accounts payable for order (advanced with custom installments)
app.post("/:id/create-payables-advanced", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    const body = await c.req.json();
    
    const { payment_type, installments: customInstallments } = body;
    
    // Get order details
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND company_id = ?")
      .bind(orderId, companyId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Check if payables already created
    if (order.has_payables_created === 1) {
      return c.json({ error: "Contas a pagar já foram lançadas para este pedido" }, 400);
    }
    
    const description = `Pedido ${order.order_number}`;
    const competenceDate = new Date(order.created_at as string).toISOString().split('T')[0];
    const isGroupedOrder = order.is_grouped === 1;
    
    // Get default bank account
    const defaultBank = await db
      .prepare("SELECT id, account_name, bank_name FROM bank_accounts WHERE company_id = ? AND is_active = 1 AND is_default = 1")
      .bind(companyId)
      .first();
    
    const bankAccountId = defaultBank?.id || null;
    const bankAccount = defaultBank ? `${defaultBank.account_name} - ${defaultBank.bank_name}` : null;
    
    // Get total pieces
    const items = await db
      .prepare("SELECT SUM(quantity) as total FROM order_items WHERE order_id = ?")
      .bind(orderId)
      .first();
    
    const totalPieces = items?.total || 0;
    
    if (isGroupedOrder) {
      // Special handling for grouped orders
      // If has installments, create multiple grouped accounts (one per week)
      // If à vista, create single grouped account
      
      const orderDate = new Date(order.created_at as string);
      const numberOfInstallments = (customInstallments && customInstallments.length > 0) ? customInstallments.length : 1;
      const amountPerInstallment = parseFloat(order.total_amount as string) / numberOfInstallments;
      
      // Format dates helper (dd/MM/yy)
      const formatShortDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
      };
      
      // Get starting Monday for the first week
      const dayOfWeek = orderDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      let currentMonday = new Date(orderDate);
      currentMonday.setDate(orderDate.getDate() + mondayOffset);
      currentMonday.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < numberOfInstallments; i++) {
        // Calculate week boundaries (Monday to Sunday)
        const weekStart = new Date(currentMonday);
        weekStart.setDate(currentMonday.getDate() + (i * 7));
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Monday + 6 = Sunday
        weekEnd.setHours(23, 59, 59, 999);
        
        // Due date is 5 days after Sunday (Friday of next week)
        const dueDate = new Date(weekEnd);
        dueDate.setDate(weekEnd.getDate() + 5);
        dueDate.setHours(0, 0, 0, 0);
        
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];
        const dueDateStr = dueDate.toISOString().split('T')[0];
        
        // Get next grouped order number
        const sequence = await db
          .prepare("SELECT next_number FROM grouped_order_sequence WHERE id = 1")
          .first();
        
        const nextNumber = sequence?.next_number || 55001;
        const groupedOrderNumber = `GR${nextNumber}`;
        
        // Increment sequence
        await db
          .prepare("UPDATE grouped_order_sequence SET next_number = next_number + 1 WHERE id = 1")
          .run();
        
        const weekStartDisplay = formatShortDate(weekStart);
        const weekEndDisplay = formatShortDate(weekEnd);
        const groupedDescription = `${groupedOrderNumber} Agrupado Semanal ${weekStartDisplay} a ${weekEndDisplay}`;
        
        // Calculate amount for this installment
        let installmentAmount = amountPerInstallment;
        // Adjust last installment to handle rounding
        if (i === numberOfInstallments - 1) {
          const totalSoFar = amountPerInstallment * (numberOfInstallments - 1);
          installmentAmount = parseFloat(order.total_amount as string) - totalSoFar;
        }
        
        await db
          .prepare(`
            INSERT INTO accounts_payable (
              user_id, company_id, supplier_id, amount, due_date, competence_date, description,
              is_grouped, group_week_start, group_week_end, order_ids, total_pieces, 
              payment_method, bank_account_id, bank_account, grouped_order_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            userId,
            companyId,
            order.supplier_id,
            installmentAmount,
            dueDateStr,
            competenceDate,
            groupedDescription,
            weekStartStr,
            weekEndStr,
            String(order.id),
            totalPieces,
            order.payment_method,
            bankAccountId,
            bankAccount,
            groupedOrderNumber
          )
          .run();
      }
    } else if (payment_type === "À Vista" || !customInstallments || customInstallments.length === 0) {
      // Single payment - due date is order date
      const dueDate = new Date(order.created_at as string).toISOString().split('T')[0];
      
      await db
        .prepare(`
          INSERT INTO accounts_payable (
            user_id, company_id, supplier_id, amount, due_date, competence_date, description,
            is_grouped, order_ids, total_pieces, payment_method, bank_account_id, bank_account
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
        `)
        .bind(
          userId,
          companyId,
          order.supplier_id,
          order.total_amount,
          dueDate,
          competenceDate,
          description,
          String(order.id),
          totalPieces,
          order.payment_method,
          bankAccountId,
          bankAccount
        )
        .run();
    } else {
      // Regular order with custom installments
      for (const inst of customInstallments) {
        const installmentDesc = `${description} - Parcela ${inst.number}/${customInstallments.length}`;
        
        await db
          .prepare(`
            INSERT INTO accounts_payable (
              user_id, company_id, supplier_id, amount, due_date, competence_date, description,
              is_grouped, order_ids, total_pieces, payment_method, bank_account_id, bank_account
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
          `)
          .bind(
            userId,
            companyId,
            order.supplier_id,
            inst.amount,
            inst.due_date,
            competenceDate,
            installmentDesc,
            String(order.id),
            totalPieces,
            order.payment_method,
            bankAccountId,
            bankAccount
          )
          .run();
      }
    }
    
    // Mark order as having payables created
    await db
      .prepare("UPDATE orders SET has_payables_created = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(orderId)
      .run();
    
    return c.json({ success: true, message: "Contas a pagar criadas com sucesso" });
  } catch (error) {
    console.error("Error creating accounts payable:", error);
    return c.json({ error: "Failed to create accounts payable" }, 500);
  }
});

// Create accounts payable for order (legacy - simple)
app.post("/:id/create-payables", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    
    // Get order details
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND company_id = ?")
      .bind(orderId, companyId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Check if payables already created
    if (order.has_payables_created === 1) {
      return c.json({ error: "Contas a pagar já foram lançadas para este pedido" }, 400);
    }
    
    // Create accounts payable
    await createAccountsPayable(db, order as any, userId, companyId);
    
    // Mark order as having payables created
    await db
      .prepare("UPDATE orders SET has_payables_created = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(orderId)
      .run();
    
    return c.json({ success: true, message: "Contas a pagar criadas com sucesso" });
  } catch (error) {
    console.error("Error creating accounts payable:", error);
    return c.json({ error: "Failed to create accounts payable" }, 500);
  }
});

// Remove accounts payable for order
app.delete("/:id/remove-payables", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    
    // Get order details
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND company_id = ?")
      .bind(orderId, companyId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    if (order.has_payables_created !== 1) {
      return c.json({ error: "Este pedido não possui contas a pagar lançadas" }, 400);
    }
    
    // Check if any related payables are already paid
    const paidPayables = await db
      .prepare("SELECT COUNT(*) as count FROM accounts_payable WHERE order_ids LIKE ? AND is_paid = 1")
      .bind(`%${orderId}%`)
      .first();
    
    if (paidPayables && (paidPayables.count as number) > 0) {
      return c.json({ error: "Não é possível remover. Existem contas já pagas relacionadas a este pedido." }, 400);
    }
    
    // Delete accounts payable
    await db
      .prepare("DELETE FROM accounts_payable WHERE order_ids LIKE ?")
      .bind(`%${orderId}%`)
      .run();
    
    // Mark order as not having payables
    await db
      .prepare("UPDATE orders SET has_payables_created = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(orderId)
      .run();
    
    return c.json({ success: true, message: "Contas a pagar removidas com sucesso" });
  } catch (error) {
    console.error("Error removing accounts payable:", error);
    return c.json({ error: "Failed to remove accounts payable" }, 500);
  }
});

// Update order status
app.patch("/:id/status", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    const { status } = await c.req.json();
    
    if (!['Pendente', 'Produção', 'Trânsito', 'Completo', 'Cancelado'].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }
    
    // Get order details
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND company_id = ?")
      .bind(orderId, companyId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Check if order has receipts (tag Recebido)
    const receipts = await db
      .prepare("SELECT COUNT(*) as count FROM order_receipts WHERE order_id = ?")
      .bind(orderId)
      .first();
    
    const hasReceipts = receipts && (receipts.count as number) > 0;
    
    // Check if order has payables created (tag Lançado)
    const hasPayablesCreated = order.has_payables_created === 1;
    
    // Check if any payable is paid
    const paidPayables = await db
      .prepare("SELECT COUNT(*) as count FROM accounts_payable WHERE order_ids LIKE ? AND is_paid = 1")
      .bind(`%${orderId}%`)
      .first();
    
    const hasPaidPayables = paidPayables && (paidPayables.count as number) > 0;
    
    // Validation rules
    const currentStatus = order.status;
    
    // Rule 1: If has tag Recebido, cannot change status anymore
    if (hasReceipts) {
      return c.json({ 
        error: "Não é possível alterar o status. O pedido possui recebimentos registrados. Remova os recebimentos primeiro." 
      }, 400);
    }
    
    // Rule 2: If has paid payables, cannot change status
    if (hasPaidPayables) {
      return c.json({ 
        error: "Não é possível alterar o status. Existem contas a pagar já pagas relacionadas a este pedido." 
      }, 400);
    }
    
    // Rule 3: If has tag Lançado (unpaid), must remove payables first
    if (hasPayablesCreated && currentStatus === 'Completo') {
      return c.json({ 
        error: "Não é possível alterar o status. Remova as contas a pagar lançadas primeiro." 
      }, 400);
    }
    
    // Rule 4: From Completo, can only change if no tags at all
    if (currentStatus === 'Completo' && (hasReceipts || hasPayablesCreated)) {
      return c.json({ 
        error: "Não é possível alterar o status de um pedido completo com tags. Remova os recebimentos ou contas a pagar primeiro." 
      }, 400);
    }
    
    // Rule 5: To Cancelado is allowed from Trânsito, Produção, Pendente (if no paid payables)
    // This is already handled by the paid payables check above
    
    // Update order status
    await db
      .prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(status, orderId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    return c.json({ error: "Failed to update order status" }, 500);
  }
});

// Toggle order urgency
app.patch("/:id/urgency", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    const { is_urgent } = await c.req.json();
    
    // Get order details
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND company_id = ?")
      .bind(orderId, companyId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Update order urgency
    await db
      .prepare("UPDATE orders SET is_urgent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(is_urgent ? 1 : 0, orderId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating order urgency:", error);
    return c.json({ error: "Failed to update order urgency" }, 500);
  }
});

// Update order
app.put("/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    const body = await c.req.json();
    
    const {
      supplier_id,
      discount = 0,
      shipping_cost = 0,
      other_costs = 0,
      payment_method,
      payment_type,
      installments = 1,
      installment_schedule,
      is_grouped = false,
      items = [],
    } = body;
    
    if (!supplier_id) {
      return c.json({ error: "Supplier is required" }, 400);
    }
    
    if (!items || items.length === 0) {
      return c.json({ error: "At least one item is required" }, 400);
    }
    
    // Calculate totals
    const itemsTotal = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    const totalAmount = itemsTotal - discount + shipping_cost + other_costs;
    
    // Update order
    await db
      .prepare(`
        UPDATE orders 
        SET supplier_id = ?, discount = ?, shipping_cost = ?, other_costs = ?,
            payment_method = ?, payment_type = ?, installments = ?, is_grouped = ?,
            total_amount = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(
        supplier_id,
        discount,
        shipping_cost,
        other_costs,
        payment_method,
        payment_type,
        installments,
        is_grouped ? 1 : 0,
        totalAmount,
        orderId,
        companyId
      )
      .run();
    
    // Delete existing items and installments
    await db.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId).run();
    await db.prepare("DELETE FROM payment_installments WHERE order_id = ?").bind(orderId).run();
    
    // Create new order items
    for (const item of items) {
      await db
        .prepare(`
          INSERT INTO order_items (
            order_id, product_id, sku, product_name, quantity,
            unit_price, allocated_cost, purchase_cost, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          orderId,
          item.product_id,
          item.sku,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.allocated_cost || 0,
          item.purchase_cost || item.unit_price,
          item.subtotal
        )
        .run();
    }
    
    // Create payment installments if needed
    if (payment_type === 'Parcelado' && installment_schedule && installment_schedule.length > 0) {
      for (const inst of installment_schedule) {
        await db
          .prepare(`
            INSERT INTO payment_installments (
              order_id, installment_number, amount, due_date
            ) VALUES (?, ?, ?, ?)
          `)
          .bind(orderId, inst.number, inst.amount, inst.due_date)
          .run();
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    return c.json({ error: "Failed to update order" }, 500);
  }
});

// Create replenishment order (PR)
app.post("/replenishment", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const body = await c.req.json();
    
    const {
      supplier_id,
      order_number,
      items = [],
    } = body;
    
    if (!supplier_id || !order_number) {
      return c.json({ error: "Supplier and order number are required" }, 400);
    }
    
    if (!items || items.length === 0) {
      return c.json({ error: "At least one item is required" }, 400);
    }
    
    // Get product prices
    const itemsWithPrices = [];
    for (const item of items) {
      const product = await db
        .prepare("SELECT cost_price FROM products WHERE id = ? AND company_id = ?")
        .bind(item.product_id, companyId)
        .first();
      
      const price = parseFloat(product?.cost_price as string) || 0;
      const subtotal = item.quantity * price;
      
      itemsWithPrices.push({
        ...item,
        unit_price: price,
        purchase_cost: price,
        subtotal,
      });
    }
    
    const totalAmount = itemsWithPrices.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    
    // Create PR order with status "Produção"
    const originalOrderId = body.original_order_id || null;
    
    const orderResult = await db
      .prepare(`
        INSERT INTO orders (
          user_id, company_id, supplier_id, order_number, discount, shipping_cost, other_costs,
          payment_method, payment_type, installments, is_grouped, status, total_amount,
          original_order_id, is_replenishment
        ) VALUES (?, ?, ?, ?, 0, 0, 0, 'Pix', 'À Vista', 1, 0, 'Produção', ?, ?, 1)
      `)
      .bind(userId, companyId, supplier_id, order_number, totalAmount, originalOrderId)
      .run();
    
    const orderId = orderResult.meta.last_row_id;
    
    // Create order items
    for (const item of itemsWithPrices) {
      await db
        .prepare(`
          INSERT INTO order_items (
            order_id, product_id, sku, product_name, quantity,
            unit_price, allocated_cost, purchase_cost, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        `)
        .bind(
          orderId,
          item.product_id,
          item.sku,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.purchase_cost,
          item.subtotal
        )
        .run();
    }
    
    return c.json({ 
      success: true, 
      order_id: orderId,
      order_number 
    });
  } catch (error) {
    console.error("Error creating replenishment order:", error);
    return c.json({ error: "Failed to create replenishment order" }, 500);
  }
});

// Delete order (soft delete)
app.delete("/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const orderId = c.req.param("id");
    
    // Soft delete - mark as deleted but keep in database
    await db
      .prepare("UPDATE orders SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
      .bind(orderId, companyId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return c.json({ error: "Failed to delete order" }, 500);
  }
});

// Helper function to round quantity to multiple of 10
function roundToMultipleOf10(quantity: number): number {
  if (quantity <= 0) return 10;
  
  // For quantities 1-14, round to 10
  if (quantity <= 14) return 10;
  
  // For quantities 15+, round to nearest 10
  // 15-24 → 20, 25-34 → 30, etc.
  const remainder = quantity % 10;
  const base = Math.floor(quantity / 10) * 10;
  
  if (remainder >= 5) {
    return base + 10;
  } else {
    return base;
  }
}

// Helper function to create accounts payable
async function createAccountsPayable(db: any, order: any, userId: number, companyId: number) {
  const description = `Pedido ${order.order_number}`;
  const competenceDate = new Date(order.created_at).toISOString().split('T')[0];
  
  // Get default bank account
  const defaultBank = await db
    .prepare("SELECT id, account_name, bank_name FROM bank_accounts WHERE company_id = ? AND is_active = 1 AND is_default = 1")
    .bind(companyId)
    .first();
  
  const bankAccountId = defaultBank?.id || null;
  const bankAccount = defaultBank ? `${defaultBank.account_name} - ${defaultBank.bank_name}` : null;
  
  const isGrouped = order.is_grouped === 1;
  
  if (isGrouped) {
    // Calculate week boundaries (Monday to Sunday)
    const orderDate = new Date(order.created_at);
    const dayOfWeek = orderDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Find Monday of this week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(orderDate);
    weekStart.setDate(orderDate.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    
    // Find Sunday of this week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Monday + 6 = Sunday
    weekEnd.setHours(23, 59, 59, 999);
    
    // Due date is 5 days after the last day of the week (Sunday + 5)
    const dueDate = new Date(weekEnd);
    dueDate.setDate(weekEnd.getDate() + 5);
    dueDate.setHours(0, 0, 0, 0);
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    const dueDateStr = dueDate.toISOString().split('T')[0];
    
    // Format dates for description (dd/MM/yy)
    const formatShortDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    };
    
    const weekStartDisplay = formatShortDate(weekStart);
    const weekEndDisplay = formatShortDate(weekEnd);
    
    // Check if grouped account already exists for this week and supplier (and is not paid)
    const existing = await db
      .prepare(`
        SELECT * FROM accounts_payable 
        WHERE company_id = ? AND supplier_id = ? 
        AND group_week_start = ? AND group_week_end = ?
        AND is_grouped = 1
        AND is_paid = 0
      `)
      .bind(companyId, order.supplier_id, weekStartStr, weekEndStr)
      .first();
    
    if (existing) {
      // Update existing grouped account
      const orderIds = existing.order_ids ? existing.order_ids.split(',') : [];
      orderIds.push(order.id.toString());
      
      const items = await db
        .prepare("SELECT SUM(quantity) as total FROM order_items WHERE order_id = ?")
        .bind(order.id)
        .first();
      
      const newAmount = parseFloat(existing.amount) + parseFloat(order.total_amount);
      const newPieces = parseInt(existing.total_pieces) + (items?.total || 0);
      
      await db
        .prepare(`
          UPDATE accounts_payable 
          SET amount = ?, order_ids = ?, total_pieces = ?, 
              bank_account_id = ?, bank_account = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(newAmount, orderIds.join(','), newPieces, bankAccountId, bankAccount, existing.id)
        .run();
    } else {
      // Get next grouped order number
      const sequence = await db
        .prepare("SELECT next_number FROM grouped_order_sequence WHERE id = 1")
        .first();
      
      const nextNumber = sequence?.next_number || 55001;
      const groupedOrderNumber = `GR${nextNumber}`;
      
      // Increment sequence
      await db
        .prepare("UPDATE grouped_order_sequence SET next_number = next_number + 1 WHERE id = 1")
        .run();
      
      // Create new grouped account
      const items = await db
        .prepare("SELECT SUM(quantity) as total FROM order_items WHERE order_id = ?")
        .bind(order.id)
        .first();
      
      const groupedDescription = `${groupedOrderNumber} Agrupado Semanal ${weekStartDisplay} a ${weekEndDisplay}`;
      
      await db
        .prepare(`
          INSERT INTO accounts_payable (
            user_id, company_id, supplier_id, amount, due_date, competence_date, description,
            is_grouped, group_week_start, group_week_end, order_ids, total_pieces, 
            payment_method, bank_account_id, bank_account, grouped_order_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          userId,
          companyId,
          order.supplier_id,
          order.total_amount,
          dueDateStr,
          competenceDate,
          groupedDescription,
          weekStartStr,
          weekEndStr,
          order.id.toString(),
          items?.total || 0,
          order.payment_method,
          bankAccountId,
          bankAccount,
          groupedOrderNumber
        )
        .run();
    }
  } else {
    // Create individual account payable
    const items = await db
      .prepare("SELECT SUM(quantity) as total FROM order_items WHERE order_id = ?")
      .bind(order.id)
      .first();
    
    // Use installment due dates or order date
    const installments = await db
      .prepare("SELECT * FROM payment_installments WHERE order_id = ? ORDER BY installment_number")
      .bind(order.id)
      .all();
    
    if (installments.results && installments.results.length > 0) {
      // Create one account payable per installment
      for (const inst of installments.results as any[]) {
        const installmentDesc = `${description} - Parcela ${inst.installment_number}/${installments.results.length}`;
        
        await db
          .prepare(`
            INSERT INTO accounts_payable (
              user_id, company_id, supplier_id, amount, due_date, competence_date, description,
              is_grouped, order_ids, total_pieces, payment_method, bank_account_id, bank_account
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
          `)
          .bind(
            userId,
            companyId,
            order.supplier_id,
            inst.amount,
            inst.due_date,
            competenceDate,
            installmentDesc,
            order.id.toString(),
            items?.total || 0,
            order.payment_method,
            bankAccountId,
            bankAccount
          )
          .run();
      }
    } else {
      // Single payment - due date is order date
      const dueDate = new Date(order.created_at).toISOString().split('T')[0];
      
      await db
        .prepare(`
          INSERT INTO accounts_payable (
            user_id, company_id, supplier_id, amount, due_date, competence_date, description,
            is_grouped, order_ids, total_pieces, payment_method, bank_account_id, bank_account
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
        `)
        .bind(
          userId,
          companyId,
          order.supplier_id,
          order.total_amount,
          dueDate,
          competenceDate,
          description,
          order.id.toString(),
          items?.total || 0,
          order.payment_method,
          bankAccountId,
          bankAccount
        )
        .run();
    }
  }
}

export default app;
