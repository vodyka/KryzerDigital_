import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

// POST migrate data from localStorage to database
app.post("/", async (c) => {
  try {
    const userId = c.get("userId");
    const companyId = c.get("companyId");
    const body = await c.req.json();

    const { banks, categories, transactions, suppliersClients } = body;

    let migratedCounts = {
      companies: 0,
      banks: 0,
      categories: 0,
      payables: 0,
      receivables: 0,
      contacts: 0,
      debts: 0,
    };

    // Migrate banks
    if (banks && Array.isArray(banks)) {
      for (const bank of banks) {
        if (bank.companyId === companyId) {
          await c.env.DB.prepare(
            `INSERT OR IGNORE INTO bank_accounts (
              company_id, user_id, bank_code, bank_name, account_name,
              agency, account_number, account_digit, initial_balance,
              current_balance, overdraft_limit, start_date, is_default, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              companyId,
              userId,
              bank.bankCode || "000",
              bank.bankName,
              bank.accountName,
              bank.agency || null,
              bank.accountNumber || null,
              bank.accountDigit || null,
              bank.initialBalance || 0,
              bank.currentBalance || bank.initialBalance || 0,
              bank.overdraftLimit || 0,
              bank.startDate || null,
              bank.isDefault ? 1 : 0,
              bank.isActive ? 1 : 0
            )
            .run();
          migratedCounts.banks++;
        }
      }
    }

    // Migrate categories
    if (categories && Array.isArray(categories)) {
      for (const category of categories) {
        if (category.companyId === companyId && !category.isNative) {
          await c.env.DB.prepare(
            `INSERT OR IGNORE INTO categories (
              company_id, name, type, parent_id, group_name, display_order, is_native
            ) VALUES (?, ?, ?, ?, ?, ?, 0)`
          )
            .bind(
              companyId,
              category.name,
              category.type,
              category.parentId || null,
              category.groupName || null,
              category.displayOrder || 0
            )
            .run();
          migratedCounts.categories++;
        }
      }
    }

    // Migrate suppliers/clients as contacts
    if (suppliersClients && Array.isArray(suppliersClients)) {
      for (const contact of suppliersClients) {
        if (contact.companyId === companyId) {
          // Map contact types
          const types = contact.contactTypes || [];
          let contactType = "cliente";
          if (types.includes("fornecedor")) contactType = "cliente"; // Use cliente as default
          if (types.includes("funcionario")) contactType = "funcionario";
          if (types.includes("socio")) contactType = "socio";

          await c.env.DB.prepare(
            `INSERT OR IGNORE INTO contacts (
              company_id, type, name, person_type, document, email, phone,
              address, city, state, zipcode, notes, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
          )
            .bind(
              companyId,
              contactType,
              contact.name,
              contact.documentType || null,
              contact.documentNumber || null,
              contact.email || null,
              contact.phone || null,
              contact.address || null,
              contact.city || null,
              contact.state || null,
              contact.postalCode || null,
              contact.notes || null
            )
            .run();
          migratedCounts.contacts++;
        }
      }
    }

    // Migrate transactions (payables and receivables)
    if (transactions && Array.isArray(transactions)) {
      for (const transaction of transactions) {
        if (transaction.companyId === companyId) {
          if (transaction.type === "despesa" && transaction.status !== "pago") {
            // Migrate as accounts_payable
            await c.env.DB.prepare(
              `INSERT OR IGNORE INTO accounts_payable (
                company_id, user_id, supplier_id, amount, due_date, competence_date,
                description, category_id, bank_account_id, payment_method, is_paid
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
            )
              .bind(
                companyId,
                userId,
                null,
                transaction.amount,
                transaction.dueDate || transaction.date,
                transaction.competenceDate || null,
                transaction.description || null,
                transaction.categoryId || null,
                transaction.bankAccountId || null,
                transaction.paymentMethod || null
              )
              .run();
            migratedCounts.payables++;
          } else if (transaction.type === "receita" && transaction.status !== "recebido") {
            // Migrate as accounts_receivable
            await c.env.DB.prepare(
              `INSERT OR IGNORE INTO accounts_receivable (
                company_id, user_id, receipt_date, customer_name, description,
                category_id, bank_account_id, amount, competence_date, is_paid
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
            )
              .bind(
                companyId,
                userId,
                transaction.dueDate || transaction.date,
                transaction.personName || "Cliente",
                transaction.description || null,
                transaction.categoryId || null,
                transaction.bankAccountId || null,
                transaction.amount,
                transaction.competenceDate || null
              )
              .run();
            migratedCounts.receivables++;
          }
        }
      }
    }

    return c.json({ success: true, migrated: migratedCounts });
  } catch (error: any) {
    console.error("Failed to migrate data:", error);
    return c.json({ error: "Failed to migrate data", details: error.message }, 500);
  }
});

export default app;
