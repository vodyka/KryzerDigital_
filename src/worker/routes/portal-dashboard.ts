import { Hono } from "hono";
import { verify } from "hono/jwt";

type Variables = {
  supplier_id: number;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
const JWT_SECRET = "portal_secret_key_change_in_production";

// Middleware to verify token
const verifyToken = async (c: any, next: any) => {
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

    c.set("supplier_id", payload.supplier_id as number);
    await next();
  } catch (error) {
    return c.json({ error: "Token inválido" }, 401);
  }
};

app.use("/*", verifyToken);

// Get dashboard data
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.get("supplier_id") as number;
    const month = c.req.query("month") || new Date().toISOString().slice(0, 7); // YYYY-MM

    // Parse the month
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().slice(0, 10);

    // Previous month
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
    const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().slice(0, 10);

    // Current month total
    const currentMonthResult = await db
      .prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE supplier_id = ? 
        AND status = 'Completo'
        AND DATE(created_at) >= ? 
        AND DATE(created_at) <= ?
      `)
      .bind(supplierId, startDate, endDate)
      .first();

    // Previous month total
    const previousMonthResult = await db
      .prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE supplier_id = ? 
        AND status = 'Completo'
        AND DATE(created_at) >= ? 
        AND DATE(created_at) <= ?
      `)
      .bind(supplierId, prevStartDate, prevEndDate)
      .first();

    // Annual total (current year)
    const annualResult = await db
      .prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM orders
        WHERE supplier_id = ? 
        AND status = 'Completo'
        AND strftime('%Y', created_at) = ?
      `)
      .bind(supplierId, String(year))
      .first();

    // Monthly evolution (current month by day)
    const dailyEvolution = await db
      .prepare(`
        SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as total
        FROM orders
        WHERE supplier_id = ? 
        AND status = 'Completo'
        AND DATE(created_at) >= ? 
        AND DATE(created_at) <= ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `)
      .bind(supplierId, startDate, endDate)
      .all();

    // Previous month daily evolution
    const prevDailyEvolution = await db
      .prepare(`
        SELECT 
          DATE(created_at) as date,
          SUM(total_amount) as total
        FROM orders
        WHERE supplier_id = ? 
        AND status = 'Completo'
        AND DATE(created_at) >= ? 
        AND DATE(created_at) <= ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `)
      .bind(supplierId, prevStartDate, prevEndDate)
      .all();

    // Annual evolution (by month)
    const annualEvolution = await db
      .prepare(`
        SELECT 
          strftime('%m', created_at) as month,
          SUM(total_amount) as total
        FROM orders
        WHERE supplier_id = ? 
        AND status = 'Completo'
        AND strftime('%Y', created_at) = ?
        GROUP BY strftime('%m', created_at)
        ORDER BY month
      `)
      .bind(supplierId, String(year))
      .all();

    // Top 10 products
    const topProducts = await db
      .prepare(`
        SELECT 
          oi.product_name,
          oi.sku,
          p.image_url,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.subtotal) as total_amount
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.supplier_id = ? 
        AND o.status = 'Completo'
        AND strftime('%Y', o.created_at) = ?
        GROUP BY oi.product_name, oi.sku, p.image_url
        ORDER BY total_quantity DESC
        LIMIT 10
      `)
      .bind(supplierId, String(year))
      .all();

    // Payment punctuality rate
    const paymentsResult = await db
      .prepare(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN paid_date <= due_date THEN 1 ELSE 0 END) as on_time_payments
        FROM accounts_payable
        WHERE supplier_id = ? 
        AND is_paid = 1
        AND strftime('%Y', created_at) = ?
      `)
      .bind(supplierId, String(year))
      .first();

    const punctualityRate = paymentsResult?.total_payments
      ? (((paymentsResult.on_time_payments as number) / (paymentsResult.total_payments as number)) * 100).toFixed(1)
      : "0.0";

    return c.json({
      currentMonth: {
        total: currentMonthResult?.total || 0,
        month: month,
      },
      previousMonth: {
        total: previousMonthResult?.total || 0,
        month: `${prevYear}-${String(prevMonth).padStart(2, "0")}`,
      },
      annual: {
        total: annualResult?.total || 0,
        year: year,
      },
      dailyEvolution: dailyEvolution.results || [],
      prevDailyEvolution: prevDailyEvolution.results || [],
      annualEvolution: annualEvolution.results || [],
      topProducts: topProducts.results || [],
      punctualityRate: parseFloat(punctualityRate),
    });
  } catch (error) {
    console.error("Error fetching portal dashboard data:", error);
    return c.json({ error: "Erro ao buscar dados do dashboard" }, 500);
  }
});

export default app;
