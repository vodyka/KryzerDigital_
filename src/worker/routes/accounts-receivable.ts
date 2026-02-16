import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";
import { logTransactionHistory } from "../utils/transaction-history";

const accountsReceivable = new Hono<AppContext>();

accountsReceivable.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const status = c.req.query("status") || "pending"; // pending, received, all
    
    let query = `SELECT 
          id,
          receipt_date,
          paid_date,
          competence_date,
          customer_name,
          contact_id,
          description,
          category_id,
          cost_center,
          bank_account,
          amount,
          is_paid,
          created_at,
          updated_at
        FROM accounts_receivable
        WHERE company_id = ?`;
    
    if (status === "pending") {
      query += " AND is_paid = 0";
    } else if (status === "received") {
      query += " AND is_paid = 1";
    }
    // if status === "all", don't add filter
    
    query += " ORDER BY receipt_date DESC";
    
    const receivables = await db
      .prepare(query)
      .bind(companyId)
      .all();

    return c.json(receivables.results || []);
  } catch (error) {
    console.error("Error fetching accounts receivable:", error);
    return c.json({ error: "Failed to fetch accounts receivable" }, 500);
  }
});

accountsReceivable.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const userId = c.get("userId");
    const body = await c.req.json();
    
    const { receipt_date, competence_date, customer_name, contact_id, description, category_id, cost_center, bank_account, bank_account_id, amount, is_paid } = body;

    if (!receipt_date || !customer_name || !amount) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // If no bank_account_id provided, try to get the default bank account
    let finalBankAccountId = bank_account_id;
    let finalBankAccountName = bank_account;
    
    if (!finalBankAccountId && !finalBankAccountName) {
      const defaultBank = await db
        .prepare("SELECT id, account_name, bank_name FROM bank_accounts WHERE company_id = ? AND is_active = 1 AND is_default = 1")
        .bind(companyId)
        .first();
      
      if (defaultBank) {
        finalBankAccountId = defaultBank.id;
        finalBankAccountName = `${defaultBank.account_name} - ${defaultBank.bank_name}`;
      }
    }

    const isPaid = is_paid !== undefined ? (is_paid ? 1 : 0) : 0;
    const accountAmount = Math.abs(parseFloat(amount));
    const finalCompetenceDate = competence_date || receipt_date;
    const paidDate = isPaid === 1 ? receipt_date : null;

    const result = await db
      .prepare(
        `INSERT INTO accounts_receivable 
        (user_id, company_id, receipt_date, competence_date, paid_date, customer_name, contact_id, description, category_id, cost_center, bank_account, bank_account_id, amount, is_paid)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(userId, companyId, receipt_date, finalCompetenceDate, paidDate, customer_name, contact_id || null, description || "", category_id || null, cost_center || null, finalBankAccountName, finalBankAccountId, amount, isPaid)
      .run();

    // If created as already paid, update bank balance
    if (isPaid === 1 && finalBankAccountId) {
      const bankAccount = await db
        .prepare("SELECT current_balance FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(finalBankAccountId, companyId)
        .first();
      
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
        const newBalance = currentBalance + accountAmount;
        await db
          .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newBalance, finalBankAccountId)
          .run();
      }
    }

    // Log history
    await logTransactionHistory(db, {
      transactionType: 'income',
      transactionId: result.meta.last_row_id as number,
      action: 'create',
      companyId,
      newValues: { description, amount, receipt_date, is_paid: isPaid, origin: 'manual' },
    });

    return c.json({ id: result.meta.last_row_id, success: true }, 201);
  } catch (error) {
    console.error("Error creating account receivable:", error);
    return c.json({ error: "Failed to create account receivable" }, 500);
  }
});

accountsReceivable.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const id = c.req.param("id");

    const result = await db
      .prepare("SELECT * FROM accounts_receivable WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .first();

    if (!result) {
      return c.json({ error: "Account receivable not found" }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error("Error fetching account receivable:", error);
    return c.json({ error: "Failed to fetch account receivable" }, 500);
  }
});

accountsReceivable.put("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    
    const { receipt_date, customer_name, contact_id, description, category_id, cost_center, bank_account, bank_account_id, amount, is_paid } = body;

    if (!receipt_date || !customer_name || !amount) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Get old values for history
    const oldAccount = await db
      .prepare("SELECT * FROM accounts_receivable WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .first();

    await db
      .prepare(
        `UPDATE accounts_receivable 
        SET receipt_date = ?, customer_name = ?, contact_id = ?, description = ?, category_id = ?, 
            cost_center = ?, bank_account = ?, bank_account_id = ?, amount = ?, is_paid = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?`
      )
      .bind(receipt_date, customer_name, contact_id || null, description || "", category_id || null, cost_center || null, bank_account, bank_account_id, amount, is_paid !== undefined ? (is_paid ? 1 : 0) : 0, id, companyId)
      .run();

    // Log history
    const changedFields: string[] = [];
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};
    
    if (oldAccount) {
      if (oldAccount.description !== description) {
        changedFields.push('description');
        oldValues.description = oldAccount.description;
        newValues.description = description;
      }
      if (oldAccount.amount !== amount) {
        changedFields.push('amount');
        oldValues.amount = oldAccount.amount;
        newValues.amount = amount;
      }
      if (oldAccount.receipt_date !== receipt_date) {
        changedFields.push('receipt_date');
        oldValues.receipt_date = oldAccount.receipt_date;
        newValues.receipt_date = receipt_date;
      }
      if (oldAccount.category_id !== category_id) {
        changedFields.push('category_id');
        oldValues.category_id = oldAccount.category_id;
        newValues.category_id = category_id;
      }
      
      if (changedFields.length > 0) {
        await logTransactionHistory(db, {
          transactionType: 'income',
          transactionId: parseInt(id),
          action: 'update',
          companyId,
          changedFields,
          oldValues,
          newValues,
        });
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating account receivable:", error);
    return c.json({ error: "Failed to update account receivable" }, 500);
  }
});

// Receive payment with options (interest, discount, partial)
accountsReceivable.post("/:id/receive-payment", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const userId = c.get("userId");
    const accountId = c.req.param("id");
    const body = await c.req.json();
    const { bank_account_id, receipt_type, juros, desconto, valor_recebido } = body;
    
    // Get the account details
    const account = await db
      .prepare("SELECT * FROM accounts_receivable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    const valorOriginal = parseFloat(account.amount as string);
    
    // Get bank account info
    const bankAccount = await db
      .prepare("SELECT account_name, bank_name, current_balance FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
      .bind(bank_account_id, companyId)
      .first();
    
    if (!bankAccount) {
      return c.json({ error: "Bank account not found" }, 404);
    }
    
    const bankAccountName = `${bankAccount.account_name} - ${bankAccount.bank_name}`;
    
    if (receipt_type === "total") {
      // Recebimento total com juros/desconto
      const valorFinal = valorOriginal + (juros || 0) - (desconto || 0);
      
      // Update bank balance
      const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
      const newBalance = currentBalance + valorFinal;
      await db
        .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(newBalance, bank_account_id)
        .run();
      
      // Mark as paid
      await db
        .prepare(`
          UPDATE accounts_receivable 
          SET is_paid = 1, paid_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND company_id = ?
        `)
        .bind(accountId, companyId)
        .run();
      
      // Log history
      await logTransactionHistory(db, {
        transactionType: 'income',
        transactionId: parseInt(accountId),
        action: 'receive',
        companyId,
        newValues: { is_paid: 1, juros, desconto, valor_recebido: valorFinal },
      });
    } else {
      // Recebimento parcial
      const valorRestante = valorOriginal - valor_recebido;
      
      // Update bank balance
      const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
      const newBalance = currentBalance + valor_recebido;
      await db
        .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(newBalance, bank_account_id)
        .run();
      
      // Count existing partial payments for this account
      const existingPartials = await db
        .prepare(`
          SELECT COUNT(*) as count 
          FROM accounts_receivable 
          WHERE company_id = ? 
          AND (description LIKE ? OR description LIKE ?)
          AND customer_name = ?
          AND is_paid = 1
        `)
        .bind(
          companyId,
          `%${account.customer_name}%parcial%`,
          `%parcial%${account.customer_name}%`,
          account.customer_name
        )
        .first();
      
      const currentPartialNumber = (existingPartials?.count as number || 0) + 1;
      const totalPartialNumber = currentPartialNumber + 1;
      
      // Update descriptions of existing partial payments
      if (currentPartialNumber > 1) {
        await db
          .prepare(`
            UPDATE accounts_receivable 
            SET description = REPLACE(
              description, 
              'parcial ${currentPartialNumber - 1}/${currentPartialNumber}',
              'parcial ${currentPartialNumber - 1}/${totalPartialNumber}'
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? 
            AND customer_name = ?
            AND is_paid = 1
            AND description LIKE ?
          `)
          .bind(companyId, account.customer_name, `%parcial%`)
          .run();
      }
      
      // Create received partial record (mark as paid)
      const receivedDescription = account.description 
        ? `${account.description} - parcial ${currentPartialNumber}/${totalPartialNumber}`
        : `parcial ${currentPartialNumber}/${totalPartialNumber}`;
      
      await db
        .prepare(`
          INSERT INTO accounts_receivable 
          (user_id, company_id, receipt_date, competence_date, paid_date, customer_name, contact_id, description, category_id, cost_center, bank_account, bank_account_id, amount, is_paid)
          VALUES (?, ?, ?, ?, CURRENT_DATE, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `)
        .bind(
          userId,
          companyId,
          account.receipt_date,
          account.competence_date || account.receipt_date,
          account.customer_name,
          account.contact_id,
          receivedDescription,
          account.category_id,
          account.cost_center,
          bankAccountName,
          bank_account_id,
          valor_recebido
        )
        .run();
      
      // Update original account with remaining value and new description
      const remainingDescription = account.description
        ? `${account.description} - parcial ${totalPartialNumber}/${totalPartialNumber}`
        : `parcial ${totalPartialNumber}/${totalPartialNumber}`;
      
      await db
        .prepare(`
          UPDATE accounts_receivable 
          SET amount = ?, description = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND company_id = ?
        `)
        .bind(valorRestante, remainingDescription, accountId, companyId)
        .run();
      
      // Log history
      await logTransactionHistory(db, {
        transactionType: 'income',
        transactionId: parseInt(accountId),
        action: 'receive',
        companyId,
        newValues: { valor_recebido, valor_restante: valorRestante },
      });
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error receiving payment:", error);
    return c.json({ error: "Failed to receive payment" }, 500);
  }
});

// Mark account receivable as received
accountsReceivable.patch("/:id/receive", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    const body = await c.req.json();
    const { bank_account_id } = body;
    
    // Get the account details
    const account = await db
      .prepare("SELECT amount, bank_account FROM accounts_receivable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    const accountAmount = Math.abs(parseFloat(account.amount as string));
    
    // Update bank balance if bank account is specified
    if (bank_account_id) {
      const bankAccount = await db
        .prepare("SELECT current_balance FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(bank_account_id, companyId)
        .first();
      
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
        const newBalance = currentBalance + accountAmount;
        await db
          .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newBalance, bank_account_id)
          .run();
      }
    }
    
    await db
      .prepare(`
        UPDATE accounts_receivable 
        SET is_paid = 1, paid_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(accountId, companyId)
      .run();
    
    // Log history
    await logTransactionHistory(db, {
      transactionType: 'income',
      transactionId: parseInt(accountId),
      action: 'receive',
      companyId,
      newValues: { is_paid: 1 },
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking account as received:", error);
    return c.json({ error: "Failed to mark account as received" }, 500);
  }
});

accountsReceivable.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const id = c.req.param("id");

    // Get account data before deletion for history
    const account = await db
      .prepare("SELECT description, amount FROM accounts_receivable WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .first();

    await db
      .prepare("DELETE FROM accounts_receivable WHERE id = ? AND company_id = ?")
      .bind(id, companyId)
      .run();

    // Log history
    if (account) {
      await logTransactionHistory(db, {
        transactionType: 'income',
        transactionId: parseInt(id),
        action: 'delete',
        companyId,
        oldValues: { description: account.description, amount: account.amount },
      });
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting account receivable:", error);
    return c.json({ error: "Failed to delete account receivable" }, 500);
  }
});

export default accountsReceivable;
