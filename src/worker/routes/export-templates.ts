import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Upload template (user's personal template)
app.post("/", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  const type = formData.get("type") as string;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!type) {
    return c.json({ error: "No type provided" }, 400);
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.substring(7);
  if (!token.startsWith("user_")) {
    return c.json({ error: "Invalid token" }, 401);
  }

  const userId = token.substring(5);

  // Generate unique key for the file
  const timestamp = Date.now();
  const fileKey = `user-templates/${type}-user${userId}-${timestamp}.xlsx`;

  // Upload to R2
  await c.env.R2_BUCKET.put(fileKey, file, {
    httpMetadata: {
      contentType: file.type,
    },
  });

  const url = `https://r2.getmocha.com/${fileKey}`;

  // Save to database
  const db = c.env.DB;
  
  // Delete existing template of this type for this user
  const existing = await db
    .prepare("SELECT file_key FROM export_templates WHERE type = ? AND name = ?")
    .bind(type, `user_${userId}`)
    .first<{ file_key: string }>();

  if (existing) {
    // Delete old file from R2
    await c.env.R2_BUCKET.delete(existing.file_key);
    // Delete from database
    await db.prepare("DELETE FROM export_templates WHERE type = ? AND name = ?").bind(type, `user_${userId}`).run();
  }

  // Insert new template
  await db
    .prepare(
      "INSERT INTO export_templates (name, type, file_key, file_name, template_url) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(`user_${userId}`, type, fileKey, file.name, url)
    .run();

  return c.json({ success: true, url });
});

// Get template info (user's personal template)
app.get("/:type", async (c) => {
  const type = c.req.param("type");
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ template: null });
  }

  const token = authHeader.substring(7);
  if (!token.startsWith("user_")) {
    return c.json({ template: null });
  }

  const userId = token.substring(5);
  const db = c.env.DB;

  const template = await db
    .prepare("SELECT * FROM export_templates WHERE type = ? AND name = ? LIMIT 1")
    .bind(type, `user_${userId}`)
    .first();

  if (!template) {
    return c.json({ template: null });
  }

  return c.json({ template });
});

// Get system template (public route)
app.get("/:type/system", async (c) => {
  const type = c.req.param("type");
  const db = c.env.DB;

  // Map export template types to system template types
  const typeMap: { [key: string]: string } = {
    order_receipt: "orders"
  };

  const systemType = typeMap[type] || type;

  const systemTemplate = await db
    .prepare("SELECT template_url FROM system_templates WHERE template_type = ?")
    .bind(systemType)
    .first();

  return c.json({
    template_url: systemTemplate?.template_url || null,
  });
});

// Download template file
app.get("/:type/download", async (c) => {
  const type = c.req.param("type");
  const db = c.env.DB;

  const template = await db
    .prepare("SELECT file_key, file_name FROM export_templates WHERE type = ? LIMIT 1")
    .bind(type)
    .first<{ file_key: string; file_name: string }>();

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  const object = await c.env.R2_BUCKET.get(template.file_key);
  if (!object) {
    return c.json({ error: "File not found in storage" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return c.body(object.body, { headers });
});

// Delete template (user's personal template)
app.delete("/:type", async (c) => {
  const type = c.req.param("type");
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

  const template = await db
    .prepare("SELECT file_key FROM export_templates WHERE type = ? AND name = ? LIMIT 1")
    .bind(type, `user_${userId}`)
    .first<{ file_key: string }>();

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  // Delete from R2
  await c.env.R2_BUCKET.delete(template.file_key);

  // Delete from database
  await db.prepare("DELETE FROM export_templates WHERE type = ? AND name = ?").bind(type, `user_${userId}`).run();

  return c.json({ success: true });
});

export default app;
