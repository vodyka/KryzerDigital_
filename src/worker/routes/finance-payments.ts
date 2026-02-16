import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// GET all payment records for a company
app.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");

    const result = await c.env.DB.prepare(
      `SELECT pr.*, ap.description, ap.supplier_id
       FROM payment_records pr
       JOIN accounts_payable ap ON pr.account_payable_id = ap.id
       WHERE ap.company_id = ?
       ORDER BY pr.payment_date DESC`
    )
      .bind(companyId)
      .all();

    return c.json({ payments: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch payments:", error);
    return c.json({ error: "Failed to fetch payments" }, 500);
  }
});

// POST create payment record
app.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    const body = await c.req.json();

    const { account_payable_id, amount, payment_date, payment_method, bank_account, notes } = body;

    // Verify the payable belongs to this company
    const payable = await c.env.DB.prepare(
      `SELECT id, is_paid FROM accounts_payable WHERE id = ? AND company_id = ?`
    )
      .bind(account_payable_id, companyId)
      .first();

    if (!payable) {
      return c.json({ error: "Payable not found" }, 404);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO payment_records (
        user_id, account_payable_id, amount, payment_date, 
        payment_method, bank_account, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(userId, account_payable_id, amount, payment_date, payment_method || null, bank_account || null, notes || null)
      .run();

    // Update payable status
    await c.env.DB.prepare(
      `UPDATE accounts_payable 
       SET is_paid = 1, paid_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(payment_date, account_payable_id)
      .run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error: any) {
    console.error("Failed to create payment:", error);
    return c.json({ error: "Failed to create payment" }, 500);
  }
});

// DELETE payment record
app.delete("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");

    // Get the payment and verify company access
    const payment = await c.env.DB.prepare(
      `SELECT pr.account_payable_id 
       FROM payment_records pr
       JOIN accounts_payable ap ON pr.account_payable_id = ap.id
       WHERE pr.id = ? AND ap.company_id = ?`
    )
      .bind(id, companyId)
      .first();

    if (!payment) {
      return c.json({ error: "Payment not found" }, 404);
    }

    // Delete the payment record
    await c.env.DB.prepare(`DELETE FROM payment_records WHERE id = ?`).bind(id).run();

    // Update payable status back to unpaid
    await c.env.DB.prepare(
      `UPDATE accounts_payable 
       SET is_paid = 0, paid_date = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind((payment as any).account_payable_id)
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete payment:", error);
    return c.json({ error: "Failed to delete payment" }, 500);
  }
});

export default app;
