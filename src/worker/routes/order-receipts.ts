import { Hono } from "hono";
import type { Env } from "../types";
import { getUserIdFromToken } from "../middleware/auth";

const app = new Hono<{ Bindings: Env }>();

// Save order receipt data
app.post("/:orderId", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const orderId = c.req.param("orderId");
    const body = await c.req.json();
    
    const { items, errorItems = [] } = body;
    
    if (!items || items.length === 0) {
      return c.json({ error: "Items are required" }, 400);
    }
    
    // Verify order belongs to user
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .bind(orderId, userId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Delete existing receipt data for this order
    await db
      .prepare("DELETE FROM order_receipts WHERE order_id = ?")
      .bind(orderId)
      .run();
    
    // Insert new receipt data
    for (const item of items) {
      await db
        .prepare(`
          INSERT INTO order_receipts (
            order_id, product_id, sku, quantity_ordered,
            quantity_received, quantity_remaining
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)
        .bind(
          orderId,
          item.product_id,
          item.sku,
          item.quantity_ordered,
          item.quantity_received,
          item.quantity_remaining
        )
        .run();
    }
    
    // Recalculate order total based on received items
    const orderItems = await db
      .prepare(`
        SELECT oi.*, orec.quantity_received
        FROM order_items oi
        LEFT JOIN order_receipts orec ON orec.order_id = oi.order_id AND orec.product_id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.sku ASC
      `)
      .bind(orderId)
      .all();
    
    let receivedTotal = 0;
    for (const item of (orderItems.results || []) as any[]) {
      const receivedQty = item.quantity_received || 0;
      const unitPrice = parseFloat(item.unit_price || 0);
      receivedTotal += receivedQty * unitPrice;
    }
    
    // Add error items to the total
    for (const errorItem of errorItems) {
      receivedTotal += (errorItem.quantity || 0) * (errorItem.unit_cost || 0);
    }
    
    // Apply discount, shipping, and other costs proportionally
    const orderData = await db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .bind(orderId)
      .first() as any;
    
    const discount = parseFloat(orderData?.discount || 0);
    const shipping = parseFloat(orderData?.shipping_cost || 0);
    const otherCosts = parseFloat(orderData?.other_costs || 0);
    
    // Calculate the proportion of items received
    const orderItemsTotal = (orderItems.results || []).reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.unit_price || 0) * parseInt(item.quantity || 0));
    }, 0);
    
    const proportion = orderItemsTotal > 0 ? receivedTotal / orderItemsTotal : 1;
    
    // Apply costs proportionally
    const adjustedTotal = receivedTotal - (discount * proportion) + (shipping * proportion) + (otherCosts * proportion);
    
    // Update order total and set status to Completo
    await db
      .prepare("UPDATE orders SET total_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(adjustedTotal, "Completo", orderId)
      .run();
    
    // Delete existing error items for this order
    await db
      .prepare("DELETE FROM order_receipt_errors WHERE order_id = ?")
      .bind(orderId)
      .run();
    
    // Insert error items (items received but not ordered)
    for (const errorItem of errorItems) {
      await db
        .prepare(`
          INSERT INTO order_receipt_errors (
            order_id, product_id, sku, product_name,
            quantity, unit_cost, error_reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          orderId,
          errorItem.product_id,
          errorItem.sku,
          errorItem.product_name,
          errorItem.quantity,
          errorItem.unit_cost || 0,
          errorItem.error_reason
        )
        .run();
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving receipt data:", error);
    return c.json({ error: "Failed to save receipt data" }, 500);
  }
});

// Get order receipt data
app.get("/:orderId", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const orderId = c.req.param("orderId");
    
    // Verify order belongs to user
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .bind(orderId, userId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Get receipt data
    const receipts = await db
      .prepare("SELECT * FROM order_receipts WHERE order_id = ?")
      .bind(orderId)
      .all();
    
    // Get error items
    const errorItems = await db
      .prepare("SELECT * FROM order_receipt_errors WHERE order_id = ?")
      .bind(orderId)
      .all();
    
    return c.json({ 
      receipts: receipts.results || [],
      errorItems: errorItems.results || []
    });
  } catch (error) {
    console.error("Error fetching receipt data:", error);
    return c.json({ error: "Failed to fetch receipt data" }, 500);
  }
});

// Delete order receipt data (reset receipt)
app.delete("/:orderId", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const orderId = c.req.param("orderId");
    
    // Verify order belongs to user
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?")
      .bind(orderId, userId)
      .first() as any;
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Calculate original order total from order items
    const orderItems = await db
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .bind(orderId)
      .all();
    
    let originalTotal = 0;
    for (const item of (orderItems.results || []) as any[]) {
      originalTotal += parseFloat(item.subtotal || 0);
    }
    
    // Apply original discount and costs
    const discount = parseFloat(order.discount || 0);
    const shipping = parseFloat(order.shipping_cost || 0);
    const otherCosts = parseFloat(order.other_costs || 0);
    
    originalTotal = originalTotal - discount + shipping + otherCosts;
    
    // Restore original total amount
    await db
      .prepare("UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(originalTotal, orderId)
      .run();
    
    // Delete receipt data
    await db
      .prepare("DELETE FROM order_receipts WHERE order_id = ?")
      .bind(orderId)
      .run();
    
    // Delete error items
    await db
      .prepare("DELETE FROM order_receipt_errors WHERE order_id = ?")
      .bind(orderId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting receipt data:", error);
    return c.json({ error: "Failed to delete receipt data" }, 500);
  }
});

// Export order receipt as XLSX
app.get("/:orderId/export-xlsx", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const orderId = c.req.param("orderId");
    
    // Get order with supplier info
    const order = await db
      .prepare(`
        SELECT o.*, s.id as supplier_id, s.name, s.trade_name, s.company_name
        FROM orders o
        LEFT JOIN suppliers s ON o.supplier_id = s.id
        WHERE o.id = ? AND o.user_id = ?
      `)
      .bind(orderId, userId)
      .first() as any;
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Check if order has receipt data
    const receipts = await db
      .prepare(`
        SELECT orec.*, oi.unit_price, oi.product_name
        FROM order_receipts orec
        INNER JOIN order_items oi ON orec.order_id = oi.order_id AND orec.product_id = oi.product_id
        WHERE orec.order_id = ?
        ORDER BY orec.sku ASC
      `)
      .bind(orderId)
      .all();
    
    if (!receipts.results || receipts.results.length === 0) {
      return c.json({ error: "No receipt data found for this order" }, 404);
    }
    
    // Get error items if any
    const errorItems = await db
      .prepare("SELECT * FROM order_receipt_errors WHERE order_id = ?")
      .bind(orderId)
      .all();
    
    // Build supplier name
    const supplierName = order.company_name || order.trade_name || order.name || "Fornecedor";
    const supplierId = order.supplier_id;
    
    // Prepare data rows
    const dataRows: any[] = [];
    
    // Add received items
    for (const item of receipts.results as any[]) {
      if (item.quantity_received > 0) {
        dataRows.push({
          supplier_id: supplierId,
          sku: item.sku,
          quantity: item.quantity_received,
          currency: "",
          unit_cost: parseFloat(item.unit_price || 0),
          supplier_name: "",
          discount: "",
          shipping: "",
          other_costs: "",
          tracking_code: "",
          notes: ""
        });
      }
    }
    
    // Add error items
    for (const errorItem of (errorItems.results || []) as any[]) {
      dataRows.push({
        supplier_id: supplierId,
        sku: errorItem.sku,
        quantity: errorItem.quantity,
        currency: "",
        unit_cost: parseFloat(errorItem.unit_cost || 0),
        supplier_name: "",
        discount: "",
        shipping: "",
        other_costs: "",
        tracking_code: "",
        notes: errorItem.error_reason || ""
      });
    }
    
    // Fill in values for first data row only (row 2 in spreadsheet)
    if (dataRows.length > 0) {
      dataRows[0].currency = "BRL";
      dataRows[0].supplier_name = supplierName;
      dataRows[0].discount = parseFloat(order.discount || 0);
      dataRows[0].shipping = parseFloat(order.shipping_cost || 0);
      dataRows[0].other_costs = parseFloat(order.other_costs || 0);
      dataRows[0].tracking_code = order.order_number;
    }
    
    // Check if there's a template uploaded
    const template = await db
      .prepare("SELECT file_key FROM export_templates WHERE type = ? LIMIT 1")
      .bind("order_receipt")
      .first<{ file_key: string }>();
    
    let templateBase64 = null;
    if (template) {
      const templateObject = await c.env.R2_BUCKET.get(template.file_key);
      if (templateObject) {
        const arrayBuffer = await templateObject.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        templateBase64 = btoa(String.fromCharCode(...uint8Array));
      }
    }
    
    // Return data for frontend to process with XLSX library
    return c.json({
      success: true,
      dataRows,
      templateBase64,
      filename: `Recebimento_${order.order_number}.xlsx`
    });
  } catch (error) {
    console.error("Error exporting receipt XLSX:", error);
    return c.json({ error: "Failed to export receipt data" }, 500);
  }
});

export default app;
