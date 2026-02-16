import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// Cancel order (supplier portal)
app.post("/:orderId/cancel", async (c) => {
  try {
    const db = c.env.DB;
    const orderId = c.req.param("orderId");
    
    // Get order details
    const order = await db
      .prepare("SELECT * FROM orders WHERE id = ?")
      .bind(orderId)
      .first();
    
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }
    
    // Update order status to Cancelado
    await db
      .prepare("UPDATE orders SET status = 'Cancelado', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(orderId)
      .run();
    
    // Create notification for admin
    const notificationTitle = "Pedido cancelado por falta de material";
    const notificationMessage = `O pedido ${order.order_number} foi cancelado automaticamente porque o fornecedor não possui material disponível para nenhum dos produtos.`;
    
    await db
      .prepare(`
        INSERT INTO admin_notifications (user_id, title, message, type, related_entity_type, related_entity_id)
        VALUES (?, ?, ?, 'order_cancelled', 'order', ?)
      `)
      .bind(order.user_id, notificationTitle, notificationMessage, orderId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return c.json({ error: "Failed to cancel order" }, 500);
  }
});

export default app;
