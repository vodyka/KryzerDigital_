import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

// Search for transactions to link (for multiple reconciliation)
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const query = c.req.query("query") || "";

    if (!query || query.length < 2) {
      return c.json({ results: [] });
    }

    const searchPattern = `%${query}%`;

    // Search in accounts payable (unpaid or recently paid)
    const payables = await db
      .prepare(`
        SELECT 
          ap.id,
          'expense' as type,
          ap.description,
          ap.amount,
          ap.due_date as transaction_date,
          s.company_name as person_name,
          ap.is_paid
        FROM accounts_payable ap
        LEFT JOIN suppliers s ON s.id = ap.supplier_id
        WHERE ap.company_id = ?
          AND (ap.is_paid = 0 OR (ap.is_paid = 1 AND ap.paid_date >= date('now', '-30 days')))
          AND (
            ap.description LIKE ? 
            OR s.company_name LIKE ?
            OR ap.reference LIKE ?
          )
        ORDER BY ap.due_date DESC
        LIMIT 50
      `)
      .bind(companyId, searchPattern, searchPattern, searchPattern)
      .all();

    // Search in accounts receivable (unpaid or recently paid)
    const receivables = await db
      .prepare(`
        SELECT 
          id,
          'income' as type,
          description,
          amount,
          receipt_date as transaction_date,
          customer_name as person_name,
          is_paid
        FROM accounts_receivable
        WHERE company_id = ?
          AND (is_paid = 0 OR (is_paid = 1 AND paid_date >= date('now', '-30 days')))
          AND (
            description LIKE ? 
            OR customer_name LIKE ?
          )
        ORDER BY receipt_date DESC
        LIMIT 50
      `)
      .bind(companyId, searchPattern, searchPattern)
      .all();

    // Combine and sort by date
    const results = [...(payables.results || []), ...(receivables.results || [])]
      .sort((a, b) => {
        const dateA = new Date(a.transaction_date as string);
        const dateB = new Date(b.transaction_date as string);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 50);

    return c.json({ results });
  } catch (error) {
    console.error("Error searching transactions:", error);
    return c.json({ error: "Erro ao buscar transações" }, 500);
  }
});

export default app;
