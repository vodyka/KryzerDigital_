import { Hono } from "hono";
import type { AppContext } from "../types";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

// Get all transactions (unified view of payables and receivables)
app.get("/", async (c) => {
  try {
    const db = c.env.DB;
    const companyId = getCompanyId(c);
    
    console.log("Loading lancamentos for companyId:", companyId);
    
    // Get accounts payable
    const payables = await db
      .prepare(`
        SELECT 
          ap.id,
          'expense' as type,
          ap.due_date as transaction_date,
          ap.paid_date,
          ap.competence_date as created_date,
          ap.description,
          ap.category_id,
          ap.cost_center,
          ap.bank_account,
          ap.bank_account_id,
          ap.payment_method,
          ap.amount,
          ap.is_paid,
          s.company_name as person_name,
          'manual' as origin
        FROM accounts_payable ap
        LEFT JOIN suppliers s ON ap.supplier_id = s.id
        WHERE ap.company_id = ?
      `)
      .bind(companyId)
      .all();
    
    // Get accounts receivable
    const receivables = await db
      .prepare(`
        SELECT 
          ar.id,
          'income' as type,
          ar.receipt_date as transaction_date,
          CASE WHEN ar.is_paid = 1 THEN ar.receipt_date ELSE NULL END as paid_date,
          ar.created_at as created_date,
          ar.description,
          ar.category_id,
          ar.cost_center,
          ar.bank_account,
          NULL as bank_account_id,
          NULL as payment_method,
          ar.amount,
          ar.is_paid,
          ar.customer_name as person_name,
          'manual' as origin
        FROM accounts_receivable ar
        WHERE ar.company_id = ?
      `)
      .bind(companyId)
      .all();
    
    // Combine and process transactions
    const allTransactions = [
      ...(payables.results || []),
      ...(receivables.results || [])
    ];
    
    console.log("Loaded transactions count:", allTransactions.length);
    
    // Get payment records for each payable to calculate outstanding amounts
    const transactionsWithDetails = await Promise.all(
      allTransactions.map(async (transaction: any) => {
        let outstanding_amount = transaction.amount;
        let total_paid = 0;
        
        if (transaction.type === 'expense') {
          const payments = await db
            .prepare("SELECT SUM(amount) as total FROM payment_records WHERE account_payable_id = ?")
            .bind(transaction.id)
            .first();
          
          total_paid = parseFloat(payments?.total as string) || 0;
          outstanding_amount = parseFloat(transaction.amount as string) - total_paid;
        }
        
        // Get category name
        let category_name = null;
        if (transaction.category_id) {
          const category = await db
            .prepare("SELECT name FROM categories WHERE id = ?")
            .bind(transaction.category_id)
            .first();
          category_name = category?.name || null;
        }
        
        return {
          ...transaction,
          outstanding_amount,
          total_paid,
          category_name,
          status: transaction.is_paid ? (transaction.type === 'income' ? 'received' : 'paid') : 'pending'
        };
      })
    );
    
    // Sort by transaction date descending
    transactionsWithDetails.sort((a: any, b: any) => {
      const dateA = new Date(a.transaction_date as string).getTime();
      const dateB = new Date(b.transaction_date as string).getTime();
      return dateB - dateA;
    });
    
    // Calculate totals
    const totals = {
      total_income: 0,
      total_income_received: 0,
      total_income_pending: 0,
      count_income: 0,
      count_income_received: 0,
      count_income_pending: 0,
      total_expense: 0,
      total_expense_paid: 0,
      total_expense_pending: 0,
      count_expense: 0,
      count_expense_paid: 0,
      count_expense_pending: 0,
      balance: 0,
      balance_realized: 0,
      balance_pending: 0,
      total_count: 0,
    };
    
    transactionsWithDetails.forEach((t: any) => {
      const amount = Math.abs(parseFloat(t.amount as string));
      
      if (t.type === 'income') {
        totals.total_income += amount;
        totals.count_income++;
        if (t.is_paid) {
          totals.total_income_received += amount;
          totals.count_income_received++;
        } else {
          totals.total_income_pending += amount;
          totals.count_income_pending++;
        }
      } else {
        totals.total_expense += amount;
        totals.count_expense++;
        if (t.is_paid) {
          totals.total_expense_paid += amount;
          totals.count_expense_paid++;
        } else {
          totals.total_expense_pending += amount;
          totals.count_expense_pending++;
        }
      }
    });
    
    totals.balance = totals.total_income - totals.total_expense;
    totals.balance_realized = totals.total_income_received - totals.total_expense_paid;
    totals.balance_pending = totals.total_income_pending - totals.total_expense_pending;
    totals.total_count = transactionsWithDetails.length;
    
    return c.json({
      transactions: transactionsWithDetails,
      totals
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return c.json({ error: "Failed to fetch transactions" }, 500);
  }
});

export default app;
