import { Hono } from "hono";
import { getUserIdFromToken } from "../middleware/auth";

const app = new Hono<{ Bindings: Env }>();

// Get supplier distribution data
app.get("/", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    
    // Get top 4 suppliers by purchase value (excluding canceled orders)
    const topSuppliers = await db
      .prepare(`
        SELECT 
          s.id,
          s.name,
          s.company_name,
          s.trade_name,
          s.person_type,
          COALESCE(SUM(o.total_value), 0) as total_purchases
        FROM suppliers s
        LEFT JOIN orders o ON s.id = o.supplier_id 
          AND o.status IN ('Pendente', 'Produção', 'Completo', 'Trânsito')
        WHERE s.user_id = ?
        GROUP BY s.id
        ORDER BY total_purchases DESC
        LIMIT 4
      `)
      .bind(userId)
      .all();
    
    // Get order counts by supplier (excluding canceled orders)
    const supplierOrders = await db
      .prepare(`
        SELECT 
          s.id,
          s.name,
          s.company_name,
          s.trade_name,
          s.person_type,
          COUNT(o.id) as order_count
        FROM suppliers s
        LEFT JOIN orders o ON s.id = o.supplier_id 
          AND o.status IN ('Pendente', 'Produção', 'Completo', 'Trânsito')
        WHERE s.user_id = ?
        GROUP BY s.id
        ORDER BY order_count DESC
        LIMIT 4
      `)
      .bind(userId)
      .all();
    
    // Format the data
    const purchasesBySupplier = (topSuppliers.results || []).map((supplier: any) => {
      const displayName = supplier.person_type === "fisica" 
        ? supplier.name 
        : (supplier.trade_name || supplier.company_name || "Sem nome");
      
      return {
        name: displayName,
        value: Number(supplier.total_purchases) || 0
      };
    });
    
    const ordersBySupplier = (supplierOrders.results || []).map((supplier: any) => {
      const displayName = supplier.person_type === "fisica" 
        ? supplier.name 
        : (supplier.trade_name || supplier.company_name || "Sem nome");
      
      return {
        name: displayName,
        count: Number(supplier.order_count) || 0
      };
    });
    
    return c.json({ 
      purchasesBySupplier,
      ordersBySupplier
    });
  } catch (error) {
    console.error("Error fetching supplier distribution:", error);
    return c.json({ error: "Failed to fetch supplier distribution" }, 500);
  }
});

export default app;
