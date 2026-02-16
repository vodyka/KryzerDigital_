import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

// ============================================
// OPERATIONAL EXPENSES ROUTES
// ============================================

// Create operational expense
app.post("/expenses", async (c) => {
  try {
    const userId = c.get("userId");
    const companyId = getCompanyId(c);
    const body = await c.req.json();
    const {
      reference_month,
      cost_packaging = 0,
      cost_accountant = 0,
      cost_prolabore = 0,
      cost_employee_salary = 0,
      cost_shipping = 0,
      cost_rent = 0,
      cost_water = 0,
      cost_electricity = 0,
      cost_internet = 0,
    } = body;

    if (!reference_month) {
      return c.json({ error: "Mês de referência é obrigatório" }, 400);
    }

    // Calculate total
    const total_expenses =
      parseFloat(cost_packaging || 0) +
      parseFloat(cost_accountant || 0) +
      parseFloat(cost_prolabore || 0) +
      parseFloat(cost_employee_salary || 0) +
      parseFloat(cost_shipping || 0) +
      parseFloat(cost_rent || 0) +
      parseFloat(cost_water || 0) +
      parseFloat(cost_electricity || 0) +
      parseFloat(cost_internet || 0);

    // Check if expense already exists for this month
    const existing = await c.env.DB.prepare(
      "SELECT id FROM operational_expenses WHERE company_id = ? AND reference_month = ?"
    )
      .bind(companyId, reference_month)
      .first();

    if (existing) {
      return c.json({ error: "Já existe uma despesa cadastrada para este mês" }, 400);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO operational_expenses (
        user_id, company_id, reference_month, cost_packaging, cost_accountant, cost_prolabore,
        cost_employee_salary, cost_shipping, cost_rent, cost_water, cost_electricity,
        cost_internet, total_expenses
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        userId,
        companyId,
        reference_month,
        cost_packaging,
        cost_accountant,
        cost_prolabore,
        cost_employee_salary,
        cost_shipping,
        cost_rent,
        cost_water,
        cost_electricity,
        cost_internet,
        total_expenses
      )
      .run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      total_expenses,
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return c.json({ error: "Erro ao criar despesa" }, 500);
  }
});

// Get expenses by month
app.get("/expenses/:month", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const month = c.req.param("month");

    const expense = await c.env.DB.prepare(
      "SELECT * FROM operational_expenses WHERE company_id = ? AND reference_month = ?"
    )
      .bind(companyId, month)
      .first();

    return c.json({ expense });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return c.json({ error: "Erro ao buscar despesa" }, 500);
  }
});

// List all expenses
app.get("/expenses", async (c) => {
  try {
    const companyId = getCompanyId(c);

    const result = await c.env.DB.prepare(
      "SELECT * FROM operational_expenses WHERE company_id = ? ORDER BY reference_month DESC"
    )
      .bind(companyId)
      .all();

    return c.json({ expenses: result.results || [] });
  } catch (error) {
    console.error("Error listing expenses:", error);
    return c.json({ error: "Erro ao listar despesas" }, 500);
  }
});

// Update expense
app.put("/expenses/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    const {
      cost_packaging = 0,
      cost_accountant = 0,
      cost_prolabore = 0,
      cost_employee_salary = 0,
      cost_shipping = 0,
      cost_rent = 0,
      cost_water = 0,
      cost_electricity = 0,
      cost_internet = 0,
    } = body;

    // Calculate total
    const total_expenses =
      parseFloat(cost_packaging || 0) +
      parseFloat(cost_accountant || 0) +
      parseFloat(cost_prolabore || 0) +
      parseFloat(cost_employee_salary || 0) +
      parseFloat(cost_shipping || 0) +
      parseFloat(cost_rent || 0) +
      parseFloat(cost_water || 0) +
      parseFloat(cost_electricity || 0) +
      parseFloat(cost_internet || 0);

    await c.env.DB.prepare(
      `UPDATE operational_expenses SET
        cost_packaging = ?, cost_accountant = ?, cost_prolabore = ?,
        cost_employee_salary = ?, cost_shipping = ?, cost_rent = ?,
        cost_water = ?, cost_electricity = ?, cost_internet = ?,
        total_expenses = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?`
    )
      .bind(
        cost_packaging,
        cost_accountant,
        cost_prolabore,
        cost_employee_salary,
        cost_shipping,
        cost_rent,
        cost_water,
        cost_electricity,
        cost_internet,
        total_expenses,
        id,
        companyId
      )
      .run();

    return c.json({ success: true, total_expenses });
  } catch (error) {
    console.error("Error updating expense:", error);
    return c.json({ error: "Erro ao atualizar despesa" }, 500);
  }
});

// Delete expense
app.delete("/expenses/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param("id");

    await c.env.DB.prepare(
      "DELETE FROM operational_expenses WHERE id = ? AND company_id = ?"
    )
      .bind(id, companyId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return c.json({ error: "Erro ao deletar despesa" }, 500);
  }
});

// ============================================
// PRODUCT GROUPS ROUTES
// ============================================

// Create product group
app.post("/groups", async (c) => {
  try {
    const userId = c.get("userId");
    const companyId = getCompanyId(c);
    const body = await c.req.json();
    const { group_name, description, spu, group_type } = body;

    console.log("[Create Group] userId:", userId, "companyId:", companyId);
    console.log("[Create Group] body:", { group_name, description, spu, group_type });

    if (!group_name) {
      return c.json({ error: "Nome do grupo é obrigatório" }, 400);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO product_groups (user_id, company_id, group_name, description, spu, group_type) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(userId, companyId, group_name, description || null, spu || null, group_type || "variacao")
      .run();

    console.log("[Create Group] result:", result);
    console.log("[Create Group] inserted id:", result.meta.last_row_id);

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error("[Create Group] Error:", error);
    return c.json({ error: "Erro ao criar grupo" }, 500);
  }
});

// Get all SKUs that are in any group (for filtering)
app.get("/groups/all-items", async (c) => {
  try {
    const companyId = getCompanyId(c);

    const items = await c.env.DB.prepare(
      `SELECT DISTINCT pgi.sku 
       FROM product_group_items pgi 
       INNER JOIN product_groups pg ON pg.id = pgi.group_id 
       WHERE pg.company_id = ?`
    )
      .bind(companyId)
      .all();

    const skus = (items.results || []).map((item: any) => item.sku);

    return c.json({ skus });
  } catch (error) {
    console.error("Error fetching all group items:", error);
    return c.json({ error: "Erro ao buscar itens dos grupos" }, 500);
  }
});

// List all groups
app.get("/groups", async (c) => {
  try {
    const companyId = getCompanyId(c);

    const groups = await c.env.DB.prepare(
      `SELECT g.*, 
        (SELECT COUNT(*) FROM product_group_items WHERE group_id = g.id) as product_count
      FROM product_groups g 
      WHERE g.company_id = ? 
      ORDER BY g.created_at DESC`
    )
      .bind(companyId)
      .all();

    return c.json({ groups: groups.results || [] });
  } catch (error) {
    console.error("Error listing groups:", error);
    return c.json({ error: "Erro ao listar grupos" }, 500);
  }
});

// Get group with items
app.get("/groups/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param("id");

    const group = await c.env.DB.prepare(
      "SELECT * FROM product_groups WHERE id = ? AND company_id = ?"
    )
      .bind(id, companyId)
      .first();

    if (!group) {
      return c.json({ error: "Grupo não encontrado" }, 404);
    }

    const items = await c.env.DB.prepare(
      `SELECT pgi.*, p.name as product_name, p.image_url 
       FROM product_group_items pgi 
       LEFT JOIN products p ON p.sku = pgi.sku 
       WHERE pgi.group_id = ? 
       ORDER BY pgi.sku`
    )
      .bind(id)
      .all();

    return c.json({ group, items: items.results || [] });
  } catch (error) {
    console.error("Error fetching group:", error);
    return c.json({ error: "Erro ao buscar grupo" }, 500);
  }
});

// Update group
app.put("/groups/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { group_name, description, spu } = body;

    if (!group_name) {
      return c.json({ error: "Nome do grupo é obrigatório" }, 400);
    }

    // Note: group_type is intentionally not updated to prevent type changes after creation
    await c.env.DB.prepare(
      `UPDATE product_groups SET 
        group_name = ?, description = ?, spu = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND company_id = ?`
    )
      .bind(group_name, description || null, spu || null, id, companyId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating group:", error);
    return c.json({ error: "Erro ao atualizar grupo" }, 500);
  }
});

// Delete group
app.delete("/groups/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const id = c.req.param("id");

    // Delete items first
    await c.env.DB.prepare("DELETE FROM product_group_items WHERE group_id = ?")
      .bind(id)
      .run();

    // Delete group
    await c.env.DB.prepare(
      "DELETE FROM product_groups WHERE id = ? AND company_id = ?"
    )
      .bind(id, companyId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    return c.json({ error: "Erro ao deletar grupo" }, 500);
  }
});

// Add SKU to group
app.post("/groups/:id/items", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const groupId = c.req.param("id");
    const body = await c.req.json();
    const { sku } = body;

    if (!sku) {
      return c.json({ error: "SKU é obrigatório" }, 400);
    }

    // Verify group belongs to company
    const group = await c.env.DB.prepare(
      "SELECT id FROM product_groups WHERE id = ? AND company_id = ?"
    )
      .bind(groupId, companyId)
      .first();

    if (!group) {
      return c.json({ error: "Grupo não encontrado" }, 404);
    }

    // Check if SKU already exists in ANY group for this company
    const existingInAnyGroup = await c.env.DB.prepare(
      `SELECT pgi.id, pg.group_name 
       FROM product_group_items pgi 
       INNER JOIN product_groups pg ON pg.id = pgi.group_id 
       WHERE pg.company_id = ? AND pgi.sku = ?`
    )
      .bind(companyId, sku)
      .first();

    if (existingInAnyGroup) {
      return c.json({ 
        error: `Este produto já está vinculado ao grupo "${existingInAnyGroup.group_name}"` 
      }, 400);
    }

    const result = await c.env.DB.prepare(
      "INSERT INTO product_group_items (group_id, sku) VALUES (?, ?)"
    )
      .bind(groupId, sku)
      .run();

    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error("Error adding SKU to group:", error);
    return c.json({ error: "Erro ao adicionar SKU ao grupo" }, 500);
  }
});

// Remove SKU from group
app.delete("/groups/:id/items/:sku", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const groupId = c.req.param("id");
    const sku = c.req.param("sku");

    // Verify group belongs to company
    const group = await c.env.DB.prepare(
      "SELECT id FROM product_groups WHERE id = ? AND company_id = ?"
    )
      .bind(groupId, companyId)
      .first();

    if (!group) {
      return c.json({ error: "Grupo não encontrado" }, 404);
    }

    await c.env.DB.prepare(
      "DELETE FROM product_group_items WHERE group_id = ? AND sku = ?"
    )
      .bind(groupId, sku)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("Error removing SKU from group:", error);
    return c.json({ error: "Erro ao remover SKU do grupo" }, 500);
  }
});

// ============================================
// OPERATIONAL COST ANALYSIS
// ============================================

app.get("/analysis/:month", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const month = c.req.param("month");

    // Get operational expenses for the month
    const expense = await c.env.DB.prepare(
      "SELECT * FROM operational_expenses WHERE company_id = ? AND reference_month = ?"
    )
      .bind(companyId, month)
      .first();

    if (!expense) {
      return c.json({ error: "Nenhuma despesa cadastrada para este mês" }, 404);
    }

    // Get sales data from spreadsheet for the selected month
    const history = await c.env.DB.prepare(
      "SELECT month_year, month_label FROM spreadsheet_history ORDER BY month_year DESC"
    ).all();

    const availableMonths: string[] = [];
    let foundMonth = false;
    
    for (const record of history.results || []) {
      availableMonths.push(`${record.month_label} (${record.month_year})` as string);
      if (record.month_year === month) {
        foundMonth = true;
        break;
      }
    }

    if (!foundMonth) {
      if (availableMonths.length === 0) {
        return c.json({ 
          error: "Nenhuma planilha de vendas importada. Importe planilhas em Análise → Vendas por Variante primeiro." 
        }, 404);
      } else {
        return c.json({ 
          error: `Não há dados de vendas para ${month}. Meses disponíveis: ${availableMonths.join(", ")}. Verifique se importou a planilha corretamente em Vendas por Variante.` 
        }, 404);
      }
    }

    // Get sales data from the month with product type (aggregated by SKU)
    const salesData = await c.env.DB.prepare(
      `SELECT 
        sd.sku,
        COALESCE(p.name, MAX(sd.name)) as name,
        SUM(sd.units) as units,
        SUM(sd.revenue) as revenue,
        SUM(sd.revenue) / SUM(sd.units) as avg_price,
        p.product_type
       FROM spreadsheet_data sd
       LEFT JOIN products p ON sd.sku = p.sku AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       WHERE sd.month_year = ?
       GROUP BY sd.sku, p.product_type`
    )
      .bind(month)
      .all();

    if (!salesData.results || salesData.results.length === 0) {
      return c.json({ error: "Não há dados de vendas para este mês" }, 404);
    }

    // Get all product costs and types
    const products = await c.env.DB.prepare(
      "SELECT sku, name, cost_price, product_type FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL)"
    ).all();

    const productCostMap: Record<string, number> = {};
    const productTypeMap: Record<string, string> = {};
    (products.results || []).forEach((p: any) => {
      productCostMap[p.sku] = p.cost_price || 0;
      productTypeMap[p.sku] = p.product_type || "simple";
    });

    // Get all product groups with their type (needed for kit reconstruction)
    const groups = await c.env.DB.prepare(
      `SELECT g.id, g.group_name, g.spu, g.group_type, pgi.sku 
       FROM product_groups g 
       LEFT JOIN product_group_items pgi ON pgi.group_id = g.id 
       WHERE g.company_id = ?`
    )
      .bind(companyId)
      .all();

    // Build SKU to group map, group names map, SPU map, and group type map
    const skuToGroup: Record<string, number> = {};
    const groupNames: Record<number, string> = {};
    const groupSpus: Record<number, string> = {};
    const groupTypes: Record<number, string> = {};
    (groups.results || []).forEach((g: any) => {
      if (g.id && g.group_name) {
        groupNames[g.id] = g.group_name;
        groupTypes[g.id] = g.group_type || "variacao";
        if (g.spu) {
          groupSpus[g.id] = g.spu;
        }
      }
      if (g.sku) {
        skuToGroup[g.sku] = g.id;
      }
    });

    // Create a map to accumulate sales (will handle kit dismemberment)
    const productSalesMap = new Map<string, any>();

    // Initialize map with sales data
    for (const sale of salesData.results as any[]) {
      productSalesMap.set(sale.sku, {
        sku: sale.sku,
        name: sale.name,
        units: sale.units || 0,
        revenue: sale.revenue || 0,
        product_type: sale.product_type,
      });
    }

    // Track kit information for reconstruction
    const kitInfo: Record<string, any> = {};
    const kitsToRemove = new Set<string>();

    // Process kits: disassemble them and distribute to components
    for (const sale of salesData.results as any[]) {
      if (sale.product_type === "kit") {
        // Get kit components
        const kitComponents = await c.env.DB.prepare(
          `SELECT k.component_sku, k.quantity, p.cost_price
           FROM product_kit_items k
           LEFT JOIN products p ON k.component_sku = p.sku AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
           WHERE k.kit_sku = ?`
        )
          .bind(sale.sku)
          .all();

        if (!kitComponents.results || kitComponents.results.length === 0) {
          continue; // Kit without components, keep as is
        }

        // Calculate total kit cost
        let totalCost = 0;
        for (const component of kitComponents.results as any[]) {
          const cost = (component.cost_price || 0) * (component.quantity || 1);
          totalCost += cost;
        }

        if (totalCost === 0) {
          continue; // No cost defined, cannot distribute
        }

        const kitUnits = sale.units || 0;
        const kitRevenue = sale.revenue || 0;

        // Store kit info for potential reconstruction with group association
        const kitGroupId = skuToGroup[sale.sku];
        kitInfo[sale.sku] = {
          sku: sale.sku,
          name: sale.name,
          units: kitUnits,
          revenue: kitRevenue,
          cost: totalCost,
          groupId: kitGroupId || null,
          groupName: kitGroupId ? groupNames[kitGroupId] : null,
          groupSpu: kitGroupId ? groupSpus[kitGroupId] : null,
          groupType: kitGroupId ? groupTypes[kitGroupId] : null,
          components: (kitComponents.results as any[]).map((c: any) => ({
            sku: c.component_sku,
            quantity: c.quantity || 1,
            cost: (c.cost_price || 0) * (c.quantity || 1),
          })),
        };

        // Distribute revenue and units to components
        for (const component of kitComponents.results as any[]) {
          const componentCost = (component.cost_price || 0) * (component.quantity || 1);
          const percentage = componentCost / totalCost;

          // Allocated revenue for this component
          const allocatedRevenue = kitRevenue * percentage;

          // Units sold = component quantity × kit units
          const allocatedUnits = (component.quantity || 1) * kitUnits;

          // Get or create component entry
          const componentSku = component.component_sku;
          let componentData = productSalesMap.get(componentSku);

          if (!componentData) {
            // Component has no direct sales, create entry
            const componentProduct = await c.env.DB.prepare(
              `SELECT name FROM products WHERE sku = ? AND (is_deleted = 0 OR is_deleted IS NULL)`
            )
              .bind(componentSku)
              .first() as any;

            componentData = {
              sku: componentSku,
              name: componentProduct?.name || `Componente ${componentSku}`,
              units: 0,
              revenue: 0,
              product_type: "simple",
            };
            productSalesMap.set(componentSku, componentData);
          }

          // Add kit sales to component
          componentData.units += allocatedUnits;
          componentData.revenue += allocatedRevenue;
        }

        // Mark kit for removal
        kitsToRemove.add(sale.sku);
      }
    }

    // Remove kits from the map
    for (const kitSku of kitsToRemove) {
      productSalesMap.delete(kitSku);
    }

    // Convert map back to array for processing
    const processedSales = Array.from(productSalesMap.values());

    // Calculate weighted average cost for grouped products (using processed sales)
    const groupCosts: Record<number, { totalCost: number; totalUnits: number }> = {};

    processedSales.forEach((sale: any) => {
      const groupId = skuToGroup[sale.sku];
      if (groupId) {
        const cost = productCostMap[sale.sku] || 0;
        const units = Number(sale.units) || 0;
        if (!groupCosts[groupId]) {
          groupCosts[groupId] = { totalCost: 0, totalUnits: 0 };
        }
        groupCosts[groupId].totalCost += cost * units;
        groupCosts[groupId].totalUnits += units;
      }
    });

    // Calculate weighted average for each group
    const groupAvgCost: Record<number, number> = {};
    Object.entries(groupCosts).forEach(([groupId, data]) => {
      groupAvgCost[Number(groupId)] = data.totalUnits > 0 ? data.totalCost / data.totalUnits : 0;
    });

    // Build analysis data (using processed sales without kits)
    const analysisData: any[] = [];
    let totalCostTimesUnits = 0;

    processedSales.forEach((sale: any) => {
      const groupId = skuToGroup[sale.sku];
      let cost: number;

      if (groupId && groupAvgCost[groupId]) {
        // Use weighted average cost for grouped products
        cost = groupAvgCost[groupId];
      } else {
        // Use individual product cost
        cost = productCostMap[sale.sku] || 0;
      }

      const units = Number(sale.units) || 0;
      const costTimesUnits = cost * units;
      totalCostTimesUnits += costTimesUnits;

      analysisData.push({
        sku: sale.sku,
        name: sale.name,
        cost,
        units,
        costTimesUnits,
        groupId: groupId || null,
        groupName: groupId ? groupNames[groupId] : null,
        groupSpu: groupId && groupSpus[groupId] ? groupSpus[groupId] : null,
        groupType: groupId ? groupTypes[groupId] : null,
      });
    });

    // Calculate operational cost per product
    const totalExpenses = Number(expense.total_expenses) || 0;

    analysisData.forEach((item) => {
      const percentage = totalCostTimesUnits > 0 ? item.costTimesUnits / totalCostTimesUnits : 0;
      const allocatedExpense = totalExpenses * percentage;
      const operationalCostPerUnit = item.units > 0 ? allocatedExpense / item.units : 0;

      item.percentage = percentage;
      item.allocatedExpense = allocatedExpense;
      item.operationalCostPerUnit = operationalCostPerUnit;
    });

    return c.json({
      month,
      totalExpenses,
      totalCostTimesUnits,
      products: analysisData,
      kitInfo, // Include kit information for frontend reconstruction
    });
  } catch (error) {
    console.error("Error calculating analysis:", error);
    return c.json({ error: "Erro ao calcular análise" }, 500);
  }
});

export default app;
