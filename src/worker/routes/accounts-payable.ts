import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";
import { logTransactionHistory } from "../utils/transaction-history";

const app = new Hono<AppContext>();

// Create new account payable
app.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = getCompanyId(c);
    const body = await c.req.json();
    
    const {
      supplier_id,
      due_date,
      competence_date,
      description,
      reference,
      amount,
      category_id,
      category_details,
      cost_center,
      payment_method,
      bank_account,
      bank_account_id,
      installments, // Array of installment objects: [{ numero, valor, vencimento, descricao, referencia }]
    } = body;
    
    // If no bank_account_id provided, get the default bank account
    let finalBankAccountId = bank_account_id;
    let finalBankAccountName = bank_account;
    
    if (!finalBankAccountId) {
      const defaultBank = await db
        .prepare("SELECT id, account_name, bank_name FROM bank_accounts WHERE company_id = ? AND is_active = 1 AND is_default = 1")
        .bind(companyId)
        .first();
      
      if (defaultBank) {
        finalBankAccountId = defaultBank.id;
        finalBankAccountName = `${defaultBank.account_name} - ${defaultBank.bank_name}`;
      }
    }
    
    const isPaid = body.is_paid !== undefined ? (body.is_paid ? 1 : 0) : 0;
    
    // Handle installments
    if (installments && Array.isArray(installments) && installments.length > 0) {
      const totalInstallments = installments.length;
      let parentId = null;
      const createdIds = [];
      
      for (let i = 0; i < installments.length; i++) {
        const installment = installments[i];
        const installmentAmount = -Math.abs(parseFloat(installment.valor));
        const installmentDueDate = installment.vencimento;
        const installmentDescription = installment.descricao || description;
        const installmentReference = installment.referencia || reference;
        
        const result = await db
          .prepare(`
            INSERT INTO accounts_payable 
            (user_id, company_id, supplier_id, due_date, competence_date, description, reference, amount, 
             category_id, category_details, cost_center, payment_method, bank_account, bank_account_id, 
             is_paid, paid_date, parent_id, installment_number, total_installments)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            userId,
            companyId,
            supplier_id,
            installmentDueDate,
            competence_date || installmentDueDate,
            installmentDescription,
            installmentReference,
            installmentAmount,
            category_id,
            category_details,
            cost_center,
            payment_method,
            finalBankAccountName,
            finalBankAccountId,
            0, // installments are never created as paid
            null,
            parentId, // first installment has null, others reference first
            i + 1, // installment number
            totalInstallments
          )
          .run();
        
        const insertedId = result.meta.last_row_id as number;
        createdIds.push(insertedId);
        
        // First installment becomes the parent for the others
        if (i === 0) {
          parentId = insertedId;
        }
        
        // Log history for each installment
        await logTransactionHistory(db, {
          transactionType: 'expense',
          transactionId: insertedId,
          action: 'create',
          companyId,
          newValues: { 
            description: installmentDescription, 
            amount: installmentAmount, 
            due_date: installmentDueDate, 
            installment_number: i + 1,
            total_installments: totalInstallments,
            origin: 'installment' 
          },
        });
      }
      
      return c.json({ success: true, ids: createdIds, installments_created: totalInstallments });
    }
    
    // Single account payable (no installments)
    const accountAmount = Math.abs(parseFloat(amount));

    const result = await db
      .prepare(`
        INSERT INTO accounts_payable 
        (user_id, company_id, supplier_id, due_date, competence_date, description, reference, amount, 
         category_id, category_details, cost_center, payment_method, bank_account, bank_account_id, is_paid, paid_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        userId,
        companyId,
        supplier_id,
        due_date,
        competence_date || due_date,
        description,
        reference,
        amount,
        category_id,
        category_details,
        cost_center,
        payment_method,
        finalBankAccountName,
        finalBankAccountId,
        isPaid,
        isPaid === 1 ? new Date().toISOString().split('T')[0] : null
      )
      .run();
    
    // If created as already paid, update bank balance
    if (isPaid === 1 && finalBankAccountId) {
      const bankAccount = await db
        .prepare("SELECT current_balance, overdraft_limit FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(finalBankAccountId, companyId)
        .first();
      
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
        const newBalance = currentBalance - accountAmount;
        await db
          .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newBalance, finalBankAccountId)
          .run();
      }
    }
    
    // Log history
    await logTransactionHistory(db, {
      transactionType: 'expense',
      transactionId: result.meta.last_row_id as number,
      action: 'create',
      companyId,
      newValues: { description, amount, due_date, is_paid: isPaid, origin: 'manual' },
    });
    
    return c.json({ success: true, id: result.meta.last_row_id });
  } catch (error) {
    console.error("Error creating account payable:", error);
    return c.json({ error: "Failed to create account payable" }, 500);
  }
});

// Get all accounts payable
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    
    const accounts = await db
      .prepare(`
        SELECT 
          ap.id,
          ap.due_date,
          ap.competence_date,
          ap.description,
          ap.category_id,
          ap.cost_center,
          ap.bank_account,
          ap.amount,
          ap.is_grouped,
          ap.order_ids,
          ap.total_pieces,
          ap.is_paid,
          ap.paid_date,
          ap.parent_id,
          ap.installment_number,
          ap.total_installments,
          s.company_name
        FROM accounts_payable ap
        LEFT JOIN suppliers s ON ap.supplier_id = s.id
        WHERE ap.company_id = ? AND ap.is_paid = 0
        ORDER BY ap.due_date ASC, ap.created_at DESC
      `)
      .bind(companyId)
      .all();
    
    // Calculate outstanding amount for each account
    const accountsWithOutstanding = [];
    for (const account of (accounts.results || [])) {
      const payments = await db
        .prepare("SELECT SUM(amount) as total FROM payment_records WHERE account_payable_id = ?")
        .bind(account.id)
        .first();
      
      const totalPaid = parseFloat(payments?.total as string) || 0;
      const outstandingAmount = parseFloat(account.amount as string) - totalPaid;
      
      accountsWithOutstanding.push({
        ...account,
        outstanding_amount: outstandingAmount,
        total_paid: totalPaid
      });
    }
    
    return c.json({ accounts: accountsWithOutstanding });
  } catch (error) {
    console.error("Error fetching accounts payable:", error);
    return c.json({ error: "Failed to fetch accounts payable" }, 500);
  }
});

// Mark account as paid
app.patch("/:id/pay", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    const body = await c.req.json();
    const { bank_account_id } = body;
    
    // Get the account details
    const account = await db
      .prepare("SELECT amount, bank_account_id FROM accounts_payable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    const accountAmount = Math.abs(parseFloat(account.amount as string));
    const finalBankId = bank_account_id || account.bank_account_id;
    
    // Validate balance if bank account is specified
    if (finalBankId) {
      const bankAccount = await db
        .prepare("SELECT current_balance, overdraft_limit FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(finalBankId, companyId)
        .first();
      
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
        const overdraftLimit = parseFloat(bankAccount.overdraft_limit as string) || 0;
        const availableBalance = currentBalance + overdraftLimit;
        
        if (accountAmount > availableBalance) {
          return c.json({ 
            error: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)} (Saldo: R$ ${currentBalance.toFixed(2)} + Limite: R$ ${overdraftLimit.toFixed(2)})` 
          }, 400);
        }
        
        // Update bank balance
        const newBalance = currentBalance - accountAmount;
        await db
          .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newBalance, finalBankId)
          .run();
      }
    }
    
    await db
      .prepare(`
        UPDATE accounts_payable 
        SET is_paid = 1, paid_date = DATE('now'), updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(accountId, companyId)
      .run();
    
    // Log history
    await logTransactionHistory(db, {
      transactionType: 'expense',
      transactionId: parseInt(accountId),
      action: 'pay',
      companyId,
      newValues: { is_paid: 1, paid_date: new Date().toISOString().split('T')[0] },
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking account as paid:", error);
    return c.json({ error: "Failed to mark account as paid" }, 500);
  }
});

// Mark account as unpaid
app.patch("/:id/unpay", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    
    // Get the account details to reverse the balance
    const account = await db
      .prepare("SELECT amount, bank_account_id FROM accounts_payable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    const accountAmount = Math.abs(parseFloat(account.amount as string));
    
    // Restore bank balance if bank account is specified
    if (account.bank_account_id) {
      const bankAccount = await db
        .prepare("SELECT current_balance FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(account.bank_account_id, companyId)
        .first();
      
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
        const newBalance = currentBalance + accountAmount;
        await db
          .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newBalance, account.bank_account_id)
          .run();
      }
    }
    
    await db
      .prepare(`
        UPDATE accounts_payable 
        SET is_paid = 0, paid_date = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(accountId, companyId)
      .run();
    
    // Log history
    await logTransactionHistory(db, {
      transactionType: 'expense',
      transactionId: parseInt(accountId),
      action: 'unpay',
      companyId,
      newValues: { is_paid: 0, paid_date: null },
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error marking account as unpaid:", error);
    return c.json({ error: "Failed to mark account as unpaid" }, 500);
  }
});

// Get single account payable with orders and payments
app.get("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    
    const account = await db
      .prepare(`
        SELECT 
          ap.*,
          s.company_name
        FROM accounts_payable ap
        LEFT JOIN suppliers s ON ap.supplier_id = s.id
        WHERE ap.id = ? AND ap.company_id = ?
      `)
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    // Get linked orders if grouped
    let orders = [];
    if (account.order_ids) {
      const orderIdsList = (account.order_ids as string).split(',');
      for (const orderId of orderIdsList) {
        const order = await db
          .prepare(`
            SELECT 
              o.id,
              o.order_number,
              o.total_amount,
              o.created_at,
              (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_items
            FROM orders o
            WHERE o.id = ?
          `)
          .bind(orderId)
          .first();
        
        if (order) {
          orders.push(order);
        }
      }
    }
    
    // Get payment records
    const payments = await db
      .prepare(`
        SELECT * FROM payment_records 
        WHERE account_payable_id = ?
        ORDER BY payment_date DESC, created_at DESC
      `)
      .bind(accountId)
      .all();
    
    return c.json({ 
      account,
      orders,
      payments: payments.results || []
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    return c.json({ error: "Failed to fetch account" }, 500);
  }
});

// Make payment on account payable
app.post("/:id/make-payment", async (c) => {
  try {
    const db = c.env.DB;
    const userId = c.get("userId");
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    const body = await c.req.json();
    
    const {
      bank_account_id,
      payment_type, // 'total' or 'parcial'
      juros = 0,
      desconto = 0,
      valor_pago,
      payment_date,
    } = body;
    
    // Get the account details
    const account = await db
      .prepare("SELECT * FROM accounts_payable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    const accountAmount = Math.abs(parseFloat(account.amount as string));
    const valorPago = parseFloat(valor_pago);
    
    // Validate balance in bank account
    const bankAccount = await db
      .prepare("SELECT current_balance, overdraft_limit, account_name, bank_name FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
      .bind(bank_account_id, companyId)
      .first();
    
    if (!bankAccount) {
      return c.json({ error: "Bank account not found" }, 404);
    }
    
    const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
    const overdraftLimit = parseFloat(bankAccount.overdraft_limit as string) || 0;
    const availableBalance = currentBalance + overdraftLimit;
    
    if (valorPago > availableBalance) {
      return c.json({ 
        error: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)}` 
      }, 400);
    }
    
    const bankAccountName = `${bankAccount.account_name} - ${bankAccount.bank_name}`;
    
    const paymentDateToUse = payment_date || new Date().toISOString().split('T')[0];
    
    if (payment_type === "total") {
      // Pagamento total - marca como pago
      const newBalance = currentBalance - valorPago;
      
      await db
        .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(newBalance, bank_account_id)
        .run();
      
      await db
        .prepare(`
          UPDATE accounts_payable 
          SET is_paid = 1, 
              paid_date = ?, 
              bank_account_id = ?,
              bank_account = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND company_id = ?
        `)
        .bind(paymentDateToUse, bank_account_id, bankAccountName, accountId, companyId)
        .run();
      
      // Log history
      await logTransactionHistory(db, {
        transactionType: 'expense',
        transactionId: parseInt(accountId),
        action: 'pay',
        companyId,
        newValues: { 
          is_paid: 1, 
          paid_date: paymentDateToUse,
          valor_pago: valorPago,
          juros,
          desconto,
        },
      });
    } else {
      // Pagamento parcial - cria registro de pagamento
      const newBalance = currentBalance - valorPago;
      
      await db
        .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(newBalance, bank_account_id)
        .run();
      
      await db
        .prepare(`
          INSERT INTO payment_records (
            user_id, account_payable_id, amount, payment_date, 
            payment_method, bank_account, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `)
        .bind(
          userId,
          accountId,
          valorPago,
          paymentDateToUse,
          account.payment_method || 'Transferência',
          bankAccountName,
          `Pagamento parcial. Juros: R$ ${juros.toFixed(2)}, Desconto: R$ ${desconto.toFixed(2)}`
        )
        .run();
      
      // Check if total paid equals or exceeds the account amount
      const payments = await db
        .prepare("SELECT SUM(amount) as total FROM payment_records WHERE account_payable_id = ?")
        .bind(accountId)
        .first();
      
      const totalPaid = parseFloat(payments?.total as string) || 0;
      
      if (totalPaid >= accountAmount) {
        // Mark as fully paid
        await db
          .prepare(`
            UPDATE accounts_payable 
            SET is_paid = 1, 
                paid_date = ?,
                bank_account_id = ?,
                bank_account = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND company_id = ?
          `)
          .bind(paymentDateToUse, bank_account_id, bankAccountName, accountId, companyId)
          .run();
      }
      
      // Log history
      await logTransactionHistory(db, {
        transactionType: 'expense',
        transactionId: parseInt(accountId),
        action: 'pay',
        companyId,
        newValues: { 
          valor_pago: valorPago,
          total_paid: totalPaid + valorPago,
        },
      });
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error making payment:", error);
    return c.json({ error: "Failed to make payment" }, 500);
  }
});

// Update account payable
app.put("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    const body = await c.req.json();
    
    const {
      supplier_id,
      due_date,
      competence_date,
      description,
      reference,
      amount,
      category_id,
      category_details,
      cost_center,
      payment_method,
      bank_account,
      bank_account_id,
    } = body;
    
    // Get old values for history
    const oldAccount = await db
      .prepare("SELECT * FROM accounts_payable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    await db
      .prepare(`
        UPDATE accounts_payable 
        SET supplier_id = ?, due_date = ?, competence_date = ?, description = ?, reference = ?,
            amount = ?, category_id = ?, category_details = ?, cost_center = ?, payment_method = ?,
            bank_account = ?, bank_account_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(
        supplier_id,
        due_date,
        competence_date,
        description,
        reference,
        amount,
        category_id,
        category_details,
        cost_center,
        payment_method,
        bank_account,
        bank_account_id,
        accountId,
        companyId
      )
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
      if (oldAccount.due_date !== due_date) {
        changedFields.push('due_date');
        oldValues.due_date = oldAccount.due_date;
        newValues.due_date = due_date;
      }
      if (oldAccount.category_id !== category_id) {
        changedFields.push('category_id');
        oldValues.category_id = oldAccount.category_id;
        newValues.category_id = category_id;
      }
      
      if (changedFields.length > 0) {
        await logTransactionHistory(db, {
          transactionType: 'expense',
          transactionId: parseInt(accountId),
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
    console.error("Error updating account:", error);
    return c.json({ error: "Failed to update account" }, 500);
  }
});

// Delete account
app.delete("/:id", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    
    // Get account data before deletion for history
    const account = await db
      .prepare("SELECT description, amount, is_paid, bank_account_id FROM accounts_payable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }
    
    // If account was paid, restore bank balance
    if (account.is_paid && account.bank_account_id) {
      const bankAccount = await db
        .prepare("SELECT current_balance FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(account.bank_account_id, companyId)
        .first();
      
      if (bankAccount) {
        const accountAmount = Math.abs(parseFloat(account.amount as string));
        const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
        const newBalance = currentBalance + accountAmount;
        
        await db
          .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newBalance, account.bank_account_id)
          .run();
      }
    } else if (!account.is_paid) {
      // If not fully paid, check for partial payments and restore those amounts
      const payments = await db
        .prepare("SELECT SUM(amount) as total FROM payment_records WHERE account_payable_id = ?")
        .bind(accountId)
        .first();
      
      const totalPaid = parseFloat(payments?.total as string) || 0;
      
      if (totalPaid > 0 && account.bank_account_id) {
        const bankAccount = await db
          .prepare("SELECT current_balance FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
          .bind(account.bank_account_id, companyId)
          .first();
        
        if (bankAccount) {
          const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
          const newBalance = currentBalance + totalPaid;
          
          await db
            .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(newBalance, account.bank_account_id)
            .run();
        }
      }
      
      // Delete payment records
      await db
        .prepare("DELETE FROM payment_records WHERE account_payable_id = ?")
        .bind(accountId)
        .run();
    }
    
    await db
      .prepare("DELETE FROM accounts_payable WHERE id = ? AND company_id = ?")
      .bind(accountId, companyId)
      .run();
    
    // Log history
    await logTransactionHistory(db, {
      transactionType: 'expense',
      transactionId: parseInt(accountId),
      action: 'delete',
      companyId,
      oldValues: { description: account.description, amount: account.amount },
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

export default app;
