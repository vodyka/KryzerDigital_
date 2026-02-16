import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Get user's companies
app.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.env.DB;

  // Get all companies for this user
  const result = await db
    .prepare(
      `SELECT 
        c.id,
        c.name,
        c.slug,
        c.logo_url,
        c.settings,
        uc.role,
        uc.is_default,
        c.created_at,
        c.updated_at
      FROM companies c
      INNER JOIN user_companies uc ON c.id = uc.company_id
      WHERE uc.user_id = ?
      ORDER BY uc.is_default DESC, c.name ASC`
    )
    .bind(userId)
    .all();

  // Convert is_default from 0/1 to false/true
  const companies = (result.results || []).map((company: any) => ({
    ...company,
    is_default: Boolean(company.is_default),
  }));

  return c.json({ companies });
});

// Get current company (default)
app.get("/current", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const db = c.env.DB;

  const result = await db
    .prepare(
      `SELECT 
        c.id,
        c.name,
        c.slug,
        c.logo_url,
        c.settings,
        uc.role,
        uc.is_default,
        c.created_at,
        c.updated_at
      FROM companies c
      INNER JOIN user_companies uc ON c.id = uc.company_id
      WHERE uc.user_id = ? AND uc.is_default = 1
      LIMIT 1`
    )
    .bind(userId)
    .all();

  if (!result.results || result.results.length === 0) {
    return c.json({ error: "No default company found" }, 404);
  }

  const company = result.results[0] as any;
  return c.json({ 
    company: {
      ...company,
      is_default: Boolean(company.is_default),
    }
  });
});

// Create new company
app.post("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const { name, logo_url } = body;

  if (!name || !name.trim()) {
    return c.json({ error: "Company name is required" }, 400);
  }

  const db = c.env.DB;

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Check if slug exists
  const existing = await db
    .prepare("SELECT id FROM companies WHERE slug = ?")
    .bind(slug)
    .first();

  if (existing) {
    return c.json({ error: "Company with similar name already exists" }, 400);
  }

  // Create company
  const insertCompany = await db
    .prepare(
      `INSERT INTO companies (name, slug, logo_url, settings, created_at, updated_at)
       VALUES (?, ?, ?, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(name, slug, logo_url || null)
    .run();

  const companyId = insertCompany.meta.last_row_id;

  // Associate user with company
  await db
    .prepare(
      `INSERT INTO user_companies (user_id, company_id, role, is_default, created_at, updated_at)
       VALUES (?, ?, 'owner', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(userId, companyId)
    .run();

  // Get the created company
  const company = await db
    .prepare(
      `SELECT 
        c.id,
        c.name,
        c.slug,
        c.logo_url,
        c.settings,
        uc.role,
        uc.is_default,
        c.created_at,
        c.updated_at
      FROM companies c
      INNER JOIN user_companies uc ON c.id = uc.company_id
      WHERE c.id = ? AND uc.user_id = ?`
    )
    .bind(companyId, userId)
    .first() as any;

  return c.json({ 
    company: {
      ...company,
      is_default: Boolean(company.is_default),
    }
  }, 201);
});

// Switch default company
app.post("/:id/switch", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const companyId = parseInt(c.req.param("id"));
  const db = c.env.DB;

  // Verify user has access to this company
  const access = await db
    .prepare(
      "SELECT id FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
    .bind(userId, companyId)
    .first();

  if (!access) {
    return c.json({ error: "Access denied to this company" }, 403);
  }

  // Remove default from all user's companies
  await db
    .prepare("UPDATE user_companies SET is_default = 0 WHERE user_id = ?")
    .bind(userId)
    .run();

  // Set new default
  await db
    .prepare(
      "UPDATE user_companies SET is_default = 1 WHERE user_id = ? AND company_id = ?"
    )
    .bind(userId, companyId)
    .run();

  // Get the new current company
  const company = await db
    .prepare(
      `SELECT 
        c.id,
        c.name,
        c.slug,
        c.logo_url,
        c.settings,
        uc.role,
        uc.is_default,
        c.created_at,
        c.updated_at
      FROM companies c
      INNER JOIN user_companies uc ON c.id = uc.company_id
      WHERE c.id = ? AND uc.user_id = ?`
    )
    .bind(companyId, userId)
    .first() as any;

  return c.json({ 
    company: {
      ...company,
      is_default: Boolean(company.is_default),
    }
  });
});

// Get company profile
app.get("/:id/profile", async (c) => {
  const userId = c.get("userId");
  console.log("[Company Profile] userId:", userId);
  
  if (!userId) {
    console.log("[Company Profile] No userId found");
    return c.json({ error: "Unauthorized" }, 401);
  }

  const companyId = parseInt(c.req.param("id"));
  console.log("[Company Profile] companyId:", companyId);
  const db = c.env.DB;

  // Verify user has access to this company
  const access = await db
    .prepare(
      "SELECT role FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
    .bind(userId, companyId)
    .first();

  console.log("[Company Profile] access:", access);

  if (!access) {
    console.log("[Company Profile] No access found");
    return c.json({ error: "Access denied to this company" }, 403);
  }

  // Get full company profile
  const company = await db
    .prepare(
      `SELECT 
        id,
        name,
        slug,
        logo_url,
        cnpj,
        razao_social,
        inscricao_estadual,
        endereco_cep,
        endereco_rua,
        endereco_numero,
        endereco_complemento,
        endereco_bairro,
        endereco_cidade,
        endereco_estado,
        telefone,
        email,
        settings,
        created_at,
        updated_at
      FROM companies
      WHERE id = ?`
    )
    .bind(companyId)
    .first();

  console.log("[Company Profile] company result:", company);

  if (!company) {
    console.log("[Company Profile] Company not found");
    return c.json({ error: "Company not found" }, 404);
  }

  console.log("[Company Profile] Returning company data");
  return c.json({ company });
});

// Update company
app.patch("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const companyId = parseInt(c.req.param("id"));
  const body = await c.req.json();
  const { 
    name, 
    logo_url, 
    settings,
    cnpj,
    razao_social,
    inscricao_estadual,
    endereco_cep,
    endereco_rua,
    endereco_numero,
    endereco_complemento,
    endereco_bairro,
    endereco_cidade,
    endereco_estado,
    telefone,
    email
  } = body;

  const db = c.env.DB;

  // Verify user is owner of this company
  const access = await db
    .prepare(
      "SELECT role FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
    .bind(userId, companyId)
    .first();

  if (!access || access.role !== "owner") {
    return c.json({ error: "Only company owners can update company details" }, 403);
  }

  // Update company
  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined) {
    updates.push("name = ?");
    params.push(name);
  }
  if (logo_url !== undefined) {
    updates.push("logo_url = ?");
    params.push(logo_url);
  }
  if (settings !== undefined) {
    updates.push("settings = ?");
    params.push(JSON.stringify(settings));
  }
  if (cnpj !== undefined) {
    updates.push("cnpj = ?");
    params.push(cnpj);
  }
  if (razao_social !== undefined) {
    updates.push("razao_social = ?");
    params.push(razao_social);
  }
  if (inscricao_estadual !== undefined) {
    updates.push("inscricao_estadual = ?");
    params.push(inscricao_estadual);
  }
  if (endereco_cep !== undefined) {
    updates.push("endereco_cep = ?");
    params.push(endereco_cep);
  }
  if (endereco_rua !== undefined) {
    updates.push("endereco_rua = ?");
    params.push(endereco_rua);
  }
  if (endereco_numero !== undefined) {
    updates.push("endereco_numero = ?");
    params.push(endereco_numero);
  }
  if (endereco_complemento !== undefined) {
    updates.push("endereco_complemento = ?");
    params.push(endereco_complemento);
  }
  if (endereco_bairro !== undefined) {
    updates.push("endereco_bairro = ?");
    params.push(endereco_bairro);
  }
  if (endereco_cidade !== undefined) {
    updates.push("endereco_cidade = ?");
    params.push(endereco_cidade);
  }
  if (endereco_estado !== undefined) {
    updates.push("endereco_estado = ?");
    params.push(endereco_estado);
  }
  if (telefone !== undefined) {
    updates.push("telefone = ?");
    params.push(telefone);
  }
  if (email !== undefined) {
    updates.push("email = ?");
    params.push(email);
  }

  if (updates.length > 0) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(companyId);

    await db
      .prepare(
        `UPDATE companies SET ${updates.join(", ")} WHERE id = ?`
      )
      .bind(...params)
      .run();
  }

  // Get updated company
  const company = await db
    .prepare(
      `SELECT 
        c.id,
        c.name,
        c.slug,
        c.logo_url,
        c.cnpj,
        c.razao_social,
        c.inscricao_estadual,
        c.endereco_cep,
        c.endereco_rua,
        c.endereco_numero,
        c.endereco_complemento,
        c.endereco_bairro,
        c.endereco_cidade,
        c.endereco_estado,
        c.telefone,
        c.email,
        c.settings,
        uc.role,
        uc.is_default,
        c.created_at,
        c.updated_at
      FROM companies c
      INNER JOIN user_companies uc ON c.id = uc.company_id
      WHERE c.id = ? AND uc.user_id = ?`
    )
    .bind(companyId, userId)
    .first() as any;

  return c.json({ 
    company: {
      ...company,
      is_default: Boolean(company.is_default),
    }
  });
});

// Delete company
app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const companyId = parseInt(c.req.param("id"));
  const db = c.env.DB;

  // Verify user is owner of this company
  const access = await db
    .prepare(
      "SELECT role FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
    .bind(userId, companyId)
    .first();

  if (!access || access.role !== "owner") {
    return c.json({ error: "Only company owners can delete the company" }, 403);
  }

  // Check if user has other companies
  const companies = await db
    .prepare(
      "SELECT COUNT(*) as count FROM user_companies WHERE user_id = ?"
    )
    .bind(userId)
    .first() as any;

  if (companies.count <= 1) {
    return c.json({ error: "Cannot delete your only company" }, 400);
  }

  // Delete all company data (cascade will handle most, but we'll be explicit)
  // Order matters - delete child records before parent records
  
  await db.prepare("DELETE FROM order_receipts WHERE order_id IN (SELECT id FROM orders WHERE company_id = ?)").bind(companyId).run();
  await db.prepare("DELETE FROM order_receipt_errors WHERE order_id IN (SELECT id FROM orders WHERE company_id = ?)").bind(companyId).run();
  await db.prepare("DELETE FROM orders WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM products WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM suppliers WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM categories WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM lancamentos WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM accounts_payable WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM accounts_receivable WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM bank_accounts WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM recurring_transactions WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM notifications WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM operational_cost_expenses WHERE group_id IN (SELECT id FROM operational_cost_groups WHERE company_id = ?)").bind(companyId).run();
  await db.prepare("DELETE FROM operational_cost_groups WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM supplier_products WHERE company_id = ?").bind(companyId).run();
  await db.prepare("DELETE FROM spreadsheet_data WHERE company_id = ?").bind(companyId).run();
  
  // Delete user association
  await db.prepare("DELETE FROM user_companies WHERE company_id = ?").bind(companyId).run();
  
  // Delete company
  await db.prepare("DELETE FROM companies WHERE id = ?").bind(companyId).run();

  return c.json({ message: "Company deleted successfully" });
});

export default app;
