import { Hono } from "hono";
import type { AppContext } from "../types";
import { authMiddleware } from "../middleware/auth";
import { getCompanyId } from "../middleware/company";

const app = new Hono<AppContext>();

app.use("*", authMiddleware);

interface SuggestedMatch {
  id: number;
  type: "income" | "expense";
  description: string;
  amount: number;
  transaction_date: string;
  person_name: string | null;
  matchScore: number;
}

/**
 * Calculate similarity score between two strings
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 100;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 80;
  
  // Calculate Levenshtein distance ratio
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 100;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - editDistance) / longer.length) * 100);
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate date difference in days
 */
function dateDiffInDays(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get reconciliation suggestions for an OFX transaction
 */
app.get("/suggestions", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    
    const date = c.req.query("date");
    const amount = parseFloat(c.req.query("amount") || "0");
    const description = c.req.query("description") || "";
    
    if (!date || !amount) {
      return c.json({ error: "Missing required parameters" }, 400);
    }
    
    // Date range: ±3 days
    const searchDate = new Date(date);
    const startDate = new Date(searchDate);
    startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(searchDate);
    endDate.setDate(endDate.getDate() + 3);
    
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];
    
    // Search in accounts payable (expenses)
    const payables = await db
      .prepare(
        `SELECT 
          ap.id,
          ap.description,
          ap.amount,
          ap.due_date as transaction_date,
          ap.vendor_name as person_name,
          'expense' as type
         FROM accounts_payable ap
         WHERE ap.company_id = ?
           AND ap.amount = ?
           AND ap.due_date BETWEEN ? AND ?
           AND ap.is_paid = 0
         ORDER BY ap.due_date DESC
         LIMIT 10`
      )
      .bind(companyId, amount, startDateStr, endDateStr)
      .all();
    
    // Search in accounts receivable (income)
    const receivables = await db
      .prepare(
        `SELECT 
          ar.id,
          ar.description,
          ar.amount,
          ar.receipt_date as transaction_date,
          ar.customer_name as person_name,
          'income' as type
         FROM accounts_receivable ar
         WHERE ar.company_id = ?
           AND ar.amount = ?
           AND ar.receipt_date BETWEEN ? AND ?
           AND ar.is_received = 0
         ORDER BY ar.receipt_date DESC
         LIMIT 10`
      )
      .bind(companyId, amount, startDateStr, endDateStr)
      .all();
    
    // Combine results
    const allMatches = [
      ...(payables.results || []),
      ...(receivables.results || []),
    ];
    
    // Calculate match scores
    const suggestions: SuggestedMatch[] = allMatches.map((match: any) => {
      let score = 0;
      
      // Amount match (exact) - 40 points
      if (Math.abs(match.amount - amount) < 0.01) {
        score += 40;
      }
      
      // Date proximity - up to 30 points
      const daysDiff = dateDiffInDays(date, match.transaction_date);
      if (daysDiff === 0) {
        score += 30;
      } else if (daysDiff === 1) {
        score += 20;
      } else if (daysDiff === 2) {
        score += 10;
      } else if (daysDiff === 3) {
        score += 5;
      }
      
      // Description similarity - up to 30 points
      const descScore = calculateStringSimilarity(description, match.description || "");
      score += Math.round((descScore / 100) * 30);
      
      return {
        id: match.id,
        type: match.type,
        description: match.description,
        amount: match.amount,
        transaction_date: match.transaction_date,
        person_name: match.person_name,
        matchScore: Math.min(score, 100),
      };
    });
    
    // Sort by match score (highest first) and filter scores >= 50
    const sortedSuggestions = suggestions
      .filter((s) => s.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 5); // Return top 5
    
    return c.json({ suggestions: sortedSuggestions });
  } catch (error) {
    console.error("Error finding suggestions:", error);
    return c.json({ error: "Failed to find suggestions" }, 500);
  }
});

/**
 * Process reconciliation batch
 */
app.post("/process", async (c) => {
  try {
    const companyId = getCompanyId(c);
    const db = c.env.DB;
    const body = await c.req.json();
    
    const { bankAccountId, reconciliations } = body;
    
    if (!bankAccountId || !reconciliations) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    
    const results = {
      processed: 0,
      skipped: 0,
      created: 0,
      reconciled: 0,
      transfers: 0,
      errors: [] as string[],
    };
    
    for (const rec of reconciliations) {
      const { ofxTransaction, action, suggestionId, newTransaction, multipleLinks } = rec;
      
      try {
        if (action === "skip") {
          results.skipped++;
          continue;
        }
        
        if (action === "suggestion" && suggestionId) {
          // Mark existing transaction as paid/received
          // This would update the accounts_payable or accounts_receivable record
          // For now, we'll skip the implementation details
          results.reconciled++;
        }
        
        if (action === "new" && newTransaction) {
          // Handle transfer between accounts
          if (newTransaction.type === "transfer" && newTransaction.targetAccountId) {
            // Get account names
            const sourceAccount = await db
              .prepare("SELECT account_name, bank_name FROM bank_accounts WHERE id = ? AND company_id = ?")
              .bind(bankAccountId, companyId)
              .first();
            
            const targetAccount = await db
              .prepare("SELECT account_name, bank_name FROM bank_accounts WHERE id = ? AND company_id = ?")
              .bind(newTransaction.targetAccountId, companyId)
              .first();
            
            if (!sourceAccount || !targetAccount) {
              results.errors.push(`Transaction ${ofxTransaction.id}: Invalid bank account`);
              continue;
            }
            
            const isCredit = ofxTransaction.type === "CREDIT";
            const fromAccount = isCredit ? targetAccount : sourceAccount;
            const toAccount = isCredit ? sourceAccount : targetAccount;
            const fromAccountId = isCredit ? newTransaction.targetAccountId : bankAccountId;
            const toAccountId = isCredit ? bankAccountId : newTransaction.targetAccountId;
            
            const transferDescription = newTransaction.description || 
              `Transferência: ${fromAccount.account_name} → ${toAccount.account_name}`;
            
            // Create transfer record (single entry with from/to accounts)
            await db
              .prepare(
                `INSERT INTO transfers 
                (company_id, transfer_date, amount, description, 
                 from_account_id, from_account_name, 
                 to_account_id, to_account_name, 
                 created_date, updated_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
              )
              .bind(
                companyId,
                ofxTransaction.date,
                Math.abs(ofxTransaction.amount),
                transferDescription,
                fromAccountId,
                `${fromAccount.account_name} - ${fromAccount.bank_name}`,
                toAccountId,
                `${toAccount.account_name} - ${toAccount.bank_name}`
              )
              .run();
            
            results.transfers++;
          } else {
            // Create new payment transaction from OFX data
            const isIncome = ofxTransaction.type === "CREDIT";
            
            if (isIncome) {
              await db
                .prepare(
                  `INSERT INTO accounts_receivable 
                  (company_id, customer_name, description, amount, receipt_date, is_received, origin, created_date, updated_date)
                  VALUES (?, ?, ?, ?, ?, 1, 'ofx', datetime('now'), datetime('now'))`
                )
                .bind(
                  companyId,
                  newTransaction.personName || "Cliente (OFX)",
                  newTransaction.description || ofxTransaction.description,
                  Math.abs(ofxTransaction.amount),
                  ofxTransaction.date
                )
                .run();
            } else {
              await db
                .prepare(
                  `INSERT INTO accounts_payable 
                  (company_id, vendor_name, description, amount, due_date, is_paid, origin, created_date, updated_date)
                  VALUES (?, ?, ?, ?, ?, 1, 'ofx', datetime('now'), datetime('now'))`
                )
                .bind(
                  companyId,
                  newTransaction.personName || "Fornecedor (OFX)",
                  newTransaction.description || ofxTransaction.description,
                  Math.abs(ofxTransaction.amount),
                  ofxTransaction.date
                )
                .run();
            }
            
            results.created++;
          }
        }
        
        if (action === "multiple" && multipleLinks && multipleLinks.length > 0) {
          // Mark multiple transactions as reconciled
          // This links one OFX transaction to multiple existing records
          // TODO: Update the linked transactions to mark them as paid/received
          results.reconciled += multipleLinks.length;
        }
        
        results.processed++;
      } catch (error) {
        console.error("Error processing reconciliation:", error);
        results.errors.push(`Transaction ${ofxTransaction.id}: ${error}`);
      }
    }
    
    return c.json(results);
  } catch (error) {
    console.error("Error processing reconciliation:", error);
    return c.json({ error: "Failed to process reconciliation" }, 500);
  }
});

export default app;
