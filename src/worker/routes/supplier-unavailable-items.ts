import { Hono } from "hono";
import { verify } from "hono/jwt";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// JWT secret (must match portal.ts)
const JWT_SECRET = "portal_secret_key_change_in_production";

// Toggle item unavailability
app.post("/toggle", async (c) => {
  try {
    // Verify authentication
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
    const { order_id, item_index, supplier_id, is_unavailable } = await c.req.json();
    
    if (!order_id || item_index === undefined || !supplier_id) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    // Get order and item details for notification
    const order = await db
      .prepare("SELECT order_number, user_id FROM orders WHERE id = ?")
      .bind(order_id)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    const items = await db
      .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
      .bind(order_id)
      .all();
    
    const item = items.results?.[item_index];
    
    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }
    
    // Check if record exists
    const existing = await db
      .prepare("SELECT * FROM supplier_unavailable_items WHERE order_id = ? AND item_index = ?")
      .bind(order_id, item_index)
      .first();
    
    if (is_unavailable) {
      // Mark as unavailable
      if (existing) {
        await db
          .prepare("UPDATE supplier_unavailable_items SET is_unavailable = 1, marked_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(existing.id)
          .run();
      } else {
        await db
          .prepare("INSERT INTO supplier_unavailable_items (order_id, item_index, supplier_id, is_unavailable) VALUES (?, ?, ?, 1)")
          .bind(order_id, item_index, supplier_id)
          .run();
      }
      
      // Create notification for admin
      const notificationTitle = "Produto sem material disponível";
      const notificationMessage = `O fornecedor marcou o produto "${item.product_name}" (SKU: ${item.sku}) do pedido ${order.order_number} como indisponível por falta de material.`;
      
      await db
        .prepare(`
          INSERT INTO admin_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
          VALUES (?, ?, ?, 'unavailable_item', 'order', ?)
        `)
        .bind(order.user_id, notificationTitle, notificationMessage, order_id)
        .run();
    } else {
      // Mark as available again
      if (existing) {
        await db
          .prepare("UPDATE supplier_unavailable_items SET is_unavailable = 0, marked_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(existing.id)
          .run();
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error toggling item unavailability:", error);
    return c.json({ error: "Failed to update item status" }, 500);
  }
});

// Get unavailable items for order
app.get("/order/:orderId", async (c) => {
  try {
    const db = c.env.DB;
    const orderId = c.req.param("orderId");
    
    const unavailableItems = await db
      .prepare("SELECT * FROM supplier_unavailable_items WHERE order_id = ? AND is_unavailable = 1")
      .bind(orderId)
      .all();
    
    return c.json({ unavailable_items: unavailableItems.results || [] });
  } catch (error) {
    console.error("Error fetching unavailable items:", error);
    return c.json({ error: "Failed to fetch unavailable items" }, 500);
  }
});

export default app;
