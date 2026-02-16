import { Hono } from "hono";
import type { Env } from "../types";
import { getUserIdFromToken } from "../middleware/auth";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const bank_id = c.req.query("bank_id");
    const categoryId = c.req.query("category_id");
    const paymentMethod = c.req.query("payment_method");
    const days = c.req.query("days") || "30";
    const db = c.env.DB;
    
    // Get bank name if filtering by bank
    let bankName = null;
    if (bank_id && bank_id !== "all") {
      const bank = await db
        .prepare("SELECT bank_name FROM bank_accounts WHERE id = ? AND user_id = ?")
        .bind(bank_id, userId)
        .first();
      bankName = bank?.bank_name as string;
    }

    // Calculate date range
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    // Get bank account initial balance
    let initialBalance = 0;
    if (bank_id && bank_id !== "all") {
      const bankAccount = await db
        .prepare(`SELECT current_balance FROM bank_accounts WHERE id = ? AND user_id = ?`)
        .bind(bank_id, userId)
        .first<{ current_balance: number }>();
      
      initialBalance = bankAccount?.current_balance || 0;
    } else {
      // Sum all bank accounts
      const allBalances = await db
        .prepare(`SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE user_id = ?`)
        .bind(userId)
        .first<{ total: number }>();
      
      initialBalance = allBalances?.total || 0;
    }

    // Build filters for receivables
    let receivableFilters = "";
    const receivablesParams: any[] = [userId, today.toISOString().split('T')[0], futureDate.toISOString().split('T')[0]];
    
    if (bankName) {
      receivableFilters += " AND bank_account = ?";
      receivablesParams.push(bankName);
    }
    if (categoryId && categoryId !== "all") {
      receivableFilters += " AND category_id = ?";
      receivablesParams.push(categoryId);
    }
    
    // Get all receivables in the period (only unpaid)
    const receivables = await db
      .prepare(`
        SELECT receipt_date as date, SUM(amount) as amount
        FROM accounts_receivable
        WHERE user_id = ? AND is_paid = 0 AND receipt_date BETWEEN ? AND ? ${receivableFilters}
        GROUP BY receipt_date
      `)
      .bind(...receivablesParams)
      .all<{ date: string; amount: number }>();

    // Build filters for payables
    let payableFilters = "";
    const payablesParams: any[] = [userId, today.toISOString().split('T')[0], futureDate.toISOString().split('T')[0]];
    
    if (bank_id && bank_id !== "all") {
      payableFilters += " AND bank_account_id = ?";
      payablesParams.push(bank_id);
    }
    if (categoryId && categoryId !== "all") {
      payableFilters += " AND category_id = ?";
      payablesParams.push(categoryId);
    }
    if (paymentMethod && paymentMethod !== "all") {
      payableFilters += " AND payment_method = ?";
      payablesParams.push(paymentMethod);
    }
    
    // Get all payables in the period (only unpaid)
    const payables = await db
      .prepare(`
        SELECT due_date as date, SUM(ABS(amount)) as amount
        FROM accounts_payable
        WHERE user_id = ? AND is_paid = 0 AND due_date BETWEEN ? AND ? ${payableFilters}
        GROUP BY due_date
      `)
      .bind(...payablesParams)
      .all<{ date: string; amount: number }>();

    // Create a map for quick lookup
    const receivablesMap = new Map<string, number>();
    receivables.results.forEach(r => {
      receivablesMap.set(r.date, r.amount);
    });

    const payablesMap = new Map<string, number>();
    payables.results.forEach(p => {
      payablesMap.set(p.date, p.amount);
    });

    // Generate daily data
    const chartData = [];
    let currentBalance = initialBalance;
    const currentDate = new Date(today);

    while (currentDate <= futureDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const entradas = receivablesMap.get(dateStr) || 0;
      const saidas = payablesMap.get(dateStr) || 0;
      
      // Update balance: previous balance + income - expenses
      currentBalance = currentBalance + entradas - saidas;

      chartData.push({
        date: dateStr,
        entradas: entradas,
        saidas: saidas,
        saldo: currentBalance,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return c.json({ data: chartData });
  } catch (error) {
    console.error("Error fetching projection chart data:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
