import { Hono } from "hono";
import { getCompanyId } from "../middleware/company";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

function isNumeric(str: string) {
  return /^[0-9]+$/.test(str);
}

// Get mappings for a product (accepts SKU OR productId)
app.get("/:skuOrId", async (c) => {
  const skuOrId = c.req.param("skuOrId");
  const companyId = getCompanyId(c);

  console.log("[ML Mapping] Fetching mappings for:", skuOrId, "Company:", companyId);

  try {
    // 1) Resolve what we received (SKU or productId)
    let productSku: string | null = null;
    let productId: number | null = null;

    if (isNumeric(skuOrId)) {
      productId = Number(skuOrId);
      const p = (await c.env.DB.prepare(
        `SELECT id, sku FROM products WHERE id = ? AND company_id = ? LIMIT 1`
      )
        .bind(productId, companyId)
        .first()) as any;

      if (!p) {
        console.log("[ML Mapping] Product not found by id:", productId);
        return c.json({ mappings: [], resolved: { productId, productSku: null } });
      }

      productSku = String(p.sku || "");
      console.log("[ML Mapping] Resolved by id -> sku:", productSku);
    } else {
      productSku = skuOrId;
      const p = (await c.env.DB.prepare(
        `SELECT id, sku FROM products WHERE sku = ? AND company_id = ? LIMIT 1`
      )
        .bind(productSku, companyId)
        .first()) as any;

      if (p?.id) productId = Number(p.id);
      console.log("[ML Mapping] Resolved by sku -> id:", productId);
    }

    if (!productSku && !productId) {
      return c.json({ mappings: [], resolved: { productId: null, productSku: null } });
    }

    // 2) Query mappings (by SKU preferred, fallback by product_id)
    const { results } = await c.env.DB.prepare(
      `SELECT 
        m.*,
        l.title as ml_title,
        l.thumbnail as ml_thumbnail,
        l.store_name as ml_store_name
       FROM product_ml_mappings m
       LEFT JOIN marketplace_listings l 
         ON m.ml_listing_id = l.listing_id
        AND m.company_id = l.company_id
       WHERE m.company_id = ?
         AND (
           ( ? IS NOT NULL AND m.product_sku = ? )
           OR
           ( ? IS NOT NULL AND m.product_id = ? )
         )
       ORDER BY m.created_at DESC`
    )
      .bind(
        companyId,
        productSku, productSku,
        productId, productId
      )
      .all();

    console.log("[ML Mapping] Found mappings:", results?.length || 0);
    return c.json({
      mappings: results || [],
      resolved: { productId, productSku },
    });
  } catch (error) {
    console.error("[ML Mapping] Error fetching ML mappings:", error);
    return c.json({ error: "Erro ao buscar mapeamentos" }, 500);
  }
});

// Create mapping
app.post("/", async (c) => {
  const userId = c.get("userId");
  const companyId = getCompanyId(c);
  const { product_sku, ml_listing_id, ml_variation_id, integration_id } = await c.req.json();

  if (!product_sku || !ml_listing_id || !integration_id) {
    return c.json({ error: "Dados incompletos" }, 400);
  }

  try {
    // Get product_id
    const product = (await c.env.DB.prepare(
      `SELECT id FROM products WHERE sku = ? AND company_id = ?`
    )
      .bind(product_sku, companyId)
      .first()) as any;

    if (!product) {
      return c.json({ error: "Produto não encontrado" }, 404);
    }

    // Check if mapping already exists for this specific product
    const existing = (await c.env.DB.prepare(
      `SELECT id, product_sku FROM product_ml_mappings 
       WHERE ml_listing_id = ? AND company_id = ? 
         AND (ml_variation_id = ? OR (ml_variation_id IS NULL AND ? IS NULL))`
    )
      .bind(ml_listing_id, companyId, ml_variation_id, ml_variation_id)
      .first()) as any;

    if (existing) {
      if (existing.product_sku === product_sku) {
        return c.json({ error: "Este anúncio já está mapeado para este produto" }, 400);
      } else {
        return c.json({ 
          error: `Este anúncio já está mapeado para o produto SKU: ${existing.product_sku}` 
        }, 400);
      }
    }

    // Create mapping
    await c.env.DB.prepare(
      `INSERT INTO product_ml_mappings 
       (product_id, product_sku, ml_listing_id, ml_variation_id, integration_id, company_id, user_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(product.id, product_sku, ml_listing_id, ml_variation_id || null, integration_id, companyId, userId)
      .run();

    // Sync stock to ML immediately
    const inventory = (await c.env.DB.prepare(
      `SELECT stock_quantity FROM inventory_control WHERE product_id = ? AND company_id = ?`
    )
      .bind(product.id, companyId)
      .first()) as any;

    const stockQuantity = inventory?.stock_quantity || 0;

    // Get ML access token
    const integration = (await c.env.DB.prepare(
      `SELECT access_token FROM integrations_marketplace WHERE id = ?`
    )
      .bind(integration_id)
      .first()) as any;

    if (integration?.access_token) {
      const updateUrl = ml_variation_id
        ? `https://api.mercadolibre.com/items/${ml_listing_id}/variations/${ml_variation_id}`
        : `https://api.mercadolibre.com/items/${ml_listing_id}`;

      await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${integration.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ available_quantity: stockQuantity }),
      });
    }

    return c.json({ message: "Mapeamento criado com sucesso" }, 201);
  } catch (error) {
    console.error("Error creating ML mapping:", error);
    return c.json({ error: "Erro ao criar mapeamento" }, 500);
  }
});

// Delete mapping
app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const companyId = getCompanyId(c);

  try {
    await c.env.DB.prepare(
      `DELETE FROM product_ml_mappings WHERE id = ? AND company_id = ?`
    )
      .bind(id, companyId)
      .run();

    return c.json({ message: "Mapeamento removido com sucesso" });
  } catch (error) {
    console.error("Error deleting ML mapping:", error);
    return c.json({ error: "Erro ao remover mapeamento" }, 500);
  }
});

export default app;
