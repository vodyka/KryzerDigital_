import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// GET all payables for a company
app.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");

    const result = await c.env.DB.prepare(
      `SELECT * FROM accounts_payable 
       WHERE company_id = ? 
       ORDER BY due_date ASC, created_at DESC`
    )
      .bind(companyId)
      .all();

    return c.json({ payables: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch payables:", error);
    return c.json({ error: "Failed to fetch payables" }, 500);
  }
});

// POST create new payable
app.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    const body = await c.req.json();

    const {
      supplier_id,
      amount,
      due_date,
      competence_date,
      description,
      category_id,
      cost_center,
      bank_account_id,
      payment_method,
      reference,
    } = body;

    const result = await c.env.DB.prepare(
      `INSERT INTO accounts_payable (
        user_id, company_id, supplier_id, amount, due_date, competence_date,
        description, category_id, cost_center, bank_account_id, payment_method,
        reference, is_paid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(
        userId,
        companyId,
        supplier_id || null,
        amount,
        due_date,
        competence_date || null,
        description || null,
        category_id || null,
        cost_center || null,
        bank_account_id || null,
        payment_method || null,
        reference || null
      )
      .run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error: any) {
    console.error("Failed to create payable:", error);
    return c.json({ error: "Failed to create payable" }, 500);
  }
});

// PUT update payable
app.put("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const {
      supplier_id,
      amount,
      due_date,
      competence_date,
      description,
      category_id,
      cost_center,
      bank_account_id,
      payment_method,
      reference,
    } = body;

    await c.env.DB.prepare(
      `UPDATE accounts_payable 
       SET supplier_id = ?, amount = ?, due_date = ?, competence_date = ?,
           description = ?, category_id = ?, cost_center = ?, bank_account_id = ?,
           payment_method = ?, reference = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    )
      .bind(
        supplier_id || null,
        amount,
        due_date,
        competence_date || null,
        description || null,
        category_id || null,
        cost_center || null,
        bank_account_id || null,
        payment_method || null,
        reference || null,
        id,
        companyId
      )
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update payable:", error);
    return c.json({ error: "Failed to update payable" }, 500);
  }
});

// DELETE payable
app.delete("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");

    await c.env.DB.prepare(
      `DELETE FROM accounts_payable WHERE id = ? AND company_id = ?`
    ).bind(id, companyId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete payable:", error);
    return c.json({ error: "Failed to delete payable" }, 500);
  }
});

// POST mark as paid
app.post("/:id/pay", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const { paid_date } = body;

    await c.env.DB.prepare(
      `UPDATE accounts_payable 
       SET is_paid = 1, paid_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    )
      .bind(paid_date || new Date().toISOString().split("T")[0], id, companyId)
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to mark payable as paid:", error);
    return c.json({ error: "Failed to mark payable as paid" }, 500);
  }
});

export default app;
