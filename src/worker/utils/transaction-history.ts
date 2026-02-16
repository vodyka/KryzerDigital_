interface HistoryEntry {
  transactionType: 'income' | 'expense';
  transactionId: number;
  action: 'create' | 'update' | 'delete' | 'pay' | 'unpay' | 'receive' | 'reverse';
  changedFields?: string[];
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  companyId: number;
}

/**
 * Log a transaction history entry
 */
export async function logTransactionHistory(
  db: any,
  entry: HistoryEntry
): Promise<void> {
  try {
    await db
      .prepare(`
        INSERT INTO transaction_history 
        (company_id, transaction_type, transaction_id, action, changed_fields, old_values, new_values)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        entry.companyId,
        entry.transactionType,
        entry.transactionId,
        entry.action,
        entry.changedFields ? JSON.stringify(entry.changedFields) : null,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null
      )
      .run();
  } catch (error) {
    console.error("Error logging transaction history:", error);
  }
}

/**
 * Get transaction history
 */
export async function getTransactionHistory(
  db: any,
  companyId: number,
  limit: number = 100
): Promise<any[]> {
  try {
    const result = await db
      .prepare(`
        SELECT 
          th.*,
          CASE 
            WHEN th.transaction_type = 'income' THEN ar.description
            WHEN th.transaction_type = 'expense' THEN ap.description
          END as transaction_description,
          CASE 
            WHEN th.transaction_type = 'income' THEN ar.amount
            WHEN th.transaction_type = 'expense' THEN ap.amount
          END as transaction_amount
        FROM transaction_history th
        LEFT JOIN accounts_receivable ar 
          ON th.transaction_type = 'income' AND th.transaction_id = ar.id
        LEFT JOIN accounts_payable ap 
          ON th.transaction_type = 'expense' AND th.transaction_id = ap.id
        WHERE th.company_id = ?
        ORDER BY th.created_at DESC
        LIMIT ?
      `)
      .bind(companyId, limit)
      .all();

    return result.results || [];
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }
}
