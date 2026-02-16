import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// GET all receivables for a company
app.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");

    const result = await c.env.DB.prepare(
      `SELECT * FROM accounts_receivable 
       WHERE company_id = ? 
       ORDER BY receipt_date ASC, created_at DESC`
    )
      .bind(companyId)
      .all();

    return c.json({ receivables: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch receivables:", error);
    return c.json({ error: "Failed to fetch receivables" }, 500);
  }
});

// POST create new receivable
app.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    const body = await c.req.json();

    const {
      receipt_date,
      customer_name,
      description,
      category_id,
      cost_center,
      bank_account_id,
      amount,
      contact_id,
      competence_date,
    } = body;

    const result = await c.env.DB.prepare(
      `INSERT INTO accounts_receivable (
        user_id, company_id, receipt_date, customer_name, description,
        category_id, cost_center, bank_account_id, amount, contact_id,
        competence_date, is_paid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(
        userId,
        companyId,
        receipt_date,
        customer_name,
        description || null,
        category_id || null,
        cost_center || null,
        bank_account_id || null,
        amount,
        contact_id || null,
        competence_date || null
      )
      .run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error: any) {
    console.error("Failed to create receivable:", error);
    return c.json({ error: "Failed to create receivable" }, 500);
  }
});

// PUT update receivable
app.put("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const {
      receipt_date,
      customer_name,
      description,
      category_id,
      cost_center,
      bank_account_id,
      amount,
      contact_id,
      competence_date,
    } = body;

    await c.env.DB.prepare(
      `UPDATE accounts_receivable 
       SET receipt_date = ?, customer_name = ?, description = ?,
           category_id = ?, cost_center = ?, bank_account_id = ?,
           amount = ?, contact_id = ?, competence_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    )
      .bind(
        receipt_date,
        customer_name,
        description || null,
        category_id || null,
        cost_center || null,
        bank_account_id || null,
        amount,
        contact_id || null,
        competence_date || null,
        id,
        companyId
      )
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update receivable:", error);
    return c.json({ error: "Failed to update receivable" }, 500);
  }
});

// DELETE receivable
app.delete("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");

    await c.env.DB.prepare(
      `DELETE FROM accounts_receivable WHERE id = ? AND company_id = ?`
    ).bind(id, companyId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete receivable:", error);
    return c.json({ error: "Failed to delete receivable" }, 500);
  }
});

// POST mark as received
app.post("/:id/receive", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const { paid_date } = body;

    await c.env.DB.prepare(
      `UPDATE accounts_receivable 
       SET is_paid = 1, paid_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    )
      .bind(paid_date || new Date().toISOString().split("T")[0], id, companyId)
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to mark receivable as received:", error);
    return c.json({ error: "Failed to mark receivable as received" }, 500);
  }
});

export default app;
