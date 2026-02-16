import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";
import { getUserId } from "../middleware/auth";

const app = new Hono<AppContext>();

// Get all bank accounts
app.get("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    
    const accounts = await db
      .prepare(`
        SELECT * FROM bank_accounts 
        WHERE company_id = ? AND is_active = 1
        ORDER BY is_default DESC, created_at DESC
      `)
      .bind(companyId)
      .all();
    
    return c.json({ accounts: accounts.results || [] });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return c.json({ error: "Failed to fetch bank accounts" }, 500);
  }
});

// Create bank account
app.post("/", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const userId = getUserId(c);
    const db = c.env.DB;
    const body = await c.req.json();
    
    const {
      bank_code,
      bank_name,
      account_name,
      agency,
      account_number,
      account_digit,
      initial_balance,
      overdraft_limit,
      start_date,
    } = body;
    
    // Check if this will be the first account (auto-default)
    const existingAccounts = await db
      .prepare("SELECT COUNT(*) as count FROM bank_accounts WHERE company_id = ? AND is_active = 1")
      .bind(companyId)
      .first();
    
    const isFirstAccount = !existingAccounts || (existingAccounts.count as number) === 0;
    
    const result = await db
      .prepare(`
        INSERT INTO bank_accounts 
        (user_id, company_id, bank_code, bank_name, account_name, agency, account_number, 
         account_digit, initial_balance, current_balance, overdraft_limit, start_date, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        companyId,
        bank_code,
        bank_name,
        account_name,
        agency,
        account_number,
        account_digit,
        initial_balance || 0,
        initial_balance || 0,
        overdraft_limit || 0,
        start_date,
        isFirstAccount ? 1 : 0
      )
      .run();
    
    return c.json({ 
      success: true,
      id: result.meta.last_row_id,
      is_default: isFirstAccount
    });
  } catch (error) {
    console.error("Error creating bank account:", error);
    return c.json({ error: "Failed to create bank account" }, 500);
  }
});

// Update bank account
app.put("/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const accountId = c.req.param("id");
    const body = await c.req.json();
    
    const {
      bank_code,
      bank_name,
      account_name,
      agency,
      account_number,
      account_digit,
      initial_balance,
      overdraft_limit,
      start_date,
    } = body;
    
    // Get current balance to recalculate
    const currentAccount = await db
      .prepare("SELECT initial_balance, current_balance FROM bank_accounts WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!currentAccount) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    // Calculate the difference and update current balance
    const oldInitialBalance = parseFloat(currentAccount.initial_balance as string) || 0;
    const newInitialBalance = parseFloat(initial_balance) || 0;
    const currentBalance = parseFloat(currentAccount.current_balance as string) || 0;
    const balanceDifference = newInitialBalance - oldInitialBalance;
    const newCurrentBalance = currentBalance + balanceDifference;
    
    await db
      .prepare(`
        UPDATE bank_accounts 
        SET bank_code = ?, bank_name = ?, account_name = ?, agency = ?, 
            account_number = ?, account_digit = ?, initial_balance = ?, 
            current_balance = ?, overdraft_limit = ?, start_date = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(
        bank_code,
        bank_name,
        account_name,
        agency,
        account_number,
        account_digit,
        newInitialBalance,
        newCurrentBalance,
        overdraft_limit || 0,
        start_date,
        accountId,
        companyId
      )
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating bank account:", error);
    return c.json({ error: "Failed to update bank account" }, 500);
  }
});

// Set default bank account
app.patch("/:id/set-default", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const accountId = c.req.param("id");
    
    // Remove default from all accounts
    await db
      .prepare("UPDATE bank_accounts SET is_default = 0 WHERE company_id = ?")
      .bind(companyId)
      .run();
    
    // Set this account as default
    await db
      .prepare("UPDATE bank_accounts SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error setting default account:", error);
    return c.json({ error: "Failed to set default account" }, 500);
  }
});

// Validate if transaction is allowed (check balance + overdraft limit)
app.post("/validate-transaction", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const body = await c.req.json();
    
    const { bank_account_id, amount } = body;
    
    if (!bank_account_id) {
      return c.json({ error: "Bank account ID is required" }, 400);
    }
    
    const account = await db
      .prepare("SELECT current_balance, overdraft_limit FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
      .bind(bank_account_id, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Bank account not found" }, 404);
    }
    
    const currentBalance = parseFloat(account.current_balance as string) || 0;
    const overdraftLimit = parseFloat(account.overdraft_limit as string) || 0;
    const maxAllowedNegative = overdraftLimit;
    const newBalance = currentBalance - parseFloat(amount);
    
    const allowed = newBalance >= -maxAllowedNegative;
    
    return c.json({ 
      allowed,
      current_balance: currentBalance,
      overdraft_limit: overdraftLimit,
      new_balance: newBalance,
      available_limit: currentBalance + overdraftLimit,
      message: allowed ? "Transação permitida" : `Saldo insuficiente. Limite disponível: R$ ${(currentBalance + overdraftLimit).toFixed(2)}`
    });
  } catch (error) {
    console.error("Error validating transaction:", error);
    return c.json({ error: "Failed to validate transaction" }, 500);
  }
});

// Get default bank account
app.get("/default", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    
    const defaultAccount = await db
      .prepare("SELECT * FROM bank_accounts WHERE company_id = ? AND is_active = 1 AND is_default = 1")
      .bind(companyId)
      .first();
    
    return c.json({ account: defaultAccount || null });
  } catch (error) {
    console.error("Error fetching default account:", error);
    return c.json({ error: "Failed to fetch default account" }, 500);
  }
});

// Delete bank account (soft delete)
app.delete("/:id", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const accountId = c.req.param("id");
    
    // Check if it's the default account
    const account = await db
      .prepare("SELECT is_default FROM bank_accounts WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    await db
      .prepare("UPDATE bank_accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .run();
    
    // If it was the default, set another account as default
    if (account.is_default) {
      const otherAccount = await db
        .prepare("SELECT id FROM bank_accounts WHERE company_id = ? AND is_active = 1 LIMIT 1")
        .bind(companyId)
        .first();
      
      if (otherAccount) {
        await db
          .prepare("UPDATE bank_accounts SET is_default = 1 WHERE id = ?")
          .bind(otherAccount.id)
          .run();
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    return c.json({ error: "Failed to delete bank account" }, 500);
  }
});

export default app;
