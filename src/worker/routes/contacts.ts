import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Get all contacts for a company
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get("companyId");
    const type = c.req.query("type"); // filter by type: cliente, funcionario, socio
    
    if (!companyId) {
      return c.json({ error: "Company not found" }, 404);
    }
    
    let query = `
      SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN ar.is_paid = 0 THEN ar.amount ELSE 0 END), 0) as em_aberto,
        COALESCE(SUM(CASE WHEN ar.is_paid = 0 AND ar.receipt_date < DATE('now') THEN ar.amount ELSE 0 END), 0) as vencido,
        COALESCE(SUM(CASE WHEN ar.is_paid = 1 THEN ar.amount ELSE 0 END), 0) as movimentado
      FROM contacts c
      LEFT JOIN accounts_receivable ar ON c.id = ar.contact_id AND ar.user_id = (SELECT user_id FROM user_companies WHERE company_id = ? LIMIT 1)
      WHERE c.company_id = ? AND c.is_active = 1
    `;
    const params: any[] = [companyId, companyId];
    
    if (type) {
      query += " AND c.type = ?";
      params.push(type);
    }
    
    query += " GROUP BY c.id ORDER BY c.name ASC";
    
    const contacts = await db.prepare(query).bind(...params).all();
    
    return c.json({ contacts: contacts.results || [] });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return c.json({ error: "Failed to fetch contacts" }, 500);
  }
});

// Get a single contact with financial details
app.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    
    if (!companyId) {
      return c.json({ error: "Company not found" }, 404);
    }
    
    const contact = await db
      .prepare("SELECT * FROM contacts WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .first();
    
    if (!contact) {
      return c.json({ error: "Contact not found" }, 404);
    }

    // Get user_id for this company
    const userCompany = await db
      .prepare("SELECT user_id FROM user_companies WHERE company_id = ? LIMIT 1")
      .bind(companyId)
      .first();

    // Get upcoming receivables
    const upcomingReceivables = await db
      .prepare(`
        SELECT * FROM accounts_receivable 
        WHERE contact_id = ? AND is_paid = 0 AND user_id = ?
        ORDER BY receipt_date ASC
        LIMIT 10
      `)
      .bind(id, (userCompany as any)?.user_id)
      .all();

    // Get last received accounts
    const lastReceived = await db
      .prepare(`
        SELECT * FROM accounts_receivable 
        WHERE contact_id = ? AND is_paid = 1 AND user_id = ?
        ORDER BY paid_date DESC
        LIMIT 10
      `)
      .bind(id, (userCompany as any)?.user_id)
      .all();

    // Get financial summary
    const summary = await db
      .prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN is_paid = 0 THEN amount ELSE 0 END), 0) as em_aberto,
          COALESCE(SUM(CASE WHEN is_paid = 0 AND receipt_date < DATE('now') THEN amount ELSE 0 END), 0) as vencido,
          COALESCE(SUM(CASE WHEN is_paid = 1 THEN amount ELSE 0 END), 0) as movimentado
        FROM accounts_receivable
        WHERE contact_id = ? AND user_id = ?
      `)
      .bind(id, (userCompany as any)?.user_id)
      .first();
    
    return c.json({
      contact,
      upcomingReceivables: upcomingReceivables.results || [],
      lastReceived: lastReceived.results || [],
      summary: summary || { em_aberto: 0, vencido: 0, movimentado: 0 }
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return c.json({ error: "Failed to fetch contact" }, 500);
  }
});

// Create a new contact
app.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get("companyId");
    const body = await c.req.json();
    
    if (!companyId) {
      return c.json({ error: "Company not found" }, 404);
    }
    
    const { 
      type, name, person_type, document, cnpj, razao_social, nome_fantasia,
      inscricao_municipal, inscricao_estadual, email, phone, contact_person,
      website, address, city, state, zipcode, notes,
      bank_name, bank_agency, bank_account, bank_account_digit, pix_key
    } = body;
    
    if (!type || !name) {
      return c.json({ error: "Type and name are required" }, 400);
    }
    
    if (!['cliente', 'funcionario', 'socio'].includes(type)) {
      return c.json({ error: "Invalid contact type" }, 400);
    }
    
    const result = await db
      .prepare(`
        INSERT INTO contacts (
          company_id, type, name, person_type, document, cnpj, razao_social, nome_fantasia,
          inscricao_municipal, inscricao_estadual, email, phone, contact_person, website,
          address, city, state, zipcode, notes,
          bank_name, bank_agency, bank_account, bank_account_digit, pix_key
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        companyId, type, name, person_type || null, document || null, cnpj || null, 
        razao_social || null, nome_fantasia || null, inscricao_municipal || null, 
        inscricao_estadual || null, email || null, phone || null, contact_person || null,
        website || null, address || null, city || null, state || null, zipcode || null, 
        notes || null, bank_name || null, bank_agency || null, bank_account || null,
        bank_account_digit || null, pix_key || null
      )
      .run();
    
    return c.json({ id: result.meta.last_row_id, success: true }, 201);
  } catch (error) {
    console.error("Error creating contact:", error);
    return c.json({ error: "Failed to create contact" }, 500);
  }
});

// Update a contact
app.put("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();
    
    if (!companyId) {
      return c.json({ error: "Company not found" }, 404);
    }
    
    const { 
      type, name, person_type, document, cnpj, razao_social, nome_fantasia,
      inscricao_municipal, inscricao_estadual, email, phone, contact_person,
      website, address, city, state, zipcode, notes,
      bank_name, bank_agency, bank_account, bank_account_digit, pix_key
    } = body;
    
    if (!type || !name) {
      return c.json({ error: "Type and name are required" }, 400);
    }
    
    if (!['cliente', 'funcionario', 'socio'].includes(type)) {
      return c.json({ error: "Invalid contact type" }, 400);
    }
    
    await db
      .prepare(`
        UPDATE contacts 
        SET 
          type = ?, name = ?, person_type = ?, document = ?, cnpj = ?, razao_social = ?,
          nome_fantasia = ?, inscricao_municipal = ?, inscricao_estadual = ?, email = ?,
          phone = ?, contact_person = ?, website = ?, address = ?, city = ?, state = ?,
          zipcode = ?, notes = ?, bank_name = ?, bank_agency = ?, bank_account = ?,
          bank_account_digit = ?, pix_key = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(
        type, name, person_type || null, document || null, cnpj || null, razao_social || null,
        nome_fantasia || null, inscricao_municipal || null, inscricao_estadual || null,
        email || null, phone || null, contact_person || null, website || null, address || null,
        city || null, state || null, zipcode || null, notes || null, bank_name || null,
        bank_agency || null, bank_account || null, bank_account_digit || null, pix_key || null,
        id, companyId
      )
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating contact:", error);
    return c.json({ error: "Failed to update contact" }, 500);
  }
});

// Delete a contact (soft delete)
app.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    
    if (!companyId) {
      return c.json({ error: "Company not found" }, 404);
    }
    
    await db
      .prepare("UPDATE contacts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    return c.json({ error: "Failed to delete contact" }, 500);
  }
});

export default app;
