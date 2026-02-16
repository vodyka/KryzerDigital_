import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

app.get("/", async (c) => {
  const db = c.env.DB;
  const companyId = c.get("companyId");
  
  if (!companyId) {
    return c.json({ error: "Company not found" }, 404);
  }
  
  try {
    // Get query parameters
    const bankId = c.req.query("bank_id");
    const categoryId = c.req.query("category_id");
    const paymentMethod = c.req.query("payment_method");
    const dateFilter = c.req.query("date_filter");
    const startDate = c.req.query("start_date");
    const endDate = c.req.query("end_date");
    
    // Get bank name if filtering by bank
    let bankName = null;
    if (bankId && bankId !== "all") {
      const bank = await db
        .prepare("SELECT bank_name FROM bank_accounts WHERE id = ? AND company_id = ?")
        .bind(bankId, companyId)
        .first();
      bankName = bank?.bank_name as string;
    }
    
    // Build date conditions
    let dateCondition = "";
    
    if (dateFilter === "month") {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
      dateCondition = `AND due_date >= '${firstDay}' AND due_date <= '${lastDay}'`;
    } else if (dateFilter === "lastMonth") {
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];
      dateCondition = `AND due_date >= '${firstDay}' AND due_date <= '${lastDay}'`;
    } else if (dateFilter === "last30") {
      const date30DaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dateCondition = `AND due_date >= '${date30DaysAgo}'`;
    } else if (dateFilter === "year") {
      const firstDay = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      dateCondition = `AND due_date >= '${firstDay}'`;
    } else if (dateFilter === "custom" && startDate && endDate) {
      dateCondition = `AND due_date >= '${startDate}' AND due_date <= '${endDate}'`;
    }
    
    // Build filter conditions for payables
    let payableFilters = `WHERE company_id = ? ${dateCondition}`;
    if (bankId && bankId !== "all") {
      payableFilters += ` AND bank_account_id = ${bankId}`;
    }
    if (categoryId && categoryId !== "all") {
      payableFilters += ` AND category_id = ${categoryId}`;
    }
    if (paymentMethod && paymentMethod !== "all") {
      payableFilters += ` AND payment_method = '${paymentMethod}'`;
    }
    
    // Get total payables (expenses) for this company with filters (only unpaid)
    const payablesResult = await db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM accounts_payable ${payableFilters} AND is_paid = 0`)
      .bind(companyId)
      .first<{ total: number }>();
    
    const totalExpenses = Math.abs(payablesResult?.total || 0);
    
    // Build date condition for receivables
    let receivableDateCondition = dateCondition.replace(/due_date/g, "receipt_date");
    
    // Build filter conditions for receivables
    let receivableFilters = `WHERE company_id = ? ${receivableDateCondition}`;
    if (bankName) {
      receivableFilters += ` AND bank_account = '${bankName}'`;
    }
    if (categoryId && categoryId !== "all") {
      receivableFilters += ` AND category_id = ${categoryId}`;
    }
    
    // Get total receivables (revenue) for this company with filters (only unpaid/unreceived)
    const receivablesResult = await db
      .prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM accounts_receivable ${receivableFilters} AND is_paid = 0`)
      .bind(companyId)
      .first<{ total: number }>();
    
    const totalRevenue = receivablesResult?.total || 0;
    
    // Calculate balance
    const balance = totalRevenue - totalExpenses;
    
    // Build filters for upcoming payments
    let upcomingPaymentFilters = `WHERE ap.company_id = ?
        AND ap.due_date >= date('now') 
        AND ap.due_date <= date('now', '+30 days')
        AND (ap.is_paid IS NULL OR ap.is_paid = 0)`;
    
    if (bankId && bankId !== "all") {
      upcomingPaymentFilters += ` AND ap.bank_account_id = ${bankId}`;
    }
    if (categoryId && categoryId !== "all") {
      upcomingPaymentFilters += ` AND ap.category_id = ${categoryId}`;
    }
    if (paymentMethod && paymentMethod !== "all") {
      upcomingPaymentFilters += ` AND ap.payment_method = '${paymentMethod}'`;
    }
    
    // Get upcoming payments (next 30 days) - não pagos
    const upcomingPayments = await db
      .prepare(`
        SELECT ap.*, s.company_name
        FROM accounts_payable ap
        LEFT JOIN suppliers s ON ap.supplier_id = s.id
        ${upcomingPaymentFilters}
        ORDER BY ap.due_date ASC
        LIMIT 5
      `)
      .bind(companyId)
      .all();
    
    // Build filters for upcoming receipts
    let upcomingReceiptFilters = `WHERE company_id = ?
        AND receipt_date >= date('now') 
        AND receipt_date <= date('now', '+30 days')`;
    
    if (bankName) {
      upcomingReceiptFilters += ` AND bank_account = '${bankName}'`;
    }
    if (categoryId && categoryId !== "all") {
      upcomingReceiptFilters += ` AND category_id = ${categoryId}`;
    }
    
    // Get upcoming receipts (next 30 days) for this company (only unreceived)
    const upcomingReceipts = await db
      .prepare(`
        SELECT * FROM accounts_receivable 
        ${upcomingReceiptFilters}
        AND is_paid = 0
        ORDER BY receipt_date ASC
        LIMIT 5
      `)
      .bind(companyId)
      .all();
    
    return c.json({
      totalRevenue,
      totalExpenses,
      balance,
      upcomingPaymentsCount: upcomingPayments.results.length,
      upcomingReceiptsCount: upcomingReceipts.results.length,
      upcomingPayments: upcomingPayments.results,
      upcomingReceipts: upcomingReceipts.results,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return c.json({ error: "Failed to fetch dashboard data" }, 500);
  }
});

export default app;
