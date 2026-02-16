import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// GET all receipts (income records) for a company
app.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");

    const result = await c.env.DB.prepare(
      `SELECT * FROM accounts_receivable 
       WHERE company_id = ? AND is_paid = 1
       ORDER BY paid_date DESC`
    )
      .bind(companyId)
      .all();

    return c.json({ receipts: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch receipts:", error);
    return c.json({ error: "Failed to fetch receipts" }, 500);
  }
});

export default app;
