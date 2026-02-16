import { Hono } from "hono";

const adminCollectionPoints = new Hono<{ Bindings: Env }>();

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
adminCollectionPoints.use("/*", requireAdmin);

// Get all collection points (admin)
adminCollectionPoints.get("/", async (c) => {
  try {
    const points = await c.env.DB.prepare(
      `SELECT * FROM collection_points ORDER BY created_at DESC`
    ).all();

    return c.json({ points: points.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch collection points:", error);
    return c.json({ error: "Failed to fetch collection points" }, 500);
  }
});

// Check if CEP is duplicate
adminCollectionPoints.get("/check-cep", async (c) => {
  try {
    const cep = c.req.query("cep");
    const excludeId = c.req.query("exclude_id");

    if (!cep) {
      return c.json({ exists: false });
    }

    let query = `SELECT id, name FROM collection_points WHERE cep = ?`;
    const params: any[] = [cep];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const existing = await c.env.DB.prepare(query)
      .bind(...params)
      .first();

    return c.json({
      exists: !!existing,
      point: existing ? { id: existing.id, name: existing.name } : null,
    });
  } catch (error: any) {
    console.error("Failed to check CEP:", error);
    return c.json({ error: "Failed to check CEP" }, 500);
  }
});

// Get collection point by ID (admin)
adminCollectionPoints.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const point = await c.env.DB.prepare(
      `SELECT * FROM collection_points WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!point) {
      return c.json({ error: "Collection point not found" }, 404);
    }

    return c.json({ point });
  } catch (error: any) {
    console.error("Failed to fetch collection point:", error);
    return c.json({ error: "Failed to fetch collection point" }, 500);
  }
});

// Create collection point
adminCollectionPoints.post("/", async (c) => {
  try {
    const body = await c.req.json();
    console.log("[Collection Point Create] Received payload:", JSON.stringify(body, null, 2));
    console.log("[Collection Point Create] marketplace_ids:", body.marketplace_ids);
    console.log("[Collection Point Create] marketplace_after_hours:", body.marketplace_after_hours);

    const result = await c.env.DB.prepare(
      `INSERT INTO collection_points (
        name, cep, street, number, neighborhood, complement, city, state,
        photo_url, accepts_returns, accepts_orders, is_active,
        accepts_uber_delivery, sells_shipping_supplies, provides_resale_merchandise,
        accepts_after_hours, whatsapp_number, owner_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        body.name,
        body.cep,
        body.street,
        body.number,
        body.neighborhood,
        body.complement,
        body.city,
        body.state,
        body.photo_url,
        body.accepts_returns ? 1 : 0,
        body.accepts_orders ? 1 : 0,
        body.is_active ? 1 : 0,
        body.accepts_uber_delivery ? 1 : 0,
        body.sells_shipping_supplies ? 1 : 0,
        body.provides_resale_merchandise ? 1 : 0,
        body.accepts_after_hours ? 1 : 0,
        body.whatsapp_number,
        body.owner_email
      )
      .run();

    const pointId = result.meta.last_row_id;

    // Insert marketplace relations with after hours settings
    if (body.marketplace_ids && body.marketplace_ids.length > 0) {
      console.log("[Collection Point Create] Processing", body.marketplace_ids.length, "marketplaces");
      const afterHoursMap = new Map();
      if (body.marketplace_after_hours) {
        body.marketplace_after_hours.forEach((mah: any) => {
          afterHoursMap.set(mah.marketplace_id, mah.accepts_after_hours);
        });
      }

      for (const marketplaceId of body.marketplace_ids) {
        const acceptsAfterHours = afterHoursMap.get(marketplaceId) || false;
        console.log(`[Collection Point Create] Inserting marketplace ${marketplaceId} with accepts_after_hours=${acceptsAfterHours}`);
        await c.env.DB.prepare(
          `INSERT INTO collection_point_marketplaces (collection_point_id, marketplace_id, accepts_after_hours)
           VALUES (?, ?, ?)`
        )
          .bind(pointId, marketplaceId, acceptsAfterHours ? 1 : 0)
          .run();
      }
      console.log("[Collection Point Create] Successfully inserted all marketplace relations");
    } else {
      console.log("[Collection Point Create] No marketplaces to insert");
    }

    // Insert schedules
    if (body.schedules && body.schedules.length > 0) {
      for (const schedule of body.schedules) {
        await c.env.DB.prepare(
          `INSERT INTO collection_point_schedules (
            collection_point_id, day_of_week, opening_time, closing_time, is_closed
          ) VALUES (?, ?, ?, ?, ?)`
        )
          .bind(
            pointId,
            schedule.day_of_week,
            schedule.opening_time || null,
            schedule.closing_time || null,
            schedule.is_closed ? 1 : 0
          )
          .run();
      }
    }

    // Insert marketplace-specific schedules
    if (body.marketplace_schedules && body.marketplace_schedules.length > 0) {
      for (const ms of body.marketplace_schedules) {
        for (const schedule of ms.schedules) {
          await c.env.DB.prepare(
            `INSERT INTO collection_point_marketplace_schedules (
              collection_point_id, marketplace_id, day_of_week, opening_time, closing_time, is_closed
            ) VALUES (?, ?, ?, ?, ?, ?)`
          )
            .bind(
              pointId,
              ms.marketplace_id,
              schedule.day_of_week,
              schedule.opening_time || null,
              schedule.closing_time || null,
              schedule.is_closed ? 1 : 0
            )
            .run();
        }
      }
    }

    return c.json({ success: true, id: pointId });
  } catch (error: any) {
    console.error("Failed to create collection point:", error);
    return c.json({ error: "Failed to create collection point" }, 500);
  }
});

// Update collection point
adminCollectionPoints.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    console.log("[Collection Point Update] ID:", id);
    console.log("[Collection Point Update] Received payload:", JSON.stringify(body, null, 2));
    console.log("[Collection Point Update] marketplace_ids:", body.marketplace_ids);
    console.log("[Collection Point Update] marketplace_after_hours:", body.marketplace_after_hours);

    await c.env.DB.prepare(
      `UPDATE collection_points SET
        name = ?, cep = ?, street = ?, number = ?, neighborhood = ?,
        complement = ?, city = ?, state = ?, photo_url = ?,
        accepts_returns = ?, accepts_orders = ?, is_active = ?,
        accepts_uber_delivery = ?, sells_shipping_supplies = ?,
        provides_resale_merchandise = ?, accepts_after_hours = ?,
        whatsapp_number = ?, owner_email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    )
      .bind(
        body.name,
        body.cep,
        body.street,
        body.number,
        body.neighborhood,
        body.complement,
        body.city,
        body.state,
        body.photo_url,
        body.accepts_returns ? 1 : 0,
        body.accepts_orders ? 1 : 0,
        body.is_active ? 1 : 0,
        body.accepts_uber_delivery ? 1 : 0,
        body.sells_shipping_supplies ? 1 : 0,
        body.provides_resale_merchandise ? 1 : 0,
        body.accepts_after_hours ? 1 : 0,
        body.whatsapp_number,
        body.owner_email,
        id
      )
      .run();

    // Update marketplace relations
    console.log("[Collection Point Update] Deleting existing marketplace relations");
    await c.env.DB.prepare(
      `DELETE FROM collection_point_marketplaces WHERE collection_point_id = ?`
    )
      .bind(id)
      .run();

    if (body.marketplace_ids && body.marketplace_ids.length > 0) {
      console.log("[Collection Point Update] Processing", body.marketplace_ids.length, "marketplaces");
      const afterHoursMap = new Map();
      if (body.marketplace_after_hours) {
        body.marketplace_after_hours.forEach((mah: any) => {
          afterHoursMap.set(mah.marketplace_id, mah.accepts_after_hours);
        });
      }

      for (const marketplaceId of body.marketplace_ids) {
        const acceptsAfterHours = afterHoursMap.get(marketplaceId) || false;
        console.log(`[Collection Point Update] Inserting marketplace ${marketplaceId} with accepts_after_hours=${acceptsAfterHours}`);
        await c.env.DB.prepare(
          `INSERT INTO collection_point_marketplaces (collection_point_id, marketplace_id, accepts_after_hours)
           VALUES (?, ?, ?)`
        )
          .bind(id, marketplaceId, acceptsAfterHours ? 1 : 0)
          .run();
      }
      console.log("[Collection Point Update] Successfully inserted all marketplace relations");
    } else {
      console.log("[Collection Point Update] No marketplaces to insert");
    }

    // Update schedules
    await c.env.DB.prepare(
      `DELETE FROM collection_point_schedules WHERE collection_point_id = ?`
    )
      .bind(id)
      .run();

    if (body.schedules && body.schedules.length > 0) {
      for (const schedule of body.schedules) {
        await c.env.DB.prepare(
          `INSERT INTO collection_point_schedules (
            collection_point_id, day_of_week, opening_time, closing_time, is_closed
          ) VALUES (?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            schedule.day_of_week,
            schedule.opening_time || null,
            schedule.closing_time || null,
            schedule.is_closed ? 1 : 0
          )
          .run();
      }
    }

    // Update marketplace-specific schedules
    await c.env.DB.prepare(
      `DELETE FROM collection_point_marketplace_schedules WHERE collection_point_id = ?`
    )
      .bind(id)
      .run();

    if (body.marketplace_schedules && body.marketplace_schedules.length > 0) {
      for (const ms of body.marketplace_schedules) {
        for (const schedule of ms.schedules) {
          await c.env.DB.prepare(
            `INSERT INTO collection_point_marketplace_schedules (
              collection_point_id, marketplace_id, day_of_week, opening_time, closing_time, is_closed
            ) VALUES (?, ?, ?, ?, ?, ?)`
          )
            .bind(
              id,
              ms.marketplace_id,
              schedule.day_of_week,
              schedule.opening_time || null,
              schedule.closing_time || null,
              schedule.is_closed ? 1 : 0
            )
            .run();
        }
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update collection point:", error);
    return c.json({ error: "Failed to update collection point" }, 500);
  }
});

// Mark zero hours as closed
adminCollectionPoints.post("/mark-zero-hours-closed", async (c) => {
  try {
    // Update schedules where opening_time = '0:00' or '00:00' and closing_time = '0:00' or '00:00'
    const result = await c.env.DB.prepare(
      `UPDATE collection_point_schedules 
       SET is_closed = 1, updated_at = CURRENT_TIMESTAMP
       WHERE is_closed = 0 
       AND (opening_time = '0:00' OR opening_time = '00:00')
       AND (closing_time = '0:00' OR closing_time = '00:00')`
    ).run();

    return c.json({ success: true, updated: result.meta.changes || 0 });
  } catch (error: any) {
    console.error("Failed to mark zero hours as closed:", error);
    return c.json({ error: "Failed to mark zero hours as closed" }, 500);
  }
});

export default adminCollectionPoints;
