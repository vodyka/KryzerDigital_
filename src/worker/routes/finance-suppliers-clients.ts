import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// GET all contacts (suppliers/clients) for a company
app.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");

    const result = await c.env.DB.prepare(
      `SELECT * FROM contacts 
       WHERE company_id = ? AND is_active = 1
       ORDER BY name ASC`
    )
      .bind(companyId)
      .all();

    return c.json({ contacts: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch contacts:", error);
    return c.json({ error: "Failed to fetch contacts" }, 500);
  }
});

// POST create new contact
app.post("/", async (c) => {
  try {
    const companyId = c.get("companyId");
    const body = await c.req.json();

    const {
      type,
      name,
      person_type,
      document,
      cnpj,
      razao_social,
      nome_fantasia,
      inscricao_municipal,
      inscricao_estadual,
      email,
      phone,
      contact_person,
      address,
      city,
      state,
      zipcode,
      website,
      bank_name,
      bank_agency,
      bank_account,
      bank_account_digit,
      pix_key,
      notes,
    } = body;

    const result = await c.env.DB.prepare(
      `INSERT INTO contacts (
        company_id, type, name, person_type, document, cnpj, razao_social,
        nome_fantasia, inscricao_municipal, inscricao_estadual, email, phone,
        contact_person, address, city, state, zipcode, website, bank_name,
        bank_agency, bank_account, bank_account_digit, pix_key, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
      .bind(
        companyId,
        type,
        name,
        person_type || null,
        document || null,
        cnpj || null,
        razao_social || null,
        nome_fantasia || null,
        inscricao_municipal || null,
        inscricao_estadual || null,
        email || null,
        phone || null,
        contact_person || null,
        address || null,
        city || null,
        state || null,
        zipcode || null,
        website || null,
        bank_name || null,
        bank_agency || null,
        bank_account || null,
        bank_account_digit || null,
        pix_key || null,
        notes || null
      )
      .run();

    const contactId = result.meta.last_row_id;
    
    // If this is a fornecedor, also create in suppliers table
    if (type === 'fornecedor') {
      const userId = c.get("userId");
      
      // Generate portal credentials
      const portalPassword = Math.random().toString(36).slice(-8);
      const documentForPortal = person_type === 'fisica' ? document : cnpj;
      const portalId = `${userId}-${companyId}-${documentForPortal?.replace(/\D/g, '') || ''}`;
      
      // Split address into components (best effort)
      const addressParts = (address || '').split(',').map((p: string) => p.trim());
      
      const supplierResult = await c.env.DB.prepare(`
        INSERT INTO suppliers (
          user_id, company_id, person_type, cpf, name, cnpj, company_name, trade_name,
          municipal_registration, state_registration, contact_email, contact_phone,
          contact_name, address_cep, address_street, address_number,
          address_city, address_state, portal_password, portal_id, status, contact_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Ativo', ?)
      `).bind(
        userId,
        companyId,
        person_type || null,
        document || null,
        name,
        cnpj || null,
        razao_social || null,
        nome_fantasia || null,
        inscricao_municipal || null,
        inscricao_estadual || null,
        email || null,
        phone || null,
        contact_person || null,
        zipcode || null,
        addressParts[0] || null,
        addressParts[1] || null,
        city || null,
        state || null,
        portalPassword,
        portalId,
        contactId
      ).run();
      
      // Update contact with supplier_id
      await c.env.DB.prepare(
        "UPDATE contacts SET supplier_id = ? WHERE id = ?"
      ).bind(supplierResult.meta.last_row_id, contactId).run();
    }

    return c.json({ success: true, id: contactId });
  } catch (error: any) {
    console.error("Failed to create contact:", error);
    return c.json({ error: "Failed to create contact" }, 500);
  }
});

// PUT update contact
app.put("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const {
      type,
      name,
      person_type,
      document,
      cnpj,
      razao_social,
      nome_fantasia,
      inscricao_municipal,
      inscricao_estadual,
      email,
      phone,
      contact_person,
      address,
      city,
      state,
      zipcode,
      website,
      bank_name,
      bank_agency,
      bank_account,
      bank_account_digit,
      pix_key,
      notes,
    } = body;

    await c.env.DB.prepare(
      `UPDATE contacts 
       SET type = ?, name = ?, person_type = ?, document = ?, cnpj = ?,
           razao_social = ?, nome_fantasia = ?, inscricao_municipal = ?,
           inscricao_estadual = ?, email = ?, phone = ?, contact_person = ?,
           address = ?, city = ?, state = ?, zipcode = ?, website = ?,
           bank_name = ?, bank_agency = ?, bank_account = ?, bank_account_digit = ?,
           pix_key = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`
    )
      .bind(
        type,
        name,
        person_type || null,
        document || null,
        cnpj || null,
        razao_social || null,
        nome_fantasia || null,
        inscricao_municipal || null,
        inscricao_estadual || null,
        email || null,
        phone || null,
        contact_person || null,
        address || null,
        city || null,
        state || null,
        zipcode || null,
        website || null,
        bank_name || null,
        bank_agency || null,
        bank_account || null,
        bank_account_digit || null,
        pix_key || null,
        notes || null,
        id,
        companyId
      )
      .run();
    
    // If this is a fornecedor, also update the corresponding supplier
    if (type === 'fornecedor') {
      const contact = await c.env.DB.prepare(
        "SELECT supplier_id FROM contacts WHERE id = ? AND company_id = ?"
      ).bind(id, companyId).first();
      
      if (contact && (contact as any).supplier_id) {
        const supplierId = (contact as any).supplier_id;
        
        // Split address into components (best effort)
        const addressParts = (address || '').split(',').map((p: string) => p.trim());
        
        await c.env.DB.prepare(`
          UPDATE suppliers SET
            person_type = ?, cpf = ?, name = ?, cnpj = ?, company_name = ?, trade_name = ?,
            municipal_registration = ?, state_registration = ?, contact_email = ?,
            contact_phone = ?, contact_name = ?, address_cep = ?, address_street = ?,
            address_number = ?, address_city = ?, address_state = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND company_id = ?
        `).bind(
          person_type || null,
          document || null,
          name,
          cnpj || null,
          razao_social || null,
          nome_fantasia || null,
          inscricao_municipal || null,
          inscricao_estadual || null,
          email || null,
          phone || null,
          contact_person || null,
          zipcode || null,
          addressParts[0] || null,
          addressParts[1] || null,
          city || null,
          state || null,
          supplierId,
          companyId
        ).run();
      }
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update contact:", error);
    return c.json({ error: "Failed to update contact" }, 500);
  }
});

// DELETE contact (soft delete)
app.delete("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");

    await c.env.DB.prepare(
      `UPDATE contacts SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND company_id = ?`
    ).bind(id, companyId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete contact:", error);
    return c.json({ error: "Failed to delete contact" }, 500);
  }
});

export default app;
