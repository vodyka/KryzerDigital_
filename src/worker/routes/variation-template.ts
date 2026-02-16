import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// GET /api/variation-template - Get user's own template
app.get("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  if (!token.startsWith("user_")) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const userId = token.substring(5);
  const db = c.env.DB;

  try {
    // Check if user has their own template
    const userTemplate = await db
      .prepare("SELECT template_url FROM export_templates WHERE type = ? AND name = ?")
      .bind("variation", `user_${userId}`)
      .first();

    return c.json({
      template_url: userTemplate?.template_url || null,
    });
  } catch (error) {
    console.error("Error fetching user template:", error);
    return c.json({ error: "Failed to fetch template" }, 500);
  }
});

// GET /api/variation-template/system - Get system template (public route)
app.get("/system", async (c) => {
  const db = c.env.DB;

  try {
    const systemTemplate = await db
      .prepare("SELECT template_url FROM system_templates WHERE template_type = ?")
      .bind("variation")
      .first();

    return c.json({
      template_url: systemTemplate?.template_url || null,
    });
  } catch (error) {
    console.error("Error fetching system template:", error);
    return c.json({ error: "Failed to fetch system template" }, 500);
  }
});

// POST /api/variation-template - Upload user's own template
app.post("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  if (!token.startsWith("user_")) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const userId = token.substring(5);
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "File not provided" }, 400);
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return c.json({ error: "Only XLSX files are accepted" }, 400);
  }

  try {
    const bucket = c.env.R2_BUCKET;
    const fileName = `user-templates/variation-user${userId}-${Date.now()}.xlsx`;
    
    await bucket.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const url = `https://r2.getmocha.com/${fileName}`;
    const db = c.env.DB;

    // Upsert user template (update both file_key and template_url)
    await db
      .prepare(
        `INSERT INTO export_templates (name, type, file_key, file_name, template_url)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(name, type) DO UPDATE SET
         file_key = excluded.file_key,
         file_name = excluded.file_name,
         template_url = excluded.template_url`
      )
      .bind(`user_${userId}`, "variation", fileName, file.name, url)
      .run();

    return c.json({ url, file_name: file.name });
  } catch (error) {
    console.error("Error uploading template:", error);
    return c.json({ error: "Failed to upload template" }, 500);
  }
});

// DELETE /api/variation-template - Delete user's own template
app.delete("/", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  if (!token.startsWith("user_")) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const userId = token.substring(5);
  const db = c.env.DB;

  try {
    await db
      .prepare("DELETE FROM export_templates WHERE type = ? AND name = ?")
      .bind("variation", `user_${userId}`)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return c.json({ error: "Failed to delete template" }, 500);
  }
});

export default app;
