import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Get all menu visibility settings
app.get("/", async (c) => {
  try {
    const db = c.env.DB;

    const settings = await db
      .prepare("SELECT * FROM menu_visibility ORDER BY menu_path")
      .all();

    return c.json({ settings: settings.results || [] });
  } catch (error) {
    console.error("Error fetching menu visibility:", error);
    return c.json({ error: "Failed to fetch menu visibility settings" }, 500);
  }
});

// Create or update menu visibility setting
app.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    
    const {
      menu_path,
      menu_label,
      visibility_type,
      hidden_for_user_ids = null,
      hidden_for_levels = null,
    } = body;

    if (!menu_path || !menu_label || !visibility_type) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Check if setting already exists
    const existing = await db
      .prepare("SELECT id FROM menu_visibility WHERE menu_path = ?")
      .bind(menu_path)
      .first();

    if (existing) {
      // Update existing
      await db
        .prepare(`
          UPDATE menu_visibility 
          SET menu_label = ?,
              visibility_type = ?,
              hidden_for_user_ids = ?,
              hidden_for_levels = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE menu_path = ?
        `)
        .bind(
          menu_label,
          visibility_type,
          hidden_for_user_ids,
          hidden_for_levels,
          menu_path
        )
        .run();
    } else {
      // Insert new
      await db
        .prepare(`
          INSERT INTO menu_visibility (
            menu_path, menu_label, visibility_type, 
            hidden_for_user_ids, hidden_for_levels
          ) VALUES (?, ?, ?, ?, ?)
        `)
        .bind(
          menu_path,
          menu_label,
          visibility_type,
          hidden_for_user_ids,
          hidden_for_levels
        )
        .run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving menu visibility:", error);
    return c.json({ error: "Failed to save menu visibility setting" }, 500);
  }
});

// Delete menu visibility setting (restore to default visible)
app.delete("/", async (c) => {
  try {
    const db = c.env.DB;
    const menu_path = c.req.query("menu_path");

    if (!menu_path) {
      return c.json({ error: "Missing menu_path parameter" }, 400);
    }

    await db
      .prepare("DELETE FROM menu_visibility WHERE menu_path = ?")
      .bind(menu_path)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu visibility:", error);
    return c.json({ error: "Failed to delete menu visibility setting" }, 500);
  }
});

export default app;
