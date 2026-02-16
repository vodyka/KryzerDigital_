import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Serve product images from R2
app.get("/products/*", async (c) => {
  try {
    const path = c.req.path.replace("/api/products/images/", "");
    
    // Get the file from R2
    const object = await c.env.R2_BUCKET.get(path);

    if (!object) {
      return c.json({ error: "Imagem não encontrada" }, 404);
    }

    // Determine content type based on file extension
    const extension = path.split(".").pop()?.toLowerCase();
    const contentType =
      extension === "png"
        ? "image/png"
        : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "gif"
        ? "image/gif"
        : extension === "webp"
        ? "image/webp"
        : "application/octet-stream";

    // Return the image with proper headers
    return new Response(object.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving product image:", error);
    return c.json({ error: "Erro ao carregar imagem" }, 500);
  }
});

export default app;
