import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// Get recent receipt errors for supplier portal
app.get("/by-supplier/:supplierId", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplierId");
    
    const errors = await db
      .prepare(`
        SELECT 
          ore.*,
          o.order_number,
          o.created_at as order_date
        FROM order_receipt_errors ore
        JOIN orders o ON ore.order_id = o.id
        WHERE o.supplier_id = ?
          AND ore.error_reason != 'Solicitação para acrescentar'
        ORDER BY ore.created_at DESC
        LIMIT 20
      `)
      .bind(supplierId)
      .all();
    
    return c.json({ errors: errors.results || [] });
  } catch (error) {
    console.error("Error fetching receipt errors:", error);
    return c.json({ error: "Failed to fetch receipt errors" }, 500);
  }
});

export default app;
