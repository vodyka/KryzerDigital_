import { Hono } from "hono";

const bannerSettings = new Hono<{ Bindings: Env }>();

// Middleware to verify admin access for write operations
async function requireAdmin(c: any, next: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);

  // Extract user ID from local token format (user_123)
  if (!token.startsWith("user_")) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const userId = token.substring(5);

  // Check if user exists and is admin
  const result = await c.env.DB.prepare(
    "SELECT id, email, is_admin FROM users WHERE id = ?"
  )
    .bind(userId)
    .first();

  const typedResult = result as { id: number; email: string; is_admin: number } | null;

  if (!typedResult || typedResult.is_admin !== 1) {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
}

// Get banner settings (public - no auth required)
bannerSettings.get("/", async (c) => {
  try {
    const settings = await c.env.DB.prepare(
      `SELECT * FROM banner_settings WHERE id = 1`
    ).first();

    return c.json({ settings: settings || {} });
  } catch (error: any) {
    console.error("Failed to fetch banner settings:", error);
    return c.json({ error: "Failed to fetch banner settings" }, 500);
  }
});

// Update banner settings (admin only)
bannerSettings.put("/", requireAdmin, async (c) => {
  try {
    const body = await c.req.json();

    await c.env.DB.prepare(
      `UPDATE banner_settings SET
        banner_image = ?,
        banner_title = ?,
        banner_subtitle = ?,
        banner_button_text = ?,
        banner_button_link = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1`
    )
      .bind(
        body.banner_image || null,
        body.banner_title || '',
        body.banner_subtitle || '',
        body.banner_button_text || '',
        body.banner_button_link || '',
        body.is_active ? 1 : 0
      )
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update banner settings:", error);
    return c.json({ error: "Failed to update banner settings" }, 500);
  }
});

export default bannerSettings;
