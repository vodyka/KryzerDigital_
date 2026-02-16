import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";
import { logTransactionHistory } from "../utils/transaction-history";

const accountsReceivableReverse = new Hono<AppContext>();

// Reverse a received payment (estornar)
accountsReceivableReverse.post("/:id/reverse", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const accountId = c.req.param("id");
    
    // Get the account details
    const account = await db
      .prepare("SELECT * FROM accounts_receivable WHERE id = ? AND company_id = ? AND is_paid = 1")
      .bind(accountId, companyId)
      .first();
    
    if (!account) {
      return c.json({ error: "Conta não encontrada ou não está recebida" }, 404);
    }
    
    const accountAmount = Math.abs(parseFloat(account.amount as string));
    
    // Update bank balance if bank account is specified
    if (account.bank_account_id) {
      const bankAccount = await db
        .prepare("SELECT current_balance FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(account.bank_account_id, companyId)
        .first();
      
      if (bankAccount) {
        const currentBalance = parseFloat(bankAccount.current_balance as string) || 0;
        const newBalance = currentBalance - accountAmount;
        await db
          .prepare("UPDATE bank_accounts SET current_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(newBalance, account.bank_account_id)
          .run();
      }
    }
    
    // Mark as not paid and clear paid_date
    await db
      .prepare(`
        UPDATE accounts_receivable 
        SET is_paid = 0, paid_date = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `)
      .bind(accountId, companyId)
      .run();
    
    // Log history
    await logTransactionHistory(db, {
      transactionType: 'income',
      transactionId: parseInt(accountId),
      action: 'reverse',
      companyId,
      newValues: { is_paid: 0, paid_date: null },
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error reversing payment:", error);
    return c.json({ error: "Erro ao estornar recebimento" }, 500);
  }
});

export default accountsReceivableReverse;
