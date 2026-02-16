import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";
import { getTransactionHistory } from "../utils/transaction-history";

const app = new Hono<AppContext>();

// Get transaction history
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const limit = parseInt(c.req.query("limit") || "100");

    const history = await getTransactionHistory(db, companyId, limit);

    return c.json({ history });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return c.json({ error: "Failed to fetch transaction history" }, 500);
  }
});

export default app;
