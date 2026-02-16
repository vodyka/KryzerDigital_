import { Hono } from "hono";

type Env = {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  ML_CLIENT_ID?: string;
  ML_CLIENT_SECRET?: string;
  ML_REDIRECT_URI?: string;
};

type AppContext = {
  Bindings: Env;
  Variables: {
    userId: string;
    companyId: number;
  };
};

const inventory = new Hono<AppContext>();

// Get all inventory items for a company
inventory.get("/", async (c) => {
  const userId = c.get("userId");
  const companyId = c.get("companyId");

  if (!userId || !companyId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = c.env.DB;
    const result = await db
      .prepare(
        `SELECT * FROM inventory_control 
         WHERE company_id = ? 
         ORDER BY product_name ASC`
      )
      .bind(companyId)
      .all();

    return c.json({ inventory: result.results || [] });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return c.json({ error: "Failed to fetch inventory" }, 500);
  }
});

// Sync all products to inventory
inventory.post("/sync", async (c) => {
  const userId = c.get("userId");
  const companyId = c.get("companyId");

  if (!userId || !companyId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = c.env.DB;
    
    // Get all products that don't have inventory entries
    const { results: productsToSync } = await db
      .prepare(
        `SELECT p.product_id, p.sku, p.name, p.cost_price, p.stock
         FROM products p
         LEFT JOIN inventory_control i ON p.product_id = i.product_id AND p.sku = i.sku
         WHERE p.company_id = ? 
         AND p.is_deleted = 0
         AND i.id IS NULL`
      )
      .bind(companyId)
      .all();

    if (!productsToSync || productsToSync.length === 0) {
      return c.json({ message: "Todos os produtos já estão sincronizados", synced: 0 });
    }

    // Insert all missing inventory entries
    for (const product of productsToSync as any[]) {
      await db
        .prepare(
          `INSERT INTO inventory_control 
           (product_id, sku, product_name, cost_price, stock_quantity, user_id, company_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          product.product_id,
          product.sku,
          product.name,
          product.cost_price || 0,
          product.stock || 0,
          userId,
          companyId
        )
        .run();
    }

    return c.json({ 
      message: `${productsToSync.length} produtos sincronizados com sucesso`,
      synced: productsToSync.length
    });
  } catch (error) {
    console.error("Error syncing inventory:", error);
    return c.json({ error: "Failed to sync inventory" }, 500);
  }
});

// Get inventory for a specific product
inventory.get("/product/:productId", async (c) => {
  const userId = c.get("userId");
  const companyId = c.get("companyId");
  const productId = c.req.param("productId");

  if (!userId || !companyId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = c.env.DB;
    const result = await db
      .prepare(
        `SELECT * FROM inventory_control 
         WHERE product_id = ? AND company_id = ?`
      )
      .bind(productId, companyId)
      .first();

    return c.json({ inventory: result || null });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return c.json({ error: "Failed to fetch inventory" }, 500);
  }
});

// Create inventory entry (auto-created when product is created)
inventory.post("/", async (c) => {
  const userId = c.get("userId");
  const companyId = c.get("companyId");

  if (!userId || !companyId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const { product_id, sku, product_name, cost_price, stock_quantity } = body;

    const db = c.env.DB;

    // Check if inventory entry already exists
    const existing = await db
      .prepare(
        `SELECT id FROM inventory_control 
         WHERE product_id = ? AND company_id = ?`
      )
      .bind(product_id, companyId)
      .first();

    if (existing) {
      return c.json({ error: "Inventory entry already exists" }, 400);
    }

    await db
      .prepare(
        `INSERT INTO inventory_control 
         (product_id, sku, product_name, cost_price, stock_quantity, user_id, company_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        product_id,
        sku,
        product_name,
        cost_price || 0,
        stock_quantity || 0,
        userId,
        companyId
      )
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error creating inventory entry:", error);
    return c.json({ error: "Failed to create inventory entry" }, 500);
  }
});

// Update inventory (cost price and stock)
inventory.put("/:id", async (c) => {
  const userId = c.get("userId");
  const companyId = c.get("companyId");
  const id = c.req.param("id");

  if (!userId || !companyId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const { cost_price, stock_quantity } = body;

    const db = c.env.DB;

    // Update inventory control
    await db
      .prepare(
        `UPDATE inventory_control 
         SET cost_price = ?, stock_quantity = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND company_id = ?`
      )
      .bind(cost_price, stock_quantity, id, companyId)
      .run();

    // Also update the products table for backward compatibility
    const inventory = await db
      .prepare(`SELECT product_id FROM inventory_control WHERE id = ? AND company_id = ?`)
      .bind(id, companyId)
      .first() as any;

    if (inventory) {
      await db
        .prepare(
          `UPDATE products 
           SET cost_price = ?, stock = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE product_id = ? AND company_id = ?`
        )
        .bind(cost_price, stock_quantity, inventory.product_id, companyId)
        .run();

      // Sync stock to all mapped ML listings
      const { results: mappings } = await db
        .prepare(
          `SELECT m.ml_listing_id, m.ml_variation_id, m.integration_id
           FROM product_ml_mappings m
           WHERE m.product_id = ? AND m.company_id = ?`
        )
        .bind(inventory.product_id, companyId)
        .all();

      if (mappings && mappings.length > 0) {
        console.log(`[Inventory Update] Syncing stock to ${mappings.length} ML listings`);

        for (const mapping of mappings as any[]) {
          try {
            // Get ML access token for this integration
            const integration = await db
              .prepare(`SELECT access_token FROM integrations_marketplace WHERE id = ?`)
              .bind(mapping.integration_id)
              .first() as any;

            if (integration?.access_token) {
              const updateUrl = mapping.ml_variation_id
                ? `https://api.mercadolibre.com/items/${mapping.ml_listing_id}/variations/${mapping.ml_variation_id}`
                : `https://api.mercadolibre.com/items/${mapping.ml_listing_id}`;

              const response = await fetch(updateUrl, {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${integration.access_token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ available_quantity: stock_quantity }),
              });

              if (response.ok) {
                console.log(`[Inventory Update] Stock synced to ML listing ${mapping.ml_listing_id}`);
              } else {
                console.error(`[Inventory Update] Failed to sync to ML listing ${mapping.ml_listing_id}:`, await response.text());
              }
            }
          } catch (mlError) {
            console.error(`[Inventory Update] Error syncing to ML listing ${mapping.ml_listing_id}:`, mlError);
          }
        }
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating inventory:", error);
    return c.json({ error: "Failed to update inventory" }, 500);
  }
});

// Check if product can be deleted (stock must be 0)
inventory.get("/check-delete/:productId", async (c) => {
  const userId = c.get("userId");
  const companyId = c.get("companyId");
  const productId = c.req.param("productId");

  if (!userId || !companyId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = c.env.DB;
    const result = await db
      .prepare(
        `SELECT stock_quantity FROM inventory_control 
         WHERE product_id = ? AND company_id = ?`
      )
      .bind(productId, companyId)
      .first();

    const canDelete = !result || result.stock_quantity === 0;

    return c.json({ 
      canDelete, 
      currentStock: result?.stock_quantity || 0 
    });
  } catch (error) {
    console.error("Error checking delete permission:", error);
    return c.json({ error: "Failed to check delete permission" }, 500);
  }
});

export default inventory;
