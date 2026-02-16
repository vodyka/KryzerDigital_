import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";

const files = new Hono<{ Bindings: Env }>();

// Upload file to R2 bucket (protected route)
files.post("/upload", authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop();
    const filename = `uploads/${timestamp}-${randomString}.${extension}`;

    console.log("[Files] Uploading file to R2:", filename);
    console.log("[Files] File size:", file.size);
    console.log("[Files] File type:", file.type);

    // Upload to R2
    await c.env.R2_BUCKET.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    console.log("[Files] Upload successful:", filename);

    // Return the URL to access the file
    const url = `/api/files/${filename}`;

    return c.json({ url });
  } catch (error: any) {
    console.error("[Files] Error uploading file:", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

// Serve files from R2 bucket (PUBLIC route - no auth required for image loading)
files.get("/*", async (c) => {
  try {
    // Get the full path after /api/files/
    const path = c.req.path.replace(/^\/api\/files\//, "");
    
    console.log("[Files] Fetching file from R2:", path);
    
    const object = await c.env.R2_BUCKET.get(path);
    
    if (!object) {
      console.log("[Files] File not found:", path);
      return c.notFound();
    }

    console.log("[Files] File found, serving:", path);
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000");
    
    return c.body(object.body, { headers });
  } catch (error: any) {
    console.error("[Files] Error serving file:", error);
    return c.json({ error: "Failed to serve file" }, 500);
  }
});

export default files;
