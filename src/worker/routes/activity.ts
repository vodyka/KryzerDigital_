import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

// Get recent activity logs
app.get("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const limit = parseInt(c.req.query("limit") || "10");
    
    const activities = await db
      .prepare(`
        SELECT * FROM activity_logs 
        WHERE company_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `)
      .bind(companyId, limit)
      .all();
    
    return c.json({ activities: activities.results || [] });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return c.json({ error: "Failed to fetch activities" }, 500);
  }
});

export default app;
