import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// Middleware to verify admin access
const verifyAdmin = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Não autorizado" }, 401);
  }

  const token = authHeader.substring(7);
  
  // Extract user ID from local token format (user_123)
  if (!token.startsWith("user_")) {
    return c.json({ error: "Token inválido" }, 401);
  }

  const userId = token.substring(5); // Remove "user_" prefix
  const db = c.env.DB;

  try {
    const user = await db
      .prepare("SELECT id, is_admin FROM users WHERE id = ? AND is_admin = 1")
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: "Não autorizado - apenas administradores" }, 403);
    }

    c.set("userId", user.id);
    await next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return c.json({ error: "Erro ao verificar permissões" }, 500);
  }
};

// GET /api/admin/variation-template - Get variation template
app.get("/variation-template", verifyAdmin, async (c) => {
  const db = c.env.DB;

  try {
    const template = await db
      .prepare("SELECT template_url, file_name FROM system_templates WHERE template_type = ?")
      .bind("variation")
      .first();

    return c.json({
      template_url: template?.template_url || null,
      file_name: template?.file_name || null,
    });
  } catch (error) {
    console.error("Error fetching variation template:", error);
    return c.json({ error: "Erro ao buscar template" }, 500);
  }
});

// POST /api/admin/variation-template - Upload variation template
app.post("/variation-template", verifyAdmin, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "Arquivo não fornecido" }, 400);
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return c.json({ error: "Apenas arquivos XLSX são aceitos" }, 400);
  }

  try {
    const bucket = c.env.R2_BUCKET;
    const fileName = `system-templates/variation-${Date.now()}.xlsx`;
    
    await bucket.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const url = `https://r2.getmocha.com/${fileName}`;
    const db = c.env.DB;

    // Upsert template record
    await db
      .prepare(
        `INSERT INTO system_templates (template_type, template_url, file_name, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(template_type) DO UPDATE SET
         template_url = excluded.template_url,
         file_name = excluded.file_name,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind("variation", url, file.name)
      .run();

    return c.json({ url, file_name: file.name });
  } catch (error) {
    console.error("Error uploading variation template:", error);
    return c.json({ error: "Erro ao fazer upload do template" }, 500);
  }
});

// DELETE /api/admin/variation-template - Delete variation template
app.delete("/variation-template", verifyAdmin, async (c) => {
  const db = c.env.DB;

  try {
    await db
      .prepare("DELETE FROM system_templates WHERE template_type = ?")
      .bind("variation")
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting variation template:", error);
    return c.json({ error: "Erro ao remover template" }, 500);
  }
});

// POST /api/admin/variation-template/import-example - Import example template
app.post("/variation-template/import-example", verifyAdmin, async (c) => {
  // For now, we'll just return a placeholder URL
  // In a real implementation, you would have pre-made example templates stored
  const exampleUrl = "https://example.com/variation-template-example.xlsx";
  const db = c.env.DB;

  try {
    await db
      .prepare(
        `INSERT INTO system_templates (template_type, template_url, file_name, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(template_type) DO UPDATE SET
         template_url = excluded.template_url,
         file_name = excluded.file_name,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind("variation", exampleUrl, "template-variacao-exemplo.xlsx")
      .run();

    return c.json({ url: exampleUrl, file_name: "template-variacao-exemplo.xlsx" });
  } catch (error) {
    console.error("Error importing example template:", error);
    return c.json({ error: "Erro ao importar template de exemplo" }, 500);
  }
});

// GET /api/admin/kit-template - Get kit template
app.get("/kit-template", verifyAdmin, async (c) => {
  const db = c.env.DB;

  try {
    const template = await db
      .prepare("SELECT template_url, file_name FROM system_templates WHERE template_type = ?")
      .bind("kit")
      .first();

    return c.json({
      template_url: template?.template_url || null,
      file_name: template?.file_name || null,
    });
  } catch (error) {
    console.error("Error fetching kit template:", error);
    return c.json({ error: "Erro ao buscar template" }, 500);
  }
});

// POST /api/admin/kit-template - Upload kit template
app.post("/kit-template", verifyAdmin, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "Arquivo não fornecido" }, 400);
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return c.json({ error: "Apenas arquivos XLSX são aceitos" }, 400);
  }

  try {
    const bucket = c.env.R2_BUCKET;
    const fileName = `system-templates/kit-${Date.now()}.xlsx`;
    
    await bucket.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const url = `https://r2.getmocha.com/${fileName}`;
    const db = c.env.DB;

    await db
      .prepare(
        `INSERT INTO system_templates (template_type, template_url, file_name, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(template_type) DO UPDATE SET
         template_url = excluded.template_url,
         file_name = excluded.file_name,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind("kit", url, file.name)
      .run();

    return c.json({ url, file_name: file.name });
  } catch (error) {
    console.error("Error uploading kit template:", error);
    return c.json({ error: "Erro ao fazer upload do template" }, 500);
  }
});

// DELETE /api/admin/kit-template - Delete kit template
app.delete("/kit-template", verifyAdmin, async (c) => {
  const db = c.env.DB;

  try {
    await db
      .prepare("DELETE FROM system_templates WHERE template_type = ?")
      .bind("kit")
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting kit template:", error);
    return c.json({ error: "Erro ao remover template" }, 500);
  }
});

// POST /api/admin/kit-template/import-example - Import example template
app.post("/kit-template/import-example", verifyAdmin, async (c) => {
  const exampleUrl = "https://example.com/kit-template-example.xlsx";
  const db = c.env.DB;

  try {
    await db
      .prepare(
        `INSERT INTO system_templates (template_type, template_url, file_name, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(template_type) DO UPDATE SET
         template_url = excluded.template_url,
         file_name = excluded.file_name,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind("kit", exampleUrl, "template-composicao-exemplo.xlsx")
      .run();

    return c.json({ url: exampleUrl, file_name: "template-composicao-exemplo.xlsx" });
  } catch (error) {
    console.error("Error importing example template:", error);
    return c.json({ error: "Erro ao importar template de exemplo" }, 500);
  }
});

// GET /api/admin/orders-template - Get orders template
app.get("/orders-template", verifyAdmin, async (c) => {
  const db = c.env.DB;

  try {
    const template = await db
      .prepare("SELECT template_url, file_name FROM system_templates WHERE template_type = ?")
      .bind("orders")
      .first();

    return c.json({
      template_url: template?.template_url || null,
      file_name: template?.file_name || null,
    });
  } catch (error) {
    console.error("Error fetching orders template:", error);
    return c.json({ error: "Erro ao buscar template" }, 500);
  }
});

// POST /api/admin/orders-template - Upload orders template
app.post("/orders-template", verifyAdmin, async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "Arquivo não fornecido" }, 400);
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return c.json({ error: "Apenas arquivos XLSX são aceitos" }, 400);
  }

  try {
    const bucket = c.env.R2_BUCKET;
    const fileName = `system-templates/orders-${Date.now()}.xlsx`;
    
    await bucket.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const url = `https://r2.getmocha.com/${fileName}`;
    const db = c.env.DB;

    await db
      .prepare(
        `INSERT INTO system_templates (template_type, template_url, file_name, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(template_type) DO UPDATE SET
         template_url = excluded.template_url,
         file_name = excluded.file_name,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind("orders", url, file.name)
      .run();

    return c.json({ url, file_name: file.name });
  } catch (error) {
    console.error("Error uploading orders template:", error);
    return c.json({ error: "Erro ao fazer upload do template" }, 500);
  }
});

// DELETE /api/admin/orders-template - Delete orders template
app.delete("/orders-template", verifyAdmin, async (c) => {
  const db = c.env.DB;

  try {
    await db
      .prepare("DELETE FROM system_templates WHERE template_type = ?")
      .bind("orders")
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting orders template:", error);
    return c.json({ error: "Erro ao remover template" }, 500);
  }
});

// POST /api/admin/orders-template/import-example - Import example template
app.post("/orders-template/import-example", verifyAdmin, async (c) => {
  const exampleUrl = "https://example.com/orders-template-example.xlsx";
  const db = c.env.DB;

  try {
    await db
      .prepare(
        `INSERT INTO system_templates (template_type, template_url, file_name, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(template_type) DO UPDATE SET
         template_url = excluded.template_url,
         file_name = excluded.file_name,
         updated_at = CURRENT_TIMESTAMP`
      )
      .bind("orders", exampleUrl, "template-pedidos-exemplo.xlsx")
      .run();

    return c.json({ url: exampleUrl, file_name: "template-pedidos-exemplo.xlsx" });
  } catch (error) {
    console.error("Error importing example template:", error);
    return c.json({ error: "Erro ao importar template de exemplo" }, 500);
  }
});

export default app;
