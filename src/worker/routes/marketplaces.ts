import { Hono } from "hono";

const marketplaces = new Hono<{ Bindings: Env }>();

// Get all active marketplaces
marketplaces.get("/", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      `SELECT id, name, slug, logo_url, is_active
       FROM marketplaces
       WHERE is_active = 1
       ORDER BY name`
    ).all();

    return c.json({ marketplaces: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch marketplaces:", error);
    return c.json({ error: "Failed to fetch marketplaces" }, 500);
  }
});

export default marketplaces;
