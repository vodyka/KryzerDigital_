import { Hono } from "hono";
import { getUserIdFromToken } from "../middleware/auth";
import { getCompanyId } from "../middleware/company";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Helper function to log activity
async function logActivity(
  db: D1Database,
  userId: number | string,
  actionType: string,
  description: string,
  entityType?: string,
  entityId?: number
) {
  try {
    await db
      .prepare(`
        INSERT INTO activity_logs (user_id, action_type, description, entity_type, entity_id)
        VALUES (?, ?, ?, ?, ?)
      `)
      .bind(userId.toString(), actionType, description, entityType || null, entityId || null)
      .run();
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

// Get all suppliers
app.get("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    
    const suppliers = await db
      .prepare("SELECT * FROM suppliers WHERE company_id = ? ORDER BY created_at DESC")
      .bind(companyId)
      .all();
    
    // Get product counts for each supplier
    const suppliersWithCounts = await Promise.all(
      (suppliers.results || []).map(async (supplier: any) => {
        // Count individual products
        const individualCount = await db
          .prepare("SELECT COUNT(*) as count FROM supplier_products WHERE supplier_id = ? AND link_type = 'individual'")
          .bind(supplier.id)
          .first();
        
        // Get SKU patterns and count matching products
        const patterns = await db
          .prepare("SELECT sku_pattern FROM supplier_products WHERE supplier_id = ? AND link_type = 'pattern'")
          .bind(supplier.id)
          .all();
        
        let patternMatchCount = 0;
        for (const pattern of (patterns.results || [])) {
          const count = await db
            .prepare("SELECT COUNT(*) as count FROM products WHERE sku LIKE ?")
            .bind(`${pattern.sku_pattern}%`)
            .first();
          patternMatchCount += (count?.count as number) || 0;
        }
        
        return {
          ...supplier,
          product_count: ((individualCount?.count as number) || 0) + patternMatchCount
        };
      })
    );
    
    return c.json({ suppliers: suppliersWithCounts });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return c.json({ error: "Failed to fetch suppliers" }, 500);
  }
});

// Get single supplier (public endpoint for portal access)
app.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const id = c.req.param("id");
    
    // Don't require user_id check for portal access
    const supplier = await db
      .prepare("SELECT * FROM suppliers WHERE id = ?")
      .bind(id)
      .first();
    
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    
    return c.json({ supplier });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return c.json({ error: "Failed to fetch supplier" }, 500);
  }
});

// Create supplier
app.post("/", async (c) => {
  try {
    console.log("[Create Supplier] Starting...");
    const userId = await getUserIdFromToken(c);
    const companyId = getCompanyId(c);
    console.log("[Create Supplier] User ID:", userId, "Company ID:", companyId);
    const db = c.env.DB;
    const body = await c.req.json();
    console.log("[Create Supplier] Body:", JSON.stringify(body));
    
    // Validate required fields based on person type
    if (body.person_type === "fisica") {
      if (!body.cpf || !body.name) {
        return c.json({ error: "CPF e Nome são obrigatórios para pessoa física" }, 400);
      }
    } else if (body.person_type === "juridica") {
      if (!body.cnpj || !body.company_name) {
        return c.json({ error: "CNPJ e Razão Social são obrigatórios para pessoa jurídica" }, 400);
      }
    } else {
      return c.json({ error: "Tipo de pessoa inválido" }, 400);
    }
    
    // Generate portal_id: userId-companyId-cpf/cnpj
    const documentNumber = body.person_type === "fisica" ? body.cpf : body.cnpj;
    const portalId = `${userId}-${companyId}-${documentNumber}`;
    
    // Set default password: first 6 digits of CNPJ/CPF if not provided
    let portalPassword = body.portal_password;
    if (!portalPassword) {
      portalPassword = documentNumber.substring(0, 6);
    }
    
    // Insert supplier
    const result = await db
      .prepare(`
        INSERT INTO suppliers (
          user_id, company_id, person_type, cpf, name, cnpj, company_name, trade_name,
          municipal_registration, state_registration, contact_email, contact_phone,
          contact_name, address_cep, address_street, address_number, address_complement,
          address_neighborhood, address_state, address_city, portal_password, portal_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        companyId,
        body.person_type,
        body.cpf || null,
        body.name || null,
        body.cnpj || null,
        body.company_name || null,
        body.trade_name || null,
        body.municipal_registration || null,
        body.state_registration || null,
        body.contact_email || null,
        body.contact_phone || null,
        body.contact_name || null,
        body.address_cep || null,
        body.address_street || null,
        body.address_number || null,
        body.address_complement || null,
        body.address_neighborhood || null,
        body.address_state || null,
        body.address_city || null,
        portalPassword,
        portalId,
        "Ativo"
      )
      .run();
    
    const supplierId = result.meta.last_row_id;
    
    // Also create a contact in the finance module
    const contactName = body.person_type === "fisica" ? body.name : (body.trade_name || body.company_name);
    const fullAddress = [
      body.address_street,
      body.address_number,
      body.address_complement,
      body.address_neighborhood
    ].filter(Boolean).join(", ");
    
    const contactResult = await db
      .prepare(`
        INSERT INTO contacts (
          company_id, type, name, person_type, document, cnpj, razao_social,
          nome_fantasia, inscricao_municipal, inscricao_estadual, email, phone,
          contact_person, address, city, state, zipcode, is_active, supplier_id
        ) VALUES (?, 'fornecedor', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `)
      .bind(
        companyId,
        contactName,
        body.person_type,
        body.cpf || null,
        body.cnpj || null,
        body.company_name || null,
        body.trade_name || null,
        body.municipal_registration || null,
        body.state_registration || null,
        body.contact_email || null,
        body.contact_phone || null,
        body.contact_name || null,
        fullAddress || null,
        body.address_city || null,
        body.address_state || null,
        body.address_cep || null,
        supplierId
      )
      .run();
    
    // Update supplier with contact_id
    await db
      .prepare("UPDATE suppliers SET contact_id = ? WHERE id = ?")
      .bind(contactResult.meta.last_row_id, supplierId)
      .run();
    
    // Fetch the created supplier
    const supplier = await db
      .prepare("SELECT * FROM suppliers WHERE id = ?")
      .bind(supplierId)
      .first();
    
    // Log activity
    const displayName = body.person_type === "fisica" ? body.name : (body.trade_name || body.company_name);
    await logActivity(
      db,
      userId,
      "create",
      `Fornecedor ${displayName} cadastrado`,
      "supplier",
      supplierId
    );
    
    console.log("[Create Supplier] Success! ID:", result.meta.last_row_id);
    return c.json({ 
      message: "Fornecedor criado com sucesso",
      supplier 
    }, 201);
  } catch (error) {
    console.error("[Create Supplier] Error:", error);
    console.error("[Create Supplier] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("[Create Supplier] Error message:", error instanceof Error ? error.message : String(error));
    return c.json({ 
      error: "Failed to create supplier",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Update supplier
app.put("/:id", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const id = c.req.param("id");
    const body = await c.req.json();
    
    // Check if supplier exists and belongs to company
    const existing = await db
      .prepare("SELECT * FROM suppliers WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .first();
    
    if (!existing) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    
    // Update supplier
    await db
      .prepare(`
        UPDATE suppliers SET
          person_type = ?, cpf = ?, name = ?, cnpj = ?, company_name = ?, trade_name = ?,
          municipal_registration = ?, state_registration = ?, contact_email = ?, 
          contact_phone = ?, contact_name = ?, address_cep = ?, address_street = ?,
          address_number = ?, address_complement = ?, address_neighborhood = ?,
          address_state = ?, address_city = ?, portal_password = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(
        body.person_type,
        body.cpf || null,
        body.name || null,
        body.cnpj || null,
        body.company_name || null,
        body.trade_name || null,
        body.municipal_registration || null,
        body.state_registration || null,
        body.contact_email || null,
        body.contact_phone || null,
        body.contact_name || null,
        body.address_cep || null,
        body.address_street || null,
        body.address_number || null,
        body.address_complement || null,
        body.address_neighborhood || null,
        body.address_state || null,
        body.address_city || null,
        body.portal_password || null,
        body.status || "Ativo",
        id,
        companyId
      )
      .run();
    
    // Also update the corresponding contact in finance module
    const existingSupplier = existing as any;
    if (existingSupplier.contact_id) {
      const contactName = body.person_type === "fisica" ? body.name : (body.trade_name || body.company_name);
      const fullAddress = [
        body.address_street,
        body.address_number,
        body.address_complement,
        body.address_neighborhood
      ].filter(Boolean).join(", ");
      
      await db
        .prepare(`
          UPDATE contacts SET
            name = ?, person_type = ?, document = ?, cnpj = ?, razao_social = ?,
            nome_fantasia = ?, inscricao_municipal = ?, inscricao_estadual = ?,
            email = ?, phone = ?, contact_person = ?, address = ?, city = ?,
            state = ?, zipcode = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND company_id = ?
        `)
        .bind(
          contactName,
          body.person_type,
          body.cpf || null,
          body.cnpj || null,
          body.company_name || null,
          body.trade_name || null,
          body.municipal_registration || null,
          body.state_registration || null,
          body.contact_email || null,
          body.contact_phone || null,
          body.contact_name || null,
          fullAddress || null,
          body.address_city || null,
          body.address_state || null,
          body.address_cep || null,
          existingSupplier.contact_id,
          companyId
        )
        .run();
    }
    
    // Fetch updated supplier
    const supplier = await db
      .prepare("SELECT * FROM suppliers WHERE id = ?")
      .bind(id)
      .first();
    
    // Log activity
    const displayName = body.person_type === "fisica" ? body.name : (body.trade_name || body.company_name);
    await logActivity(
      db,
      userId,
      "update",
      `Dados do fornecedor ${displayName} atualizados`,
      "supplier",
      parseInt(id)
    );
    
    return c.json({ 
      message: "Fornecedor atualizado com sucesso",
      supplier 
    });
  } catch (error) {
    console.error("Error updating supplier:", error);
    return c.json({ error: "Failed to update supplier" }, 500);
  }
});

// Reset portal credentials
app.post("/:id/reset-portal", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const id = c.req.param("id");
    
    // Get supplier first to know which company it belongs to
    const supplier = await db
      .prepare("SELECT * FROM suppliers WHERE id = ?")
      .bind(id)
      .first();
    
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    
    const companyId = supplier.company_id;
    
    console.log("[Reset Portal] userId:", userId, "companyId:", companyId, "supplierId:", id, "supplier:", supplier);
    
    // Regenerate portal_id
    const documentNumber = supplier.person_type === "fisica" ? supplier.cpf : supplier.cnpj;
    const newPortalId = `${userId}-${companyId}-${documentNumber}`;
    
    console.log("[Reset Portal] Generating new portal_id:", newPortalId);
    
    // Update portal_id
    await db
      .prepare("UPDATE suppliers SET portal_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(newPortalId, id)
      .run();
    
    // Fetch updated supplier
    const updatedSupplier = await db
      .prepare("SELECT * FROM suppliers WHERE id = ?")
      .bind(id)
      .first();
    
    // Log activity
    const displayName = supplier.person_type === "fisica" ? supplier.name : (supplier.trade_name || supplier.company_name);
    await logActivity(
      db,
      userId,
      "sync",
      `Portal ID do fornecedor ${displayName} sincronizado`,
      "supplier",
      parseInt(id)
    );
    
    return c.json({ 
      message: "Portal ID sincronizado com sucesso",
      supplier: updatedSupplier
    });
  } catch (error) {
    console.error("Error resetting portal:", error);
    return c.json({ error: "Failed to reset portal credentials" }, 500);
  }
});

// Delete supplier
app.delete("/:id", async (c) => {
  try {
    const userId = await getUserIdFromToken(c);
    const db = c.env.DB;
    const id = c.req.param("id");
    
    // Get supplier name before deleting
    const supplier = await db
      .prepare("SELECT * FROM suppliers WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .first();
    
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    
    const result = await db
      .prepare("DELETE FROM suppliers WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();
    
    if (result.meta.changes === 0) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    
    // Log activity
    const displayName = supplier.person_type === "fisica" ? supplier.name : (supplier.trade_name || supplier.company_name);
    await logActivity(
      db,
      userId,
      "delete",
      `Fornecedor ${displayName} excluído`,
      "supplier",
      parseInt(id)
    );
    
    return c.json({ message: "Fornecedor excluído com sucesso" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return c.json({ error: "Failed to delete supplier" }, 500);
  }
});

export default app;
