import { Hono } from "hono";
import type { Env } from "../types";
import { getUserIdFromToken } from "../middleware/auth";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    
    const bankId = c.req.query("bank_id");
    const categoryId = c.req.query("category_id");
    const paymentMethod = c.req.query("payment_method");
    const days = parseInt(c.req.query("days") || "30");
    
    // Get bank name if filtering by bank
    let bankName = null;
    if (bankId && bankId !== "all") {
      const bank = await db
        .prepare("SELECT bank_name FROM bank_accounts WHERE id = ? AND user_id = ?")
        .bind(bankId, userId)
        .first();
      bankName = bank?.bank_name as string;
    }
    
    // Calculate dates
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    // Get current balance from bank accounts
    let currentBalance = 0;
    if (bankId && bankId !== "all") {
      const account = await db
        .prepare("SELECT current_balance FROM bank_accounts WHERE id = ? AND user_id = ? AND is_active = 1")
        .bind(bankId, userId)
        .first();
      currentBalance = parseFloat(account?.current_balance as string) || 0;
    } else {
      const accounts = await db
        .prepare("SELECT SUM(current_balance) as total FROM bank_accounts WHERE user_id = ? AND is_active = 1")
        .bind(userId)
        .first();
      currentBalance = parseFloat(accounts?.total as string) || 0;
    }
    
    // Build filters for receivables
    let receivableFilters = "";
    const receivableParams: any[] = [userId, futureDate.toISOString().split('T')[0]];
    
    if (bankName) {
      receivableFilters += " AND bank_account = ?";
      receivableParams.push(bankName);
    }
    if (categoryId && categoryId !== "all") {
      receivableFilters += " AND category_id = ?";
      receivableParams.push(categoryId);
    }
    
    // Get receivables within the period (only unpaid)
    const receivablesInPeriod = await db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM accounts_receivable
        WHERE user_id = ?
        AND is_paid = 0
        AND receipt_date <= ?
        ${receivableFilters}
      `)
      .bind(...receivableParams)
      .first();
    
    // Build filters for payables
    let payableFilters = "";
    const payableParams: any[] = [userId, futureDate.toISOString().split('T')[0]];
    
    if (bankId && bankId !== "all") {
      payableFilters += " AND bank_account_id = ?";
      payableParams.push(bankId);
    }
    if (categoryId && categoryId !== "all") {
      payableFilters += " AND category_id = ?";
      payableParams.push(categoryId);
    }
    if (paymentMethod && paymentMethod !== "all") {
      payableFilters += " AND payment_method = ?";
      payableParams.push(paymentMethod);
    }
    
    // Get payables within the period
    const payablesInPeriod = await db
      .prepare(`
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM accounts_payable
        WHERE user_id = ?
        AND is_paid = 0
        AND due_date <= ?
        ${payableFilters}
      `)
      .bind(...payableParams)
      .first();
    
    // Get all future receivables (for total projected income)
    const totalReceivablesParams: any[] = [userId];
    let totalReceivableFilters = "";
    
    if (bankName) {
      totalReceivableFilters += " AND bank_account = ?";
      totalReceivablesParams.push(bankName);
    }
    if (categoryId && categoryId !== "all") {
      totalReceivableFilters += " AND category_id = ?";
      totalReceivablesParams.push(categoryId);
    }
    
    const totalReceivables = await db
      .prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM accounts_receivable
        WHERE user_id = ?
        AND is_paid = 0
        ${totalReceivableFilters}
      `)
      .bind(...totalReceivablesParams)
      .first();
    
    // Get all future payables (for total projected expenses)
    const totalPayablesParams: any[] = [userId];
    let totalPayableFilters = "";
    
    if (bankId && bankId !== "all") {
      totalPayableFilters += " AND bank_account_id = ?";
      totalPayablesParams.push(bankId);
    }
    if (categoryId && categoryId !== "all") {
      totalPayableFilters += " AND category_id = ?";
      totalPayablesParams.push(categoryId);
    }
    if (paymentMethod && paymentMethod !== "all") {
      totalPayableFilters += " AND payment_method = ?";
      totalPayablesParams.push(paymentMethod);
    }
    
    const totalPayables = await db
      .prepare(`
        SELECT COALESCE(SUM(ABS(amount)), 0) as total
        FROM accounts_payable
        WHERE user_id = ?
        AND is_paid = 0
        ${totalPayableFilters}
      `)
      .bind(...totalPayablesParams)
      .first();
    
    const receivablesAmount = parseFloat(receivablesInPeriod?.total as string) || 0;
    const payablesAmount = parseFloat(payablesInPeriod?.total as string) || 0;
    const projectedBalance = currentBalance + receivablesAmount - payablesAmount;
    
    return c.json({
      currentBalance,
      projectedBalance,
      totalReceivables: parseFloat(totalReceivables?.total as string) || 0,
      totalPayables: parseFloat(totalPayables?.total as string) || 0,
      receivablesInPeriod: receivablesAmount,
      payablesInPeriod: payablesAmount,
    });
  } catch (error) {
    console.error("Error fetching projection data:", error);
    return c.json({ error: "Failed to fetch projection data" }, 500);
  }
});

export default app;
