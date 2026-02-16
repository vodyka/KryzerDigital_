import { Hono } from "hono";
import { getCompanyId } from "../middleware/company";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Helper function to calculate kit stock
async function calculateKitStock(db: D1Database, kitSku: string): Promise<number> {
  const { results: items } = await db.prepare(
    `SELECT k.component_sku, k.quantity, p.stock
     FROM product_kit_items k
     LEFT JOIN products p ON k.component_sku = p.sku AND p.is_deleted = 0
     WHERE k.kit_sku = ?`
  )
    .bind(kitSku)
    .all();

  if (!items || items.length === 0) return 0;

  // Calculate how many complete kits can be made
  let minKits = Infinity;
  for (const item of items as any[]) {
    const availableKits = Math.floor((item.stock || 0) / (item.quantity || 1));
    minKits = Math.min(minKits, availableKits);
  }

  return minKits === Infinity ? 0 : minKits;
}

// Helper function to calculate kit cost price
async function calculateKitCostPrice(db: D1Database, kitSku: string): Promise<number> {
  const { results: items } = await db.prepare(
    `SELECT k.component_sku, k.quantity, p.cost_price
     FROM product_kit_items k
     LEFT JOIN products p ON k.component_sku = p.sku AND p.is_deleted = 0
     WHERE k.kit_sku = ?`
  )
    .bind(kitSku)
    .all();

  if (!items || items.length === 0) return 0;

  // Sum: (cost_price × quantity) for each component
  let totalCost = 0;
  for (const item of items as any[]) {
    const cost = (item.cost_price || 0) * (item.quantity || 1);
    totalCost += cost;
  }

  return totalCost;
}

// Helper function to calculate dynamic stock
async function calculateDynamicStock(db: D1Database, dynamicSku: string): Promise<number> {
  const { results: items } = await db.prepare(
    `SELECT d.component_sku, d.quantity, p.stock
     FROM product_dynamic_items d
     LEFT JOIN products p ON d.component_sku = p.sku AND p.is_deleted = 0
     WHERE d.dynamic_sku = ?`
  )
    .bind(dynamicSku)
    .all();

  if (!items || items.length === 0) return 0;

  // Sum all available stock
  let totalStock = 0;
  for (const item of items as any[]) {
    totalStock += (item.stock || 0);
  }

  return totalStock;
}

// Helper function to calculate dynamic cost price (weighted average)
async function calculateDynamicCostPrice(db: D1Database, dynamicSku: string): Promise<number> {
  const { results: items } = await db.prepare(
    `SELECT d.component_sku, d.quantity, p.cost_price, p.stock
     FROM product_dynamic_items d
     LEFT JOIN products p ON d.component_sku = p.sku AND p.is_deleted = 0
     WHERE d.dynamic_sku = ?`
  )
    .bind(dynamicSku)
    .all();

  if (!items || items.length === 0) return 0;

  // Calculate weighted average: sum(cost_price × stock) / sum(stock)
  let totalValue = 0;
  let totalStock = 0;
  
  for (const item of items as any[]) {
    const stock = item.stock || 0;
    const cost = item.cost_price || 0;
    totalValue += cost * stock;
    totalStock += stock;
  }

  return totalStock > 0 ? totalValue / totalStock : 0;
}

// Get all products
app.get("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    
    // Debug logging to help diagnose production issues
    console.log(JSON.stringify({
      type: 'products_list',
      companyId,
      userId: c.get('userId'),
    }));
    
    const { results } = await c.env.DB.prepare(
      `SELECT 
         p.*,
         i.cost_price as inventory_cost_price,
         i.stock_quantity as inventory_stock
       FROM products p
       LEFT JOIN inventory_control i ON p.id = i.product_id AND i.company_id = p.company_id
       WHERE p.company_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       ORDER BY p.created_at DESC`
    )
      .bind(companyId)
      .all();
    
    console.log(JSON.stringify({
      type: 'products_list_result',
      companyId,
      productCount: results?.length || 0,
    }));

    // Calculate stock and cost price for kit and dynamic products
    const productsWithStock = await Promise.all(
      (results as any[]).map(async (product) => {
        // Use inventory values if available, otherwise fall back to product table
        const inventoryCostPrice = product.inventory_cost_price ?? product.cost_price;
        const inventoryStock = product.inventory_stock ?? product.stock;
        
        if (product.product_type === "kit") {
          product.calculated_stock = await calculateKitStock(c.env.DB, product.sku);
          product.calculated_cost_price = await calculateKitCostPrice(c.env.DB, product.sku);
        } else if (product.product_type === "dynamic") {
          product.calculated_stock = await calculateDynamicStock(c.env.DB, product.sku);
          product.calculated_cost_price = await calculateDynamicCostPrice(c.env.DB, product.sku);
        } else {
          product.calculated_stock = inventoryStock || 0;
          product.calculated_cost_price = inventoryCostPrice || 0;
        }
        
        // Update product with inventory values for display
        product.cost_price = inventoryCostPrice;
        product.stock = inventoryStock;
        
        return product;
      })
    );

    return c.json({ products: productsWithStock });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: "Erro ao buscar produtos" }, 500);
  }
});

// Get product by ID
app.get("/by-id/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const companyId = getCompanyId(c);
    const product = await c.env.DB.prepare(
      `SELECT * FROM products 
       WHERE product_id = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
    )
      .bind(id, companyId)
      .first();

    if (!product) {
      return c.json({ error: "Produto não encontrado" }, 404);
    }

    // Get additional data based on product type
    let additionalData: any = {};

    if (product.product_type === "variation") {
      const { results: variants } = await c.env.DB.prepare(
        `SELECT * FROM product_variants WHERE spu = ? ORDER BY variant_type, variant_value`
      )
        .bind(product.spu)
        .all();
      additionalData.variants = variants;
    } else if (product.product_type === "kit") {
      const { results: items } = await c.env.DB.prepare(
        `SELECT k.*, p.name, p.cost_price, p.stock
         FROM product_kit_items k
         LEFT JOIN products p ON k.component_sku = p.sku
         WHERE k.kit_sku = ?`
      )
        .bind(product.sku)
        .all();
      additionalData.kit_items = items;
    } else if (product.product_type === "dynamic") {
      const { results: items } = await c.env.DB.prepare(
        `SELECT d.*, p.name, p.cost_price, p.stock
         FROM product_dynamic_items d
         LEFT JOIN products p ON d.component_sku = p.sku
         WHERE d.dynamic_sku = ?`
      )
        .bind(product.sku)
        .all();
      additionalData.dynamic_items = items;
    }

    // Get media
    const { results: media } = await c.env.DB.prepare(
      `SELECT * FROM product_media WHERE product_sku = ? ORDER BY display_order`
    )
      .bind(product.sku)
      .all();
    additionalData.media = media;

    return c.json({ product: { ...product, ...additionalData } });
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return c.json({ error: "Erro ao buscar produto" }, 500);
  }
});

// Get product by SKU (kept for backward compatibility)
app.get("/:sku", async (c) => {
  const sku = c.req.param("sku");

  try {
    const companyId = getCompanyId(c);
    const product = await c.env.DB.prepare(
      `SELECT * FROM products 
       WHERE sku = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
    )
      .bind(sku, companyId)
      .first();

    if (!product) {
      return c.json({ error: "Produto não encontrado" }, 404);
    }

    // Get additional data based on product type
    let additionalData: any = {};

    if (product.product_type === "variation") {
      const { results: variants } = await c.env.DB.prepare(
        `SELECT * FROM product_variants WHERE spu = ? ORDER BY variant_type, variant_value`
      )
        .bind(product.spu)
        .all();
      additionalData.variants = variants;
    } else if (product.product_type === "kit") {
      const { results: items } = await c.env.DB.prepare(
        `SELECT k.*, p.name, p.cost_price, p.stock
         FROM product_kit_items k
         LEFT JOIN products p ON k.component_sku = p.sku
         WHERE k.kit_sku = ?`
      )
        .bind(sku)
        .all();
      additionalData.items = items;
      additionalData.calculated_stock = await calculateKitStock(c.env.DB, sku);
      additionalData.calculated_cost_price = await calculateKitCostPrice(c.env.DB, sku);
    } else if (product.product_type === "dynamic") {
      const { results: items } = await c.env.DB.prepare(
        `SELECT d.*, p.name, p.cost_price, p.stock 
         FROM product_dynamic_items d
         LEFT JOIN products p ON d.component_sku = p.sku
         WHERE d.dynamic_sku = ?`
      )
        .bind(sku)
        .all();
      additionalData.items = items;
      additionalData.calculated_stock = await calculateDynamicStock(c.env.DB, sku);
      additionalData.calculated_cost_price = await calculateDynamicCostPrice(c.env.DB, sku);
    }

    // Get media
    const { results: media } = await c.env.DB.prepare(
      `SELECT * FROM product_media WHERE product_sku = ? ORDER BY display_order`
    )
      .bind(sku)
      .all();
    additionalData.media = media;

    return c.json({ product, ...additionalData });
  } catch (error) {
    console.error("Error fetching product:", error);
    return c.json({ error: "Erro ao buscar produto" }, 500);
  }
});

// Create product
app.post("/", async (c) => {
  const data = await c.req.json();

  try {
    const companyId = getCompanyId(c);
    const {
      product_type,
      sku,
      spu,
      name,
      alias_name,
      use_alias_in_nfe,
      category,
      barcode,
      mpn,
      is_active,
      sale_price,
      cost_price,
      description,
      brand,
      weight,
      length_cm,
      width_cm,
      height_cm,
      ncm,
      cest,
      unit,
      origin,
      stock,
      variants,
      kit_items,
      dynamic_items,
      media,
    } = data;

    // Validate required fields
    if (!product_type) {
      return c.json({ error: "Tipo de produto é obrigatório" }, 400);
    }

    if (product_type === "simple" || product_type === "kit" || product_type === "dynamic") {
      if (!sku) {
        return c.json({ error: "SKU é obrigatório" }, 400);
      }
    }

    if (product_type === "variation" || product_type === "kit" || product_type === "dynamic") {
      if (!spu) {
        return c.json({ error: "SPU é obrigatório para este tipo de produto" }, 400);
      }
    }

    if (!name) {
      return c.json({ error: "Nome é obrigatório" }, 400);
    }

    // Check if SKU/SPU already exists (including deleted products)
    const checkSku = (product_type === "variation" || product_type === "kit" || product_type === "dynamic") ? spu : sku;
    
    if (checkSku) {
      const existing = await c.env.DB.prepare(
        `SELECT sku FROM products WHERE sku = ?`
      )
        .bind(checkSku)
        .first();

      if (existing) {
        // For variation products, check if it's the parent or if variants exist
        if (product_type === "variation") {
          const { results: existingVariants } = await c.env.DB.prepare(
            `SELECT sku FROM products WHERE spu = ? AND product_type = 'simple'`
          )
            .bind(spu)
            .all();
          
          if (existingVariants && existingVariants.length > 0) {
            return c.json({ 
              error: `Este SPU já possui ${existingVariants.length} variantes cadastradas. Use um SPU diferente ou edite o produto existente.` 
            }, 400);
          }
        }
        return c.json({ error: `O ${product_type === "variation" ? "SPU" : "SKU"} "${checkSku}" já existe no sistema` }, 400);
      }
    }

    // Get next product_id
    const sequenceRow = await c.env.DB.prepare(
      `SELECT next_id FROM product_id_sequence WHERE id = 1`
    ).first() as any;

    const productId = sequenceRow?.next_id || 510320100;

    // Update sequence
    await c.env.DB.prepare(
      `UPDATE product_id_sequence SET next_id = ? WHERE id = 1`
    )
      .bind(productId + 1)
      .run();

    // Insert product
    const finalSku = sku || spu;
    await c.env.DB.prepare(
      `INSERT INTO products (
        company_id, product_id, product_type, sku, spu, name, alias_name, use_alias_in_nfe,
        category, barcode, mpn, is_active, sale_price, cost_price,
        description, brand, weight, length_cm, width_cm, height_cm,
        ncm, cest, unit, origin, stock, status, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        companyId,
        productId,
        product_type,
        finalSku,
        spu || null,
        name,
        alias_name || null,
        use_alias_in_nfe ? 1 : 0,
        category || null,
        barcode || null,
        mpn || null,
        is_active ? 1 : 0,
        sale_price || 0,
        cost_price || 0,
        description || null,
        brand || null,
        weight || null,
        length_cm || null,
        width_cm || null,
        height_cm || null,
        ncm || null,
        cest || null,
        unit || "UN",
        origin || "0",
        stock || 0,
        is_active ? "Ativo" : "Inativo",
        0
      )
      .run();

    // Handle variants for variation type
    if (product_type === "variation" && variants && Array.isArray(variants)) {
      for (const variant of variants) {
        // Use the SKU that comes from the frontend (already generated with proper separators)
        const variantSku = variant.sku;
        
        if (!variantSku) {
          console.error("Variant SKU is missing:", variant);
          return c.json({ error: "SKU da variante está faltando. Por favor, gere as variantes novamente." }, 400);
        }
        
        // Check if this variant SKU already exists
        const existingVariant = await c.env.DB.prepare(
          `SELECT sku FROM products WHERE sku = ?`
        )
          .bind(variantSku)
          .first();

        if (existingVariant) {
          return c.json({ error: `O SKU "${variantSku}" já existe. Verifique se este produto já foi criado anteriormente.` }, 400);
        }

        // Get next product_id for variant
        const variantSequenceRow = await c.env.DB.prepare(
          `SELECT next_id FROM product_id_sequence WHERE id = 1`
        ).first() as any;

        const variantProductId = variantSequenceRow?.next_id || 510320100;

        // Update sequence
        await c.env.DB.prepare(
          `UPDATE product_id_sequence SET next_id = ? WHERE id = 1`
        )
          .bind(variantProductId + 1)
          .run();

        // Build variant name: BaseName + ColorName + SizeName
        const nameParts = [name];
        if (variant.color?.name) {
          nameParts.push(variant.color.name);
        }
        if (variant.size?.name) {
          nameParts.push(variant.size.name);
        }
        const variantName = nameParts.join(" ");

        // Insert variant as a product
        await c.env.DB.prepare(
          `INSERT INTO products (
            company_id, product_id, product_type, sku, spu, name, barcode, is_active,
            ncm, cest, unit, origin, stock, status, cost_price, sale_price, is_deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            companyId,
            variantProductId,
            "simple",
            variantSku,
            spu,
            variantName,
            variant.barcode || null,
            is_active ? 1 : 0,
            variant.ncm || ncm || null,
            variant.cest || cest || null,
            variant.unit || unit || "UN",
            variant.origin || origin || "0",
            0,
            is_active ? "Ativo" : "Inativo",
            variant.cost_price || cost_price || 0,
            variant.sale_price || sale_price || 0,
            0
          )
          .run();

        // Create inventory control entry for variant
        const userId = c.get("userId");
        await c.env.DB.prepare(
          `INSERT INTO inventory_control 
           (product_id, sku, product_name, cost_price, stock_quantity, user_id, company_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            variantProductId,
            variantSku,
            variantName,
            variant.cost_price || cost_price || 0,
            0,
            userId,
            companyId
          )
          .run();

        // Insert variant mappings
        if (variant.color) {
          await c.env.DB.prepare(
            `INSERT INTO product_variants (spu, sku, variant_type, variant_value) VALUES (?, ?, ?, ?)`
          )
            .bind(spu, variantSku, "color", variant.color.name)
            .run();
        }

        if (variant.size) {
          await c.env.DB.prepare(
            `INSERT INTO product_variants (spu, sku, variant_type, variant_value) VALUES (?, ?, ?, ?)`
          )
            .bind(spu, variantSku, "size", variant.size.name)
            .run();
        }

        if (variant.custom) {
          for (const custom of variant.custom) {
            await c.env.DB.prepare(
              `INSERT INTO product_variants (spu, sku, variant_type, variant_value) VALUES (?, ?, ?, ?)`
            )
              .bind(spu, variantSku, custom.type, custom.value)
              .run();
          }
        }
      }
    }

    // Handle kit items
    if (product_type === "kit" && kit_items && Array.isArray(kit_items)) {
      for (const item of kit_items) {
        await c.env.DB.prepare(
          `INSERT INTO product_kit_items (kit_sku, component_sku, quantity) VALUES (?, ?, ?)`
        )
          .bind(finalSku, item.sku, item.quantity || 1)
          .run();
      }
    }

    // Handle dynamic items
    if (product_type === "dynamic" && dynamic_items && Array.isArray(dynamic_items)) {
      for (const item of dynamic_items) {
        await c.env.DB.prepare(
          `INSERT INTO product_dynamic_items (dynamic_sku, component_sku, quantity) VALUES (?, ?, ?)`
        )
          .bind(finalSku, item.sku, item.quantity || 1)
          .run();
      }
    }

    // Handle media
    if (media && Array.isArray(media)) {
      for (let i = 0; i < media.length; i++) {
        await c.env.DB.prepare(
          `INSERT INTO product_media (product_sku, media_url, media_type, display_order) VALUES (?, ?, ?, ?)`
        )
          .bind(finalSku, media[i].url, media[i].type || "image", i)
          .run();
      }
    }

    // Create inventory control entry
    const userId = c.get("userId");
    await c.env.DB.prepare(
      `INSERT INTO inventory_control 
       (product_id, sku, product_name, cost_price, stock_quantity, user_id, company_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        productId,
        finalSku,
        name,
        cost_price || 0,
        stock || 0,
        userId,
        companyId
      )
      .run();

    return c.json({ 
      message: "Produto criado com sucesso", 
      sku: finalSku,
      product_id: productId
    }, 201);
  } catch (error) {
    console.error("Error creating product:", error);
    return c.json({ error: "Erro ao criar produto" }, 500);
  }
});

// Update product
app.put("/:sku", async (c) => {
  const sku = c.req.param("sku");
  const data = await c.req.json();

  try {
    const companyId = getCompanyId(c);
    // Check if product exists and belongs to company
    const existing = await c.env.DB.prepare(
      `SELECT * FROM products 
       WHERE sku = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
    )
      .bind(sku, companyId)
      .first() as any;

    if (!existing) {
      return c.json({ error: "Produto não encontrado" }, 404);
    }

    const {
      name,
      alias_name,
      use_alias_in_nfe,
      category,
      barcode,
      mpn,
      is_active,
      sale_price,
      cost_price,
      description,
      brand,
      weight,
      length_cm,
      width_cm,
      height_cm,
      ncm,
      cest,
      unit,
      origin,
      stock,
      media,
      kit_items,
      dynamic_items,
    } = data;

    // Update product
    await c.env.DB.prepare(
      `UPDATE products SET
        name = ?, alias_name = ?, use_alias_in_nfe = ?, category = ?,
        barcode = ?, mpn = ?, is_active = ?, sale_price = ?, cost_price = ?,
        description = ?, brand = ?, weight = ?, length_cm = ?, width_cm = ?,
        height_cm = ?, ncm = ?, cest = ?, unit = ?, origin = ?, stock = ?,
        status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE sku = ? AND company_id = ?`
    )
      .bind(
        name,
        alias_name || null,
        use_alias_in_nfe ? 1 : 0,
        category || null,
        barcode || null,
        mpn || null,
        is_active ? 1 : 0,
        sale_price || 0,
        cost_price || 0,
        description || null,
        brand || null,
        weight || null,
        length_cm || null,
        width_cm || null,
        height_cm || null,
        ncm || null,
        cest || null,
        unit || "UN",
        origin || "0",
        stock || 0,
        is_active ? "Ativo" : "Inativo",
        sku,
        companyId
      )
      .run();

    // Update media if provided
    if (media !== undefined) {
      // Delete existing media
      await c.env.DB.prepare(`DELETE FROM product_media WHERE product_sku = ?`)
        .bind(sku)
        .run();

      // Insert new media
      if (Array.isArray(media)) {
        for (let i = 0; i < media.length; i++) {
          await c.env.DB.prepare(
            `INSERT INTO product_media (product_sku, media_url, media_type, display_order) VALUES (?, ?, ?, ?)`
          )
            .bind(sku, media[i].url, media[i].type || "image", i)
            .run();
        }
      }
    }

    // Update kit items if provided
    if (existing.product_type === "kit" && kit_items !== undefined) {
      // Delete existing kit items
      await c.env.DB.prepare(`DELETE FROM product_kit_items WHERE kit_sku = ?`)
        .bind(sku)
        .run();

      // Insert new kit items
      if (Array.isArray(kit_items)) {
        for (const item of kit_items) {
          await c.env.DB.prepare(
            `INSERT INTO product_kit_items (kit_sku, component_sku, quantity) VALUES (?, ?, ?)`
          )
            .bind(sku, item.sku, item.quantity || 1)
            .run();
        }
      }
    }

    // Update dynamic items if provided
    if (existing.product_type === "dynamic" && dynamic_items !== undefined) {
      // Delete existing dynamic items
      await c.env.DB.prepare(`DELETE FROM product_dynamic_items WHERE dynamic_sku = ?`)
        .bind(sku)
        .run();

      // Insert new dynamic items
      if (Array.isArray(dynamic_items)) {
        for (const item of dynamic_items) {
          await c.env.DB.prepare(
            `INSERT INTO product_dynamic_items (dynamic_sku, component_sku, quantity) VALUES (?, ?, ?)`
          )
            .bind(sku, item.sku, item.quantity || 1)
            .run();
        }
      }
    }

    return c.json({ message: "Produto atualizado com sucesso" });
  } catch (error) {
    console.error("Error updating product:", error);
    return c.json({ error: "Erro ao atualizar produto" }, 500);
  }
});

// Import products from XLSX file
app.post("/import", async (c) => {
  const correlationId = c.req.header('X-Correlation-Id') || 'unknown';
  
  try {
    const companyId = getCompanyId(c);
    const userId = c.get('userId');
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const useAvailableStock = formData.get("useAvailableStock") === "true";

    console.log(JSON.stringify({
      type: 'import_start',
      correlationId,
      fileName: file?.name,
      fileSize: file?.size,
      companyId,
      userId,
      useAvailableStock,
    }));

    if (!file) {
      return c.json({ error: "Nenhum arquivo enviado" }, 400);
    }

    // Validate filename
    if (!file.name.startsWith("Lista_de_Estoque_")) {
      console.log(JSON.stringify({
        type: 'import_error',
        correlationId,
        error: 'invalid_filename',
        fileName: file.name,
      }));
      return c.json({ 
        error: "Nome do arquivo inválido. O arquivo deve começar com 'Lista_de_Estoque_'" 
      }, 400);
    }

    // Read file as array buffer
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    
    // Parse XLSX
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    console.log(JSON.stringify({
      type: 'import_parse',
      correlationId,
      rowCount: data?.length,
      sheetName: workbook.SheetNames[0],
    }));

    if (!data || data.length < 2) {
      console.log(JSON.stringify({
        type: 'import_error',
        correlationId,
        error: 'empty_sheet',
        rowCount: data?.length,
      }));
      return c.json({ error: "Planilha vazia ou sem dados" }, 400);
    }

    // Validate headers (row 0) - more flexible validation
    const headers = data[0].map((h: any) => String(h || "").trim());
    
    console.log(JSON.stringify({
      type: 'import_headers',
      correlationId,
      receivedHeaders: headers,
    }));

    // More flexible header validation - check if key columns exist
    const requiredColumns = ["SKU", "Título", "Estoque Atual", "Custo Médio"];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      console.log(JSON.stringify({
        type: 'import_error',
        correlationId,
        error: 'missing_columns',
        missingColumns,
        receivedHeaders: headers,
      }));
      return c.json({ 
        error: `Colunas obrigatórias faltando: ${missingColumns.join(", ")}. Verifique se a planilha está no formato correto.`,
        details: {
          expected: requiredColumns,
          received: headers,
          missing: missingColumns,
        }
      }, 400);
    }

    // Find column indexes
    const skuIndex = headers.indexOf("SKU");
    const nameIndex = headers.indexOf("Título");
    const availableStockIndex = headers.indexOf("Disponível");
    const currentStockIndex = headers.indexOf("Estoque Atual");
    const stockIndex = useAvailableStock ? availableStockIndex : currentStockIndex;
    const costIndex = headers.indexOf("Custo Médio");

    console.log(JSON.stringify({
      type: 'import_column_mapping',
      correlationId,
      useAvailableStock,
      stockColumnUsed: useAvailableStock ? 'Disponível (I)' : 'Estoque Atual (J)',
      stockIndex,
    }));

    // Parse all rows first to validate
    const rowsToProcess: Array<{sku: string, name: string, stock: number, costPrice: number}> = [];
    const seenSkus = new Set<string>();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const sku = String(row[skuIndex] || "").trim();
      const name = String(row[nameIndex] || "").trim();
      const stock = parseInt(String(row[stockIndex] || "0"));
      const costPrice = parseFloat(String(row[costIndex] || "0"));

      if (!sku || !name) continue;
      
      // Skip duplicate SKUs within the import file (keep only the first occurrence)
      if (seenSkus.has(sku)) {
        console.log(JSON.stringify({
          type: 'import_duplicate_sku',
          correlationId,
          sku,
          rowNumber: i + 1,
        }));
        continue;
      }
      
      seenSkus.add(sku);
      rowsToProcess.push({ sku, name, stock, costPrice });
    }

    console.log(JSON.stringify({
      type: 'import_validated',
      correlationId,
      validRows: rowsToProcess.length,
    }));

    // Get ALL active products to check for updates
    const skuList = rowsToProcess.map(r => r.sku);

    // CRITICAL: Rename ALL deleted products that match SKUs being imported
    // This frees up the SKU for reuse in the import
    // Process in batches to stay under D1's 256 variable limit
    let totalRenamed = 0;
    for (let i = 0; i < skuList.length; i += 50) {
      const batch = skuList.slice(i, i + 50);
      const placeholders = batch.map(() => '?').join(',');
      
      // Find deleted products with these SKUs
      const { results: deletedToRename } = await c.env.DB.prepare(
        `SELECT sku FROM products 
         WHERE company_id = ? AND is_deleted = 1 AND sku IN (${placeholders})`
      )
        .bind(companyId, ...batch)
        .all();
      
      if (deletedToRename && deletedToRename.length > 0) {
        // Rename each to free the SKU
        const renameStatements: D1PreparedStatement[] = [];
        for (const product of deletedToRename as any[]) {
          const deletedSku = `${product.sku}_deleted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          renameStatements.push(
            c.env.DB.prepare(
              `UPDATE products SET sku = ? WHERE sku = ? AND company_id = ? AND is_deleted = 1`
            ).bind(deletedSku, product.sku, companyId)
          );
        }
        
        if (renameStatements.length > 0) {
          await c.env.DB.batch(renameStatements);
          totalRenamed += renameStatements.length;
        }
      }
    }
    
    if (totalRenamed > 0) {
      console.log(JSON.stringify({
        type: 'import_cleanup_deleted',
        correlationId,
        renamedCount: totalRenamed,
      }));
    }

    const existingSkus = new Set<string>();
    
    if (skuList.length > 0) {
      // Query in batches of 50 to stay under D1's 256 variable limit (50 SKUs + 1 company_id = 51 vars)
      for (let i = 0; i < skuList.length; i += 50) {
        const batch = skuList.slice(i, i + 50);
        const placeholders = batch.map(() => '?').join(',');
        // Check only ACTIVE products (deleted ones were already renamed above)
        const query = `SELECT sku FROM products WHERE company_id = ? AND sku IN (${placeholders}) AND (is_deleted = 0 OR is_deleted IS NULL)`;
        const { results } = await c.env.DB.prepare(query)
          .bind(companyId, ...batch)
          .all();
        
        (results || []).forEach((r: any) => {
          existingSkus.add(r.sku);
        });
      }
    }

    console.log(JSON.stringify({
      type: 'import_existing_check',
      correlationId,
      existingProducts: existingSkus.size,
      newProducts: rowsToProcess.length - existingSkus.size,
      note: 'Only active products will be updated. Deleted products are ignored (not reactivated).',
    }));

    // Get current sequence ONCE for all new products
    const sequenceRow = await c.env.DB.prepare(
      "SELECT next_id FROM product_id_sequence WHERE id = 1"
    ).first() as any;

    let currentProductId = sequenceRow?.next_id || 510320100;
    let importedCount = 0;
    let updatedCount = 0;

    // Process in batches using D1 batch API
    // D1 has a 256 SQL variable limit. INSERT uses 14 vars, UPDATE uses 5 vars.
    // To be safe, use batch size of 15 (15 * 14 = 210 vars max)
    const batchSize = 15;
    for (let i = 0; i < rowsToProcess.length; i += batchSize) {
      const batch = rowsToProcess.slice(i, i + batchSize);
      const statements: D1PreparedStatement[] = [];
      
      for (const row of batch) {
        const isActive = existingSkus.has(row.sku);
        
        if (isActive) {
          // Update existing active product - only stock and cost_price (5 bind variables)
          statements.push(
            c.env.DB.prepare(
              `UPDATE products 
               SET stock = ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP
               WHERE sku = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
            ).bind(row.stock, row.costPrice, row.sku, companyId)
          );
          updatedCount++;
        } else {
          // Insert new product (14 bind variables)
          // Deleted products with this SKU were already renamed, so this SKU is free
          statements.push(
            c.env.DB.prepare(
              `INSERT INTO products (
                company_id, product_id, product_type, sku, name, category,
                stock, cost_price, sale_price, status, is_active, is_deleted,
                unit, origin
              ) VALUES (?, ?, 'simple', ?, ?, 'Sem Categoria', ?, ?, 0, 'Ativo', 1, 0, 'UN', '0')`
            ).bind(companyId, currentProductId, row.sku, row.name, row.stock, row.costPrice)
          );
          currentProductId++;
          importedCount++;
        }
      }
      
      // Execute batch
      if (statements.length > 0) {
        await c.env.DB.batch(statements);
      }

      console.log(JSON.stringify({
        type: 'import_batch_progress',
        correlationId,
        processed: Math.min(i + batchSize, rowsToProcess.length),
        total: rowsToProcess.length,
      }));
    }

    // Update sequence ONCE at the end with the final product_id
    if (importedCount > 0) {
      await c.env.DB.prepare(
        "UPDATE product_id_sequence SET next_id = ? WHERE id = 1"
      )
        .bind(currentProductId)
        .run();
    }

    const totalProcessed = importedCount + updatedCount;
    const duplicatesSkipped = seenSkus.size - rowsToProcess.length;
    const totalSkipped = data.length - 1 - totalProcessed;
    
    let message = `Importação concluída! ${importedCount} produtos novos, ${updatedCount} atualizados`;
    if (totalSkipped > 0) {
      message += `, ${totalSkipped} ignorados`;
      if (duplicatesSkipped > 0) {
        message += ` (${duplicatesSkipped} SKUs duplicados na planilha)`;
      }
    }
    message += '.';
    
    console.log(JSON.stringify({
      type: 'import_success',
      correlationId,
      imported: importedCount,
      updated: updatedCount,
      skipped: totalSkipped,
      duplicatesInFile: duplicatesSkipped,
    }));

    return c.json({ 
      message, 
      imported: importedCount, 
      updated: updatedCount, 
      skipped: totalSkipped 
    });
  } catch (error: any) {
    console.error(JSON.stringify({
      type: 'import_error',
      correlationId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    }));
    
    // Return detailed error message to help diagnose the issue
    const errorMessage = error.message || "Erro desconhecido ao importar produtos";
    
    return c.json({ 
      error: `Erro ao importar produtos: ${errorMessage}`,
      correlationId,
      details: error.stack,
    }, 500);
  }
});

// Upload product image
app.post("/:id/image", async (c) => {
  const productId = c.req.param("id");

  try {
    const companyId = getCompanyId(c);
    
    // Get the product to verify it exists and belongs to this company
    const product = await c.env.DB.prepare(
      `SELECT * FROM products 
       WHERE id = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
    )
      .bind(productId, companyId)
      .first() as any;

    if (!product) {
      return c.json({ error: "Produto não encontrado" }, 404);
    }

    // Get the uploaded image from form data
    const formData = await c.req.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return c.json({ error: "Nenhuma imagem enviada" }, 400);
    }

    // Validate file type
    if (!image.type.startsWith("image/")) {
      return c.json({ error: "Apenas arquivos de imagem são permitidos" }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = image.name.split(".").pop() || "jpg";
    const filename = `products/${companyId}/${product.sku}_${timestamp}.${extension}`;

    // Upload to R2
    const buffer = await image.arrayBuffer();
    await c.env.R2_BUCKET.put(filename, buffer, {
      httpMetadata: {
        contentType: image.type,
      },
    });

    // Generate the image URL
    const imageUrl = `/api/products/images/${filename}`;

    // Update product with image URL
    await c.env.DB.prepare(
      `UPDATE products SET image_url = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND company_id = ?`
    )
      .bind(imageUrl, productId, companyId)
      .run();

    return c.json({ 
      message: "Imagem atualizada com sucesso",
      image_url: imageUrl
    });
  } catch (error) {
    console.error("Error uploading product image:", error);
    return c.json({ error: "Erro ao fazer upload da imagem" }, 500);
  }
});

// Toggle product status
app.patch("/:id/toggle-status", async (c) => {
  const productId = c.req.param("id");
  const { status } = await c.req.json();

  try {
    const companyId = getCompanyId(c);
    
    // Verify product exists and belongs to this company
    const product = await c.env.DB.prepare(
      `SELECT * FROM products 
       WHERE id = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
    )
      .bind(productId, companyId)
      .first();

    if (!product) {
      return c.json({ error: "Produto não encontrado" }, 404);
    }

    // Update status
    await c.env.DB.prepare(
      `UPDATE products SET status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND company_id = ?`
    )
      .bind(status, status === "Ativo" ? 1 : 0, productId, companyId)
      .run();

    return c.json({ message: "Status atualizado com sucesso" });
  } catch (error) {
    console.error("Error toggling product status:", error);
    return c.json({ error: "Erro ao atualizar status" }, 500);
  }
});

// Delete product (soft delete)
app.delete("/:sku", async (c) => {
  const sku = c.req.param("sku");

  try {
    const companyId = getCompanyId(c);
    const existing = await c.env.DB.prepare(
      `SELECT * FROM products 
       WHERE sku = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
    )
      .bind(sku, companyId)
      .first();

    if (!existing) {
      return c.json({ error: "Produto não encontrado" }, 404);
    }

    // Check inventory stock - must be 0 to delete
    const inventory = await c.env.DB.prepare(
      `SELECT stock_quantity FROM inventory_control 
       WHERE sku = ? AND company_id = ?`
    )
      .bind(sku, companyId)
      .first() as any;

    if (inventory && inventory.stock_quantity > 0) {
      return c.json({ 
        error: `Não é possível excluir este produto pois ainda há ${inventory.stock_quantity} unidades em estoque. Zere o estoque em "Lista de Estoque" antes de excluir.`
      }, 400);
    }

    // Check if this product is used in any kit
    const { results: kitUsage } = await c.env.DB.prepare(
      `SELECT DISTINCT k.kit_sku, p.name 
       FROM product_kit_items k
       JOIN products p ON k.kit_sku = p.sku
       WHERE k.component_sku = ? AND p.company_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       LIMIT 5`
    )
      .bind(sku, companyId)
      .all();

    if (kitUsage && kitUsage.length > 0) {
      const kitNames = (kitUsage as any[]).map(k => k.name).join(", ");
      return c.json({ 
        error: `Não é possível excluir este produto pois ele faz parte dos seguintes KITs: ${kitNames}. Exclua primeiro os KITs para poder excluir este produto.`
      }, 400);
    }

    // Check if this product is used in any dynamic product
    const { results: dynamicUsage } = await c.env.DB.prepare(
      `SELECT DISTINCT d.dynamic_sku, p.name 
       FROM product_dynamic_items d
       JOIN products p ON d.dynamic_sku = p.sku
       WHERE d.component_sku = ? AND p.company_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       LIMIT 5`
    )
      .bind(sku, companyId)
      .all();

    if (dynamicUsage && dynamicUsage.length > 0) {
      const dynamicNames = (dynamicUsage as any[]).map(d => d.name).join(", ");
      return c.json({ 
        error: `Não é possível excluir este produto pois ele faz parte dos seguintes Produtos Dinâmicos: ${dynamicNames}. Exclua primeiro os Produtos Dinâmicos para poder excluir este produto.`
      }, 400);
    }

    // Soft delete - mark as deleted AND modify SKU to free it for reuse
    // Add timestamp to make the deleted SKU unique and free the original SKU
    const deletedSku = `${sku}_deleted_${Date.now()}`;
    
    await c.env.DB.prepare(
      `UPDATE products SET is_deleted = 1, sku = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE sku = ? AND company_id = ?`
    )
      .bind(deletedSku, sku, companyId)
      .run();

    return c.json({ message: "Produto excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({ error: "Erro ao excluir produto" }, 500);
  }
});

// Bulk delete products
app.post("/bulk-delete", async (c) => {
  const { skus } = await c.req.json();

  if (!skus || !Array.isArray(skus) || skus.length === 0) {
    return c.json({ error: "Lista de SKUs é obrigatória" }, 400);
  }

  try {
    const companyId = getCompanyId(c);
    const errors: string[] = [];
    const deleted: string[] = [];

    for (const sku of skus) {
      // Check if product exists
      const existing = await c.env.DB.prepare(
        `SELECT * FROM products 
         WHERE sku = ? AND company_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
      )
        .bind(sku, companyId)
        .first();

      if (!existing) {
        errors.push(`${sku}: Produto não encontrado`);
        continue;
      }

      // Check inventory stock - must be 0 to delete
      const inventory = await c.env.DB.prepare(
        `SELECT stock_quantity FROM inventory_control 
         WHERE sku = ? AND company_id = ?`
      )
        .bind(sku, companyId)
        .first() as any;

      if (inventory && inventory.stock_quantity > 0) {
        errors.push(`${sku}: Estoque não zerado (${inventory.stock_quantity} unidades)`);
        continue;
      }

      // Check if this product is used in any kit
      const { results: kitUsage } = await c.env.DB.prepare(
        `SELECT DISTINCT k.kit_sku, p.name 
         FROM product_kit_items k
         JOIN products p ON k.kit_sku = p.sku
         WHERE k.component_sku = ? AND p.company_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
         LIMIT 3`
      )
        .bind(sku, companyId)
        .all();

      if (kitUsage && kitUsage.length > 0) {
        const kitNames = (kitUsage as any[]).map(k => k.name).join(", ");
        errors.push(`${sku}: Usado em KITs (${kitNames})`);
        continue;
      }

      // Check if this product is used in any dynamic product
      const { results: dynamicUsage } = await c.env.DB.prepare(
        `SELECT DISTINCT d.dynamic_sku, p.name 
         FROM product_dynamic_items d
         JOIN products p ON d.dynamic_sku = p.sku
         WHERE d.component_sku = ? AND p.company_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
         LIMIT 3`
      )
        .bind(sku, companyId)
        .all();

      if (dynamicUsage && dynamicUsage.length > 0) {
        const dynamicNames = (dynamicUsage as any[]).map(d => d.name).join(", ");
        errors.push(`${sku}: Usado em Produtos Dinâmicos (${dynamicNames})`);
        continue;
      }

      // Delete the product
      const deletedSku = `${sku}_deleted_${Date.now()}`;
      await c.env.DB.prepare(
        `UPDATE products SET is_deleted = 1, sku = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE sku = ? AND company_id = ?`
      )
        .bind(deletedSku, sku, companyId)
        .run();

      deleted.push(sku);
    }

    return c.json({ 
      message: `${deleted.length} produtos excluídos com sucesso`,
      deleted,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("Error bulk deleting products:", error);
    return c.json({ error: "Erro ao excluir produtos" }, 500);
  }
});

export default app;
