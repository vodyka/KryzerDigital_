import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";
import { getUserId } from "../middleware/auth";
import { parseOFX, validateOFX, type OFXData } from "../utils/ofx-parser";
import { logTransactionHistory } from "../utils/transaction-history";

const app = new Hono<AppContext>();

// Import OFX file
app.post("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    const userId = getUserId(c);
    const body = await c.req.json();
    
    const { fileContent, bankAccountId } = body;

    if (!fileContent) {
      return c.json({ error: "Conteúdo do arquivo não fornecido" }, 400);
    }

    // Validate OFX content
    const validation = validateOFX(fileContent);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    // Parse OFX
    let ofxData: OFXData;
    try {
      ofxData = parseOFX(fileContent);
    } catch (error) {
      console.error("Error parsing OFX:", error);
      return c.json({ error: "Erro ao processar arquivo OFX" }, 400);
    }

    if (ofxData.transactions.length === 0) {
      return c.json({ error: "Nenhuma transação encontrada no arquivo" }, 400);
    }

    // Get bank account info if provided
    let bankAccount = null;
    if (bankAccountId) {
      bankAccount = await db
        .prepare("SELECT id, account_name, bank_name FROM bank_accounts WHERE id = ? AND company_id = ? AND is_active = 1")
        .bind(bankAccountId, companyId)
        .first();
    }

    // Import transactions
    const results = {
      total: ofxData.transactions.length,
      imported: 0,
      duplicates: 0,
      errors: 0,
      transactions: [] as any[],
    };

    for (const transaction of ofxData.transactions) {
      try {
        // Check for duplicate using FITID if available
        if (transaction.fitid) {
          const existing = await db
            .prepare(`
              SELECT id FROM accounts_payable 
              WHERE company_id = ? AND reference = ? 
              UNION
              SELECT id FROM accounts_receivable 
              WHERE company_id = ? AND description LIKE ?
            `)
            .bind(companyId, transaction.fitid, companyId, `%${transaction.fitid}%`)
            .first();
          
          if (existing) {
            results.duplicates++;
            continue;
          }
        }

        const description = `${transaction.description}${transaction.memo ? ' - ' + transaction.memo : ''}`;
        const bankAccountName = bankAccount 
          ? `${bankAccount.account_name} - ${bankAccount.bank_name}` 
          : null;

        if (transaction.type === 'CREDIT') {
          // Create income (accounts receivable)
          const result = await db
            .prepare(`
              INSERT INTO accounts_receivable 
              (company_id, user_id, receipt_date, customer_name, description, bank_account, amount, is_paid, paid_date, bank_account_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              companyId,
              userId,
              transaction.date,
              'Cliente (importado)',
              description,
              bankAccountName || 'Importado OFX',
              transaction.amount,
              1, // Mark as paid since it's from bank statement
              transaction.date,
              bankAccountId || null
            )
            .run();
          
          results.transactions.push({
            id: result.meta.last_row_id,
            type: 'income',
            description,
            amount: transaction.amount,
            date: transaction.date,
          });

          // Log history
          await logTransactionHistory(db, {
            transactionType: 'income',
            transactionId: result.meta.last_row_id as number,
            action: 'create',
            companyId,
            newValues: { description, amount: transaction.amount, date: transaction.date, origin: 'import' },
          });
        } else {
          // Create expense (accounts payable)
          // Try to get a default supplier or create a generic one
          let supplierId = null;
          const defaultSupplier = await db
            .prepare("SELECT id FROM suppliers WHERE company_id = ? AND company_name = ?")
            .bind(companyId, 'Fornecedor (importado)')
            .first();
          
          if (defaultSupplier) {
            supplierId = defaultSupplier.id;
          } else {
            // Create generic supplier for imports
            const newSupplier = await db
              .prepare(`
                INSERT INTO suppliers 
                (company_id, user_id, person_type, company_name, trade_name, status)
                VALUES (?, ?, ?, ?, ?, ?)
              `)
              .bind(companyId, userId, 'PJ', 'Fornecedor (importado)', 'Fornecedor (importado)', 'Ativo')
              .run();
            supplierId = newSupplier.meta.last_row_id;
          }

          const result = await db
            .prepare(`
              INSERT INTO accounts_payable 
              (company_id, user_id, supplier_id, due_date, competence_date, description, reference, amount, 
               bank_account, bank_account_id, is_paid, paid_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              companyId,
              userId,
              supplierId,
              transaction.date,
              transaction.date,
              description,
              transaction.fitid || null,
              transaction.amount,
              bankAccountName,
              bankAccountId || null,
              1, // Mark as paid since it's from bank statement
              transaction.date
            )
            .run();
          
          results.transactions.push({
            id: result.meta.last_row_id,
            type: 'expense',
            description,
            amount: transaction.amount,
            date: transaction.date,
          });
        }

        results.imported++;
      } catch (error) {
        console.error("Error importing transaction:", error);
        results.errors++;
      }
    }

    return c.json({
      success: true,
      message: `Importação concluída: ${results.imported} transações importadas, ${results.duplicates} duplicadas, ${results.errors} erros`,
      results,
      accountInfo: {
        bankId: ofxData.bankId,
        accountId: ofxData.accountId,
        currency: ofxData.currency,
      }
    });
  } catch (error) {
    console.error("Error processing OFX import:", error);
    return c.json({ error: "Erro ao processar importação OFX" }, 500);
  }
});

export default app;
