import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

// GET /api/variation-config - Get user's colors and sizes
app.get("/", async (c) => {
  const companyId = getCompanyId(c);
  const db = c.env.DB;

  try {
    const colors = await db
      .prepare("SELECT * FROM variation_colors WHERE company_id = ? ORDER BY sort_order ASC")
      .bind(companyId)
      .all();

    const sizes = await db
      .prepare("SELECT * FROM variation_sizes WHERE company_id = ? ORDER BY sort_order ASC")
      .bind(companyId)
      .all();

    const eanConfig = await db
      .prepare("SELECT prefix_ean, cnpj_5 FROM ean_config WHERE company_id = ?")
      .bind(companyId)
      .first();

    return c.json({
      colors: colors.results || [],
      sizes: sizes.results || [],
      ean_config: eanConfig || { prefix_ean: "789", cnpj_5: "" },
    });
  } catch (error) {
    console.error("Error fetching variation config:", error);
    return c.json({ error: "Failed to fetch configuration" }, 500);
  }
});

// PUT /api/variation-config - Update user's colors and sizes
app.put("/", async (c) => {
  const companyId = getCompanyId(c);
  const { colors, sizes, ean_config } = await c.req.json();
  const db = c.env.DB;

  try {
    // Validate for duplicate names and codes in colors
    const colorNames = new Set();
    const colorCodes = new Set();
    
    for (const color of colors || []) {
      if (!color.name || !color.code) {
        return c.json({ error: "Cor deve ter nome e sigla preenchidos" }, 400);
      }
      
      const nameLower = color.name.toLowerCase().trim();
      const codeUpper = color.code.toUpperCase().trim();
      
      if (colorNames.has(nameLower)) {
        return c.json({ error: `Nome de cor duplicado: "${color.name}"` }, 400);
      }
      if (colorCodes.has(codeUpper)) {
        return c.json({ error: `Sigla de cor duplicada: "${color.code}"` }, 400);
      }
      
      colorNames.add(nameLower);
      colorCodes.add(codeUpper);
    }
    
    // Validate for duplicate names and codes in sizes
    const sizeNames = new Set();
    const sizeCodes = new Set();
    
    for (const size of sizes || []) {
      if (!size.name || !size.code) {
        return c.json({ error: "Tamanho deve ter nome e sigla preenchidos" }, 400);
      }
      
      const nameLower = size.name.toLowerCase().trim();
      const codeUpper = size.code.toUpperCase().trim();
      
      if (sizeNames.has(nameLower)) {
        return c.json({ error: `Nome de tamanho duplicado: "${size.name}"` }, 400);
      }
      if (sizeCodes.has(codeUpper)) {
        return c.json({ error: `Sigla de tamanho duplicada: "${size.code}"` }, 400);
      }
      
      sizeNames.add(nameLower);
      sizeCodes.add(codeUpper);
    }

    // Delete existing colors and sizes for this company
    await db.prepare("DELETE FROM variation_colors WHERE company_id = ?").bind(companyId).run();
    await db.prepare("DELETE FROM variation_sizes WHERE company_id = ?").bind(companyId).run();

    // Insert new colors
    const savedColors = [];
    for (const color of colors || []) {
      const result = await db
        .prepare(
          `INSERT INTO variation_colors (company_id, name, code, sort_order, image_url)
           VALUES (?, ?, ?, ?, ?)
           RETURNING *`
        )
        .bind(
          companyId,
          color.name.trim(),
          color.code.toUpperCase().trim(),
          color.sort_order || 0,
          color.image_url || null
        )
        .first();

      if (result) savedColors.push(result);
    }

    // Insert new sizes
    const savedSizes = [];
    for (const size of sizes || []) {
      const result = await db
        .prepare(
          `INSERT INTO variation_sizes (company_id, name, code, sort_order)
           VALUES (?, ?, ?, ?)
           RETURNING *`
        )
        .bind(
          companyId,
          size.name.trim(),
          size.code.toUpperCase().trim(),
          size.sort_order || 0
        )
        .first();

      if (result) savedSizes.push(result);
    }

    // Save or update EAN config
    let savedEanConfig = null;
    if (ean_config) {
      const existingConfig = await db
        .prepare("SELECT id FROM ean_config WHERE company_id = ?")
        .bind(companyId)
        .first();

      if (existingConfig) {
        // Update existing
        savedEanConfig = await db
          .prepare(
            `UPDATE ean_config 
             SET prefix_ean = ?, cnpj_5 = ?, updated_at = CURRENT_TIMESTAMP
             WHERE company_id = ?
             RETURNING prefix_ean, cnpj_5`
          )
          .bind(
            ean_config.prefix_ean || "789",
            ean_config.cnpj_5 || "",
            companyId
          )
          .first();
      } else {
        // Insert new
        savedEanConfig = await db
          .prepare(
            `INSERT INTO ean_config (company_id, prefix_ean, cnpj_5)
             VALUES (?, ?, ?)
             RETURNING prefix_ean, cnpj_5`
          )
          .bind(
            companyId,
            ean_config.prefix_ean || "789",
            ean_config.cnpj_5 || ""
          )
          .first();
      }
    }

    return c.json({
      colors: savedColors,
      sizes: savedSizes,
      ean_config: savedEanConfig || { prefix_ean: "789", cnpj_5: "" },
    });
  } catch (error) {
    console.error("Error saving variation config:", error);
    return c.json({ error: "Erro ao salvar configuração" }, 500);
  }
});

export default app;
