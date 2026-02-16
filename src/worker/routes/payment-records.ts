import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

// Create payment record
app.post("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const body = await c.req.json();
    
    const {
      account_payable_id,
      amount,
      payment_date,
      payment_method,
      bank_account,
      notes,
    } = body;
    
    if (!account_payable_id || !amount || !payment_date) {
      return c.json({ error: "Account ID, amount, and payment date are required" }, 400);
    }
    
    // Verify account exists and belongs to company
    const account = await db
      .prepare("SELECT * FROM accounts_payable WHERE id = ? AND company_id = ?")
      .bind(account_payable_id, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    // Get total paid so far
    const paymentsSum = await db
      .prepare("SELECT SUM(amount) as total FROM payment_records WHERE account_payable_id = ?")
      .bind(account_payable_id)
      .first();
    
    const totalPaid = parseFloat(paymentsSum?.total as string) || 0;
    const newTotal = totalPaid + parseFloat(amount);
    const accountAmount = parseFloat(account.amount as string);
    
    // Validate payment doesn't exceed outstanding amount
    if (newTotal > accountAmount) {
      return c.json({ 
        error: `Valor excede o saldo devedor. Saldo atual: R$ ${(accountAmount - totalPaid).toFixed(2)}` 
      }, 400);
    }
    
    // Create payment record
    await db
      .prepare(`
        INSERT INTO payment_records (
          company_id, account_payable_id, amount, payment_date,
          payment_method, bank_account, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        companyId,
        account_payable_id,
        amount,
        payment_date,
        payment_method,
        bank_account,
        notes
      )
      .run();
    
    // Update account paid status if fully paid
    if (newTotal >= accountAmount) {
      await db
        .prepare(`
          UPDATE accounts_payable 
          SET is_paid = 1, paid_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(payment_date, account_payable_id)
        .run();
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error creating payment record:", error);
    return c.json({ error: "Failed to create payment record" }, 500);
  }
});

// Delete payment record
app.delete("/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const paymentId = c.req.param("id");
    
    // Get payment record
    const payment = await db
      .prepare("SELECT * FROM payment_records WHERE id = ? AND company_id = ?")
      .bind(paymentId, companyId)
      .first();
    
    if (!payment) {
      return c.json({ error: "Payment record not found" }, 404);
    }
    
    // Delete payment
    await db
      .prepare("DELETE FROM payment_records WHERE id = ?")
      .bind(paymentId)
      .run();
    
    // Recalculate account paid status
    const accountId = payment.account_payable_id;
    const account = await db
      .prepare("SELECT amount FROM accounts_payable WHERE id = ?")
      .bind(accountId)
      .first();
    
    const paymentsSum = await db
      .prepare("SELECT SUM(amount) as total FROM payment_records WHERE account_payable_id = ?")
      .bind(accountId)
      .first();
    
    const totalPaid = parseFloat(paymentsSum?.total as string) || 0;
    const accountAmount = parseFloat(account?.amount as string) || 0;
    
    if (totalPaid >= accountAmount) {
      await db
        .prepare(`
          UPDATE accounts_payable 
          SET is_paid = 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(accountId)
        .run();
    } else {
      await db
        .prepare(`
          UPDATE accounts_payable 
          SET is_paid = 0, paid_date = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .bind(accountId)
        .run();
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting payment record:", error);
    return c.json({ error: "Failed to delete payment record" }, 500);
  }
});

export default app;
