import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Get products linked to a supplier
app.get("/:supplier_id", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplier_id");
    const companyId = c.get("companyId");
    
    if (!companyId) {
      console.error("No company context found");
      return c.json({ error: "Empresa não encontrada" }, 400);
    }
    
    console.log("[Supplier Products] Fetching linked products for supplier:", supplierId, "company:", companyId);
    
    // Get all links for this supplier
    const links = await db
      .prepare("SELECT * FROM supplier_products WHERE supplier_id = ?")
      .bind(supplierId)
      .all();
    
    // Get individual products
    const individualProducts = links.results?.filter(l => l.link_type === "individual") || [];
    const productIds = individualProducts.map(l => l.product_id).filter(Boolean);
    
    let products: any[] = [];
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const productsResult = await db
        .prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND company_id = ? AND is_deleted = 0`)
        .bind(...productIds, companyId)
        .all();
      
      // Add link_id to each product for easy removal
      products = (productsResult.results || []).map((product: any) => {
        const link = individualProducts.find(l => l.product_id === product.id);
        return {
          ...product,
          link_id: link?.id
        };
      });
    }
    
    // Get SKU patterns
    const skuPatterns = links.results?.filter(l => l.link_type === "pattern").map(l => ({
      id: l.id,
      pattern: l.sku_pattern,
      created_at: l.created_at
    })) || [];
    
    // Count products matching patterns (only for this company)
    let patternMatchCount = 0;
    for (const pattern of skuPatterns) {
      const countResult = await db
        .prepare("SELECT COUNT(*) as count FROM products WHERE sku LIKE ? AND company_id = ? AND is_deleted = 0")
        .bind(`${pattern.pattern}%`, companyId)
        .first();
      patternMatchCount += (countResult?.count as number) || 0;
    }
    
    console.log("[Supplier Products] Found linked products:", products.length, "patterns:", skuPatterns.length);
    
    return c.json({
      products,
      sku_patterns: skuPatterns,
      total_linked: products.length + patternMatchCount
    });
  } catch (error) {
    console.error("Error fetching supplier products:", error);
    return c.json({ error: "Erro ao buscar produtos vinculados" }, 500);
  }
});

// Link product to supplier (individual or pattern)
app.post("/:supplier_id", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplier_id");
    const { link_type, product_id, sku_pattern } = await c.req.json();
    
    if (!link_type || (link_type !== "individual" && link_type !== "pattern")) {
      return c.json({ error: "Tipo de vínculo inválido" }, 400);
    }
    
    if (link_type === "individual" && !product_id) {
      return c.json({ error: "ID do produto é obrigatório para vínculo individual" }, 400);
    }
    
    if (link_type === "pattern" && !sku_pattern) {
      return c.json({ error: "Padrão SKU é obrigatório para vínculo por padrão" }, 400);
    }
    
    // Check if link already exists
    if (link_type === "individual") {
      const existing = await db
        .prepare("SELECT * FROM supplier_products WHERE supplier_id = ? AND product_id = ? AND link_type = 'individual'")
        .bind(supplierId, product_id)
        .first();
      
      if (existing) {
        return c.json({ error: "Este produto já está vinculado" }, 400);
      }
    } else {
      const existing = await db
        .prepare("SELECT * FROM supplier_products WHERE supplier_id = ? AND sku_pattern = ? AND link_type = 'pattern'")
        .bind(supplierId, sku_pattern)
        .first();
      
      if (existing) {
        return c.json({ error: "Este padrão SKU já está vinculado" }, 400);
      }
    }
    
    // Insert link
    await db
      .prepare(`
        INSERT INTO supplier_products (supplier_id, product_id, sku_pattern, link_type)
        VALUES (?, ?, ?, ?)
      `)
      .bind(
        supplierId,
        link_type === "individual" ? product_id : null,
        link_type === "pattern" ? sku_pattern : null,
        link_type
      )
      .run();
    
    return c.json({ message: "Produto vinculado com sucesso" }, 201);
  } catch (error) {
    console.error("Error linking product:", error);
    return c.json({ error: "Erro ao vincular produto" }, 500);
  }
});

// Remove product link by link_id
app.delete("/:supplier_id/:link_id", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplier_id");
    const linkId = c.req.param("link_id");
    
    const result = await db
      .prepare("DELETE FROM supplier_products WHERE id = ? AND supplier_id = ?")
      .bind(linkId, supplierId)
      .run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: "Vínculo não encontrado" }, 404);
    }
    
    return c.json({ message: "Vínculo removido com sucesso" });
  } catch (error) {
    console.error("Error removing link:", error);
    return c.json({ error: "Erro ao remover vínculo" }, 500);
  }
});

// Remove individual product link by product_id
app.delete("/:supplier_id/product/:product_id", async (c) => {
  try {
    const db = c.env.DB;
    const supplierId = c.req.param("supplier_id");
    const productId = c.req.param("product_id");
    
    const result = await db
      .prepare("DELETE FROM supplier_products WHERE supplier_id = ? AND product_id = ? AND link_type = 'individual'")
      .bind(supplierId, productId)
      .run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: "Vínculo não encontrado" }, 404);
    }
    
    return c.json({ message: "Vínculo removido com sucesso" });
  } catch (error) {
    console.error("Error removing product link:", error);
    return c.json({ error: "Erro ao remover vínculo" }, 500);
  }
});

// Get all available products
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get("companyId");
    
    if (!companyId) {
      console.error("No company context found");
      return c.json({ error: "Empresa não encontrada" }, 400);
    }
    
    console.log("[Supplier Products] Fetching products for company:", companyId);
    
    const products = await db
      .prepare("SELECT id, sku, name, category, price, stock FROM products WHERE company_id = ? AND status = 'Ativo' AND is_deleted = 0 ORDER BY sku")
      .bind(companyId)
      .all();
    
    console.log("[Supplier Products] Found products:", products.results?.length || 0);
    
    return c.json({ products: products.results || [] });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({ error: "Erro ao buscar produtos" }, 500);
  }
});

export default app;
