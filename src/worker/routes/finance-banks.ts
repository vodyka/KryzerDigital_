import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// GET all banks for a company
app.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");

    const result = await c.env.DB.prepare(
      `SELECT * FROM bank_accounts 
       WHERE company_id = ? 
       ORDER BY is_default DESC, bank_name ASC`
    )
      .bind(companyId)
      .all();

    return c.json({ banks: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch banks:", error);
    return c.json({ error: "Failed to fetch banks" }, 500);
  }
});

// POST create new bank
app.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    const body = await c.req.json();

    const { bank_code, bank_name, account_name, agency, account_number, account_digit, initial_balance, overdraft_limit, start_date, is_default } = body;

    // If setting as default, unset other defaults
    if (is_default) {
      await c.env.DB.prepare(
        `UPDATE bank_accounts SET is_default = 0 WHERE company_id = ?`
      ).bind(companyId).run();
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO bank_accounts (
        user_id, company_id, bank_code, bank_name, account_name, 
        agency, account_number, account_digit, initial_balance, 
        current_balance, overdraft_limit, start_date, is_default, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
      .bind(
        userId,
        companyId,
        bank_code,
        bank_name,
        account_name,
        agency || null,
        account_number || null,
        account_digit || null,
        initial_balance || 0,
        initial_balance || 0,
        overdraft_limit || 0,
        start_date || null,
        is_default ? 1 : 0
      )
      .run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error: any) {
    console.error("Failed to create bank:", error);
    return c.json({ error: "Failed to create bank" }, 500);
  }
});

// PUT update bank
app.put("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const { bank_code, bank_name, account_name, agency, account_number, account_digit, initial_balance, overdraft_limit, start_date, is_default, is_active } = body;

    // If setting as default, unset other defaults
    if (is_default) {
      await c.env.DB.prepare(
        `UPDATE bank_accounts SET is_default = 0 WHERE company_id = ? AND id != ?`
      ).bind(companyId, id).run();
    }

    await c.env.DB.prepare(
      `UPDATE bank_accounts 
       SET bank_code = ?, bank_name = ?, account_name = ?, agency = ?, 
           account_number = ?, account_digit = ?, initial_balance = ?, 
           overdraft_limit = ?, start_date = ?, is_default = ?, is_active = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    )
      .bind(
        bank_code,
        bank_name,
        account_name,
        agency || null,
        account_number || null,
        account_digit || null,
        initial_balance || 0,
        overdraft_limit || 0,
        start_date || null,
        is_default ? 1 : 0,
        is_active ? 1 : 0,
        id,
        companyId
      )
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update bank:", error);
    return c.json({ error: "Failed to update bank" }, 500);
  }
});

// DELETE bank
app.delete("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");

    await c.env.DB.prepare(
      `DELETE FROM bank_accounts WHERE id = ? AND company_id = ?`
    ).bind(id, companyId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete bank:", error);
    return c.json({ error: "Failed to delete bank" }, 500);
  }
});

export default app;
