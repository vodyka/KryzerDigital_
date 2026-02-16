import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const db = c.env.DB;

  try {
    // Buscar receitas do período (apenas não recebidas)
    const receivablesResult = await db
      .prepare(
        `SELECT 
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total,
          COALESCE(SUM(amount), 0) as confirmed
         FROM accounts_receivable
         WHERE is_paid = 0`
      )
      .first();

    // Buscar despesas do período (apenas não pagas)
    const payablesResult = await db
      .prepare(
        `SELECT 
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total,
          COALESCE(SUM(amount), 0) as confirmed
         FROM accounts_payable
         WHERE is_paid = 0`
      )
      .first();

    // Calcular saldo
    const receivablesTotal = (receivablesResult?.total as number) || 0;
    const payablesTotal = (payablesResult?.total as number) || 0;
    const balance = receivablesTotal - payablesTotal;

    // Buscar próximos recebimentos (próximos 7 dias, apenas não recebidos)
    const upcomingReceivables = await db
      .prepare(
        `SELECT 
          id,
          receipt_date,
          customer_name,
          description,
          amount
         FROM accounts_receivable
         WHERE is_paid = 0
         AND receipt_date >= DATE('now')
         AND receipt_date <= DATE('now', '+7 days')
         ORDER BY receipt_date ASC
         LIMIT 5`
      )
      .all();

    // Buscar próximos pagamentos (próximos 7 dias, apenas não pagos)
    const upcomingPayables = await db
      .prepare(
        `SELECT 
          id,
          due_date,
          description,
          amount
         FROM accounts_payable
         WHERE is_paid = 0
         AND due_date >= DATE('now')
         AND due_date <= DATE('now', '+7 days')
         ORDER BY due_date ASC
         LIMIT 5`
      )
      .all();

    return c.json({
      receivables: {
        count: receivablesResult?.count || 0,
        total: receivablesTotal,
        confirmed: receivablesResult?.confirmed || 0,
      },
      payables: {
        count: payablesResult?.count || 0,
        total: payablesTotal,
        confirmed: payablesResult?.confirmed || 0,
      },
      balance: {
        current: balance,
        projected30: balance,
        projected60: balance,
        projected90: balance,
      },
      upcoming: {
        receivables: upcomingReceivables.results || [],
        payables: upcomingPayables.results || [],
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return c.json({ error: "Failed to fetch dashboard data" }, 500);
  }
});

export default app;
