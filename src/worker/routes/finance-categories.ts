import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// Default categories that should exist for all companies
const DEFAULT_CATEGORIES = [
  // Receitas Operacionais
  { name: "Descontos Concedidos", type: "despesa", group_name: "Receitas Operacionais" },
  { name: "Juros Recebidos", type: "receita", group_name: "Receitas Operacionais" },
  { name: "Multas Recebidas", type: "receita", group_name: "Receitas Operacionais" },
  { name: "Outras receitas", type: "receita", group_name: "Receitas Operacionais" },

  // Custos Operacionais
  { name: "Compras de fornecedores", type: "despesa", group_name: "Custos Operacionais" },
  { name: "Custo serviço prestado", type: "despesa", group_name: "Custos Operacionais" },
  { name: "Custos produto vendido", type: "despesa", group_name: "Custos Operacionais" },
  { name: "Impostos sobre receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "INSS Retido sobre a Receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "Outras Retenções sobre a Receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "CSLL Retido sobre a Receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "ISS Retido sobre a Receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "PIS Retido sobre a Receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "IRPJ Retido sobre a Receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "COFINS Retido sobre a Receita", type: "despesa", group_name: "Custos Operacionais" },
  { name: "Compras - Embalagens", type: "despesa", group_name: "Custos Operacionais" },
  { name: "Frete sobre Compras", type: "despesa", group_name: "Custos Operacionais" },

  // Despesas Operacionais e Outras Receitas
  { name: "Aluguel e condomínio", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Descontos Recebidos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Juros Pagos", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Luz, água e outros", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Material de escritório", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Multas Pagas", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Outras despesas", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Salários, encargos e benefícios", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Serviços contratados", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Taxas e contribuições", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Pagamento de CSLL Retido", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Pagamento de Cofins Retido", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Pagamento de INSS Retido", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Pagamento de IRPJ Retido", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Pagamento de Outras retenções", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Pagamento de ISS Retido", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Pagamento de PIS Retido", type: "despesa", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "CSLL Retido sobre Pagamentos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "INSS Retido sobre Pagamentos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "IRPJ Retido sobre Pagamentos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "COFINS Retido sobre Pagamentos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "PIS Retido sobre Pagamentos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "ISS Retido sobre Pagamentos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },
  { name: "Outras Retenções sobre Pagamentos", type: "receita", group_name: "Despesas Operacionais e Outras Receitas" },

  // Atividades de Investimento
  { name: "Compra de ativo fixo", type: "despesa", group_name: "Atividades de Investimento" },
  { name: "Venda de ativo fixo", type: "receita", group_name: "Atividades de Investimento" },

  // Atividades de Financiamento
  { name: "Aporte de capital", type: "receita", group_name: "Atividades de Financiamento" },
  { name: "Obtenção de empréstimo", type: "receita", group_name: "Atividades de Financiamento" },
  { name: "Pagamento de empréstimo", type: "despesa", group_name: "Atividades de Financiamento" },
  { name: "Retirada de capital", type: "despesa", group_name: "Atividades de Financiamento" },
];

// Seed default categories for a company
async function seedDefaultCategories(db: D1Database, companyId: string | number) {
  // Check if categories already exist
  const existing = await db.prepare(
    `SELECT COUNT(*) as count FROM categories WHERE company_id = ? AND is_native = 1`
  ).bind(String(companyId)).first();

  if (existing && (existing as any).count > 0) {
    return; // Already seeded
  }

  // Insert all default categories
  for (const cat of DEFAULT_CATEGORIES) {
    await db.prepare(
      `INSERT INTO categories (company_id, name, type, group_name, is_native, display_order)
       VALUES (?, ?, ?, ?, 1, 0)`
    ).bind(String(companyId), cat.name, cat.type, cat.group_name).run();
  }
}

// POST /restore - Restore default categories (delete all and re-seed)
app.post("/restore", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: "Company ID required" }, 400);
    }

    // Delete all categories for this company
    await c.env.DB.prepare(
      `DELETE FROM categories WHERE company_id = ?`
    ).bind(String(companyId)).run();

    // Re-seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      await c.env.DB.prepare(
        `INSERT INTO categories (company_id, name, type, group_name, is_native, display_order)
         VALUES (?, ?, ?, ?, 1, 0)`
      ).bind(String(companyId), cat.name, cat.type, cat.group_name).run();
    }

    return c.json({ success: true, message: "Categorias restauradas com sucesso" });
  } catch (error: any) {
    console.error("Error restoring categories:", error);
    return c.json({ error: error.message || "Failed to restore categories" }, 500);
  }
});

// GET all categories for a company
app.get("/", async (c) => {
  try {
    const companyId = c.get("companyId");
    if (!companyId) {
      return c.json({ error: "Company ID required" }, 400);
    }

    // Seed default categories if they don't exist
    await seedDefaultCategories(c.env.DB, companyId);

    const result = await c.env.DB.prepare(
      `SELECT * FROM categories 
       WHERE company_id = ? AND group_name IS NOT NULL AND group_name != ''
       ORDER BY is_native DESC, type, group_name, display_order ASC, name ASC`
    )
      .bind(String(companyId))
      .all();

    return c.json({ categories: result.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch categories:", error);
    return c.json({ error: "Failed to fetch categories" }, 500);
  }
});

// POST create new category
app.post("/", async (c) => {
  try {
    const companyId = c.get("companyId");
    const body = await c.req.json();

    const { name, type, parent_id, group_name, display_order } = body;

    const result = await c.env.DB.prepare(
      `INSERT INTO categories (company_id, name, type, parent_id, group_name, display_order, is_native)
       VALUES (?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(String(companyId), name, type, parent_id || null, group_name || null, display_order || 0)
      .run();

    return c.json({ success: true, id: String(result.meta.last_row_id || 0) });
  } catch (error: any) {
    console.error("Failed to create category:", error);
    return c.json({ error: "Failed to create category" }, 500);
  }
});

// PUT update category
app.put("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const { name, type, parent_id, group_name, display_order } = body;

    await c.env.DB.prepare(
      `UPDATE categories 
       SET name = ?, type = ?, parent_id = ?, group_name = ?, display_order = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ? AND is_native = 0`
    )
      .bind(name, type, parent_id || null, group_name || null, display_order || 0, id, String(companyId))
      .run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update category:", error);
    return c.json({ error: "Failed to update category" }, 500);
  }
});

// DELETE category
app.delete("/:id", async (c) => {
  try {
    const companyId = c.get("companyId");
    const id = c.req.param("id");

    await c.env.DB.prepare(
      `DELETE FROM categories WHERE id = ? AND company_id = ? AND is_native = 0`
    ).bind(id, String(companyId)).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete category:", error);
    return c.json({ error: "Failed to delete category" }, 500);
  }
});

export default app;
