import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

// Get all recurring transactions
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    
    const recurring = await db
      .prepare(`
        SELECT 
          rt.*,
          CASE 
            WHEN rt.type = 'expense' THEN s.company_name
            ELSE rt.person_name
          END as person_name_display
        FROM recurring_transactions rt
        LEFT JOIN suppliers s ON rt.type = 'expense' AND rt.person_id = s.id
        WHERE rt.company_id = ?
        ORDER BY rt.is_active DESC, rt.created_at DESC
      `)
      .bind(companyId)
      .all();
    
    return c.json({ recurring: recurring.results || [] });
  } catch (error) {
    console.error("Error fetching recurring transactions:", error);
    return c.json({ error: "Failed to fetch recurring transactions" }, 500);
  }
});

// Create recurring transaction
app.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const body = await c.req.json();
    
    const {
      type,
      recurrence_type,
      description,
      amount,
      person_name,
      person_id,
      category_id,
      cost_center,
      bank_account,
      bank_account_id,
      payment_method,
      start_date,
      end_date,
      total_installments,
      day_of_month,
    } = body;
    
    const result = await db
      .prepare(`
        INSERT INTO recurring_transactions 
        (company_id, type, recurrence_type, description, amount, person_name, person_id,
         category_id, cost_center, bank_account, bank_account_id, payment_method,
         start_date, end_date, total_installments, day_of_month)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        companyId,
        type,
        recurrence_type,
        description,
        amount,
        person_name,
        person_id,
        category_id,
        cost_center,
        bank_account,
        bank_account_id,
        payment_method,
        start_date,
        end_date,
        total_installments,
        day_of_month
      )
      .run();
    
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error("Error creating recurring transaction:", error);
    return c.json({ error: "Failed to create recurring transaction" }, 500);
  }
});

// Generate transactions from recurring rules
app.post("/generate", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    
    // Get all active recurring transactions
    const recurring = await db
      .prepare(`
        SELECT * FROM recurring_transactions 
        WHERE company_id = ? AND is_active = 1
      `)
      .bind(companyId)
      .all();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let generated = 0;
    
    for (const rule of (recurring.results || [])) {
      const lastGenerated = rule.last_generated_date 
        ? new Date(rule.last_generated_date as string)
        : new Date(rule.start_date as string);
      lastGenerated.setHours(0, 0, 0, 0);
      
      if (rule.recurrence_type === 'monthly') {
        // Generate monthly recurring transactions
        let checkDate = new Date(lastGenerated);
        
        while (checkDate < today) {
          checkDate.setMonth(checkDate.getMonth() + 1);
          
          // Set to the correct day of month
          if (rule.day_of_month) {
            const targetDay = parseInt(rule.day_of_month as string);
            const lastDayOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
            checkDate.setDate(Math.min(targetDay, lastDayOfMonth));
          }
          
          // Check if this date is already past and within range
          if (checkDate <= today && (!rule.end_date || checkDate <= new Date(rule.end_date as string))) {
            if (rule.type === 'expense') {
              await db
                .prepare(`
                  INSERT INTO accounts_payable 
                  (company_id, supplier_id, due_date, competence_date, description, amount,
                   category_id, cost_center, bank_account, bank_account_id, payment_method, is_paid)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                `)
                .bind(
                  companyId,
                  rule.person_id,
                  checkDate.toISOString().split('T')[0],
                  checkDate.toISOString().split('T')[0],
                  rule.description,
                  rule.amount,
                  rule.category_id,
                  rule.cost_center,
                  rule.bank_account,
                  rule.bank_account_id,
                  rule.payment_method
                )
                .run();
            } else {
              await db
                .prepare(`
                  INSERT INTO accounts_receivable 
                  (company_id, receipt_date, customer_name, description, category_id,
                   cost_center, bank_account, amount)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .bind(
                  companyId,
                  checkDate.toISOString().split('T')[0],
                  rule.person_name,
                  rule.description,
                  rule.category_id,
                  rule.cost_center,
                  rule.bank_account,
                  rule.amount
                )
                .run();
            }
            
            generated++;
          }
        }
        
        // Update last generated date
        if (checkDate > lastGenerated) {
          await db
            .prepare("UPDATE recurring_transactions SET last_generated_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(checkDate.toISOString().split('T')[0], rule.id)
            .run();
        }
      } else if (rule.recurrence_type === 'installment') {
        // Generate installments
        const currentInstallment = parseInt(rule.current_installment as string) || 0;
        const totalInstallments = parseInt(rule.total_installments as string);
        
        if (currentInstallment < totalInstallments) {
          const startDate = new Date(rule.start_date as string);
          
          for (let i = currentInstallment; i < totalInstallments; i++) {
            const installmentDate = new Date(startDate);
            installmentDate.setMonth(installmentDate.getMonth() + i);
            
            if (rule.day_of_month) {
              const targetDay = parseInt(rule.day_of_month as string);
              const lastDayOfMonth = new Date(installmentDate.getFullYear(), installmentDate.getMonth() + 1, 0).getDate();
              installmentDate.setDate(Math.min(targetDay, lastDayOfMonth));
            }
            
            // Only generate if date is in the past or today
            if (installmentDate <= today) {
              const installmentAmount = parseFloat(rule.amount as string) / totalInstallments;
              const installmentDesc = `${rule.description} (${i + 1}/${totalInstallments})`;
              
              if (rule.type === 'expense') {
                await db
                  .prepare(`
                    INSERT INTO accounts_payable 
                    (company_id, supplier_id, due_date, competence_date, description, amount,
                     category_id, cost_center, bank_account, bank_account_id, payment_method, is_paid)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                  `)
                  .bind(
                    companyId,
                    rule.person_id,
                    installmentDate.toISOString().split('T')[0],
                    installmentDate.toISOString().split('T')[0],
                    installmentDesc,
                    installmentAmount,
                    rule.category_id,
                    rule.cost_center,
                    rule.bank_account,
                    rule.bank_account_id,
                    rule.payment_method
                  )
                  .run();
              } else {
                await db
                  .prepare(`
                    INSERT INTO accounts_receivable 
                    (company_id, receipt_date, customer_name, description, category_id,
                     cost_center, bank_account, amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                  `)
                  .bind(
                    companyId,
                    installmentDate.toISOString().split('T')[0],
                    rule.person_name,
                    installmentDesc,
                    rule.category_id,
                    rule.cost_center,
                    rule.bank_account,
                    installmentAmount
                  )
                  .run();
              }
              
              generated++;
              
              // Update current installment
              await db
                .prepare("UPDATE recurring_transactions SET current_installment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
                .bind(i + 1, rule.id)
                .run();
            } else {
              break;
            }
          }
          
          // Deactivate if all installments generated
          if (currentInstallment + generated >= totalInstallments) {
            await db
              .prepare("UPDATE recurring_transactions SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
              .bind(rule.id)
              .run();
          }
        }
      }
    }
    
    return c.json({ success: true, generated });
  } catch (error) {
    console.error("Error generating transactions:", error);
    return c.json({ error: "Failed to generate transactions" }, 500);
  }
});

// Update recurring transaction
app.put("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const {
      description,
      amount,
      person_name,
      person_id,
      category_id,
      cost_center,
      bank_account,
      bank_account_id,
      payment_method,
      day_of_month,
      is_active,
    } = body;
    
    await db
      .prepare(`
        UPDATE recurring_transactions 
        SET description = ?, amount = ?, person_name = ?, person_id = ?,
            category_id = ?, cost_center = ?, bank_account = ?, bank_account_id = ?,
            payment_method = ?, day_of_month = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(
        description,
        amount,
        person_name,
        person_id,
        category_id,
        cost_center,
        bank_account,
        bank_account_id,
        payment_method,
        day_of_month,
        is_active,
        id,
        companyId
      )
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating recurring transaction:", error);
    return c.json({ error: "Failed to update recurring transaction" }, 500);
  }
});

// Delete recurring transaction
app.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const id = c.req.param("id");
    
    await db
      .prepare("DELETE FROM recurring_transactions WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting recurring transaction:", error);
    return c.json({ error: "Failed to delete recurring transaction" }, 500);
  }
});

// Toggle active status
app.patch("/:id/toggle", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const id = c.req.param("id");
    
    const current = await db
      .prepare("SELECT is_active FROM recurring_transactions WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .first();
    
    if (!current) {
      return c.json({ error: "Recurring transaction not found" }, 404);
    }
    
    const newStatus = current.is_active ? 0 : 1;
    
    await db
      .prepare("UPDATE recurring_transactions SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
      .bind(newStatus, id, companyId)
      .run();
    
    return c.json({ success: true, is_active: newStatus });
  } catch (error) {
    console.error("Error toggling recurring transaction:", error);
    return c.json({ error: "Failed to toggle recurring transaction" }, 500);
  }
});

export default app;
