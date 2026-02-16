import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Get all users for admin
app.get("/", async (c) => {
  try {
    const db = c.env.DB;

    const users = await db
      .prepare(`
        SELECT 
          id,
          email,
          name as full_name,
          plan as access_level
        FROM users
        ORDER BY email
      `)
      .all();

    return c.json({ users: users.results || [] });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

export default app;
