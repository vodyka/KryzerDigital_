import { Hono } from "hono";

const adminUpload = new Hono<{ Bindings: Env }>();

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

// Apply middleware
adminUpload.use("/*", requireAdmin);

// Upload file
adminUpload.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    console.log("[Admin Upload] Starting upload, type:", type);
    console.log("[Admin Upload] File:", file?.name, file?.type, file?.size);

    if (!file) {
      console.error("[Admin Upload] No file provided in formData");
      return c.json({ error: "No file provided" }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop();
    const filename = `${type}_${timestamp}_${randomStr}.${extension}`;

    console.log("[Admin Upload] Generated filename:", filename);

    // Upload to R2
    const buffer = await file.arrayBuffer();
    console.log("[Admin Upload] Buffer size:", buffer.byteLength);
    
    await c.env.R2_BUCKET.put(filename, buffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    console.log("[Admin Upload] File uploaded to R2 successfully");

    // Generate URL - use relative path that will be served by our /api/files endpoint
    const url = `/api/files/${filename}`;
    console.log("[Admin Upload] Generated URL:", url);

    // If this is a marketplace or collection point logo, update the database
    if (type === "marketplace_logo" && formData.get("marketplaceId")) {
      const marketplaceId = formData.get("marketplaceId") as string;
      console.log("[Admin Upload] Updating marketplace logo in DB:", marketplaceId);
      await c.env.DB.prepare(
        `UPDATE marketplaces SET logo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )
        .bind(url, marketplaceId)
        .run();
    }

    if (type === "collection_point" && formData.get("pointId")) {
      const pointId = formData.get("pointId") as string;
      console.log("[Admin Upload] Updating collection point photo in DB:", pointId);
      await c.env.DB.prepare(
        `UPDATE collection_points SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )
        .bind(url, pointId)
        .run();
    }

    console.log("[Admin Upload] Upload completed successfully, returning URL");
    return c.json({ url });
  } catch (error: any) {
    console.error("[Admin Upload] Upload failed:", error);
    console.error("[Admin Upload] Error details:", error.message, error.stack);
    return c.json({ error: `Upload failed: ${error.message}` }, 500);
  }
});

export default adminUpload;
