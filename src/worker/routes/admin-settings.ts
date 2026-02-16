import { Hono } from "hono";

const adminSettings = new Hono<{ Bindings: Env }>();

// Middleware to verify admin access
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

// Apply middleware to all routes
adminSettings.use("/*", requireAdmin);

// Get settings
adminSettings.get("/", async (c) => {
  try {
    const settings = await c.env.DB.prepare(
      `SELECT * FROM admin_settings WHERE id = 1`
    ).first();

    return c.json({ settings: settings || {} });
  } catch (error: any) {
    console.error("Failed to fetch settings:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// Update settings
adminSettings.put("/", async (c) => {
  try {
    const body = await c.req.json();

    // Build dynamic UPDATE query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'system_logo',
      'login_logo',
      'theme_primary_color',
      'theme_secondary_color',
      'theme_background_from',
      'theme_background_via',
      'theme_background_to',
      'uber_icon',
      'whatsapp_icon',
      'shipping_supplies_icon',
      'resale_merchandise_icon',
      'after_hours_icon',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        fields.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (fields.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE admin_settings SET ${fields.join(', ')} WHERE id = 1`;

    await c.env.DB.prepare(query).bind(...values).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

export default adminSettings;
