import { Hono } from "hono";

const adminMarketplaces = new Hono<{ Bindings: Env }>();

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
adminMarketplaces.use("/*", requireAdmin);

// Get all marketplaces
adminMarketplaces.get("/", async (c) => {
  try {
    const marketplaces = await c.env.DB.prepare(
      `SELECT * FROM marketplaces ORDER BY display_order, name`
    ).all();

    return c.json({ marketplaces: marketplaces.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch marketplaces:", error);
    return c.json({ error: "Failed to fetch marketplaces" }, 500);
  }
});

// Create marketplace
adminMarketplaces.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const result = await c.env.DB.prepare(
      `INSERT INTO marketplaces (name, slug, logo_url, is_active, display_order)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        body.name,
        body.slug,
        body.logo_url || null,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
        body.display_order || 0
      )
      .run();

    const marketplaceId = result.meta.last_row_id;

    return c.json({ success: true, marketplace: { id: marketplaceId, ...body } });
  } catch (error: any) {
    console.error("Failed to create marketplace:", error);
    return c.json({ error: "Failed to create marketplace" }, 500);
  }
});

// Update marketplace display order (must come before /:id route)
adminMarketplaces.put("/order", async (c) => {
  try {
    const body = await c.req.json();
    const orders = body.orders || [];

    for (const order of orders) {
      await c.env.DB.prepare(
        `UPDATE marketplaces SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )
        .bind(order.display_order, order.id)
        .run();
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update order:", error);
    return c.json({ error: "Failed to update order" }, 500);
  }
});

// Update marketplace
adminMarketplaces.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.slug !== undefined) {
      updates.push("slug = ?");
      values.push(body.slug);
    }
    if (body.logo_url !== undefined) {
      updates.push("logo_url = ?");
      values.push(body.logo_url);
    }
    if (body.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE marketplaces SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update marketplace:", error);
    return c.json({ error: "Failed to update marketplace" }, 500);
  }
});

// Delete marketplace
adminMarketplaces.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    // Check if marketplace is being used
    const usage = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM collection_point_marketplaces WHERE marketplace_id = ?`
    )
      .bind(id)
      .first();

    const typedUsage = usage as { count: number } | null;

    if (typedUsage && typedUsage.count > 0) {
      return c.json(
        { error: "Cannot delete marketplace that is being used by collection points" },
        400
      );
    }

    await c.env.DB.prepare(`DELETE FROM marketplaces WHERE id = ?`)
      .bind(id)
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete marketplace:", error);
    return c.json({ error: "Failed to delete marketplace" }, 500);
  }
});

export default adminMarketplaces;
