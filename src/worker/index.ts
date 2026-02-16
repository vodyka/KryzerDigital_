import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth";
import { companyMiddleware } from "./middleware/company";
import { correlationMiddleware, errorHandler } from "./middleware/correlation";
import auth from "./routes/auth";
import products from "./routes/products";
import analytics from "./routes/analytics";
import suppliers from "./routes/suppliers";
import activity from "./routes/activity";
import portal from "./routes/portal";
import portalDashboard from "./routes/portal-dashboard";
import supplierProducts from "./routes/supplier-products";
import orders from "./routes/orders";
import orderReceipts from "./routes/order-receipts";
import exportTemplates from "./routes/export-templates";
import accountsPayable from "./routes/accounts-payable";
import accountsReceivable from "./routes/accounts-receivable";
import accountsReceivableReverse from "./routes/accounts-receivable-reverse";
import paymentRecords from "./routes/payment-records";
import bankAccounts from "./routes/bank-accounts";
import lancamentos from "./routes/lancamentos";
import ofxImport from "./routes/ofx-import";
import ofxImportParse from "./routes/ofx-import-parse";
import transactionHistory from "./routes/transaction-history";
import reconciliationSearch from "./routes/reconciliation-search";
import recurringTransactions from "./routes/recurring-transactions";
import financeiroDashboard from "./routes/financeiro-dashboard";
import financeiroProjection from "./routes/financeiro-projection";
import financeiroProjectionChart from "./routes/financeiro-projection-chart";
import supplierUnavailableItems from "./routes/supplier-unavailable-items";
import supplierForecast from "./routes/supplier-forecast";
import receiptErrors from "./routes/receipt-errors";
import purchaseOrderAnalytics from "./routes/purchase-order-analytics";
import supplierDistribution from "./routes/supplier-distribution";
import admin from "./routes/admin";
import collectionPoints from "./routes/collection-points";
import marketplaces from "./routes/marketplaces";
import adminCollectionPoints from "./routes/admin-collection-points";
import adminMarketplaces from "./routes/admin-marketplaces";
import adminSettings from "./routes/admin-settings";
import bannerSettings from "./routes/banner-settings";
import adminUpload from "./routes/admin-upload";
import adminTemplates from "./routes/admin-templates";
import adminMenuVisibility from "./routes/admin-menu-visibility";
import adminUsers from "./routes/admin-users";
import variationTemplate from "./routes/variation-template";
import kitTemplate from "./routes/kit-template";
import variationConfig from "./routes/variation-config";
import notifications from "./routes/notifications";
import operationalCost from "./routes/operational-cost";
import productImages from "./routes/product-images";
import files from "./routes/files";
import companies from "./routes/companies";
import contacts from "./routes/contacts";
import reconciliation from "./routes/reconciliation";
import mercadolivreIntegration from "./routes/mercadolivre-integration";
import mercadolivreItems from "./routes/mercadolivre-items";
import financeBanks from "./routes/finance-banks";
import financeCategories from "./routes/finance-categories";
import financePayables from "./routes/finance-payables";
import financePayments from "./routes/finance-payments";
import financeReceivables from "./routes/finance-receivables";
import financeReceipts from "./routes/finance-receipts";
import financeSuppliersClients from "./routes/finance-suppliers-clients";
import financeMigration from "./routes/finance-migration";
import inventory from "./routes/inventory-control";
import productMlMapping from "./routes/product-ml-mapping";
import mlAnalytics from "./routes/ml-analytics";

const app = new Hono<{ Bindings: Env }>();

// Apply correlation middleware to ALL routes (including public)
app.use("*", correlationMiddleware);

// Register error handler
app.onError(errorHandler);

// Register public routes BEFORE applying auth middleware
app.route("/api/auth", auth);
app.route("/api/files", files);
app.route("/api/portal", portal);
app.route("/api/products/images", productImages);
app.route("/api/variation-template", variationTemplate);

// Public ML integration route (connection link without auth) - must come BEFORE auth middleware
app.get("/api/integrations/mercadolivre/connect/:token", async (c) => {
  // This route is public and does not require authentication
  return mercadolivreIntegration.fetch(c.req.raw, c.env, c.executionCtx);
});

// Apply auth and company middleware to all protected routes
app.use("/api/*", authMiddleware);
app.use("/api/*", companyMiddleware);

app.route("/api/integrations/mercadolivre", mercadolivreIntegration);
app.route("/api/mercadolivre", mercadolivreItems);
app.route("/api/ml-analytics", mlAnalytics);
app.route("/api/companies", companies);
app.route("/api/finance/banks", financeBanks);
app.route("/api/finance/categories", financeCategories);
app.route("/api/finance/payables", financePayables);
app.route("/api/finance/payments", financePayments);
app.route("/api/finance/receivables", financeReceivables);
app.route("/api/finance/receipts", financeReceipts);
app.route("/api/finance/suppliers-clients", financeSuppliersClients);
app.route("/api/finance/migrate", financeMigration);
app.route("/api/contacts", contacts);
app.route("/api/notifications", notifications);
app.route("/api/inventory", inventory);
app.route("/api/product-ml-mapping", productMlMapping);
app.route("/api/products", products);
app.route("/api/analytics", analytics);
app.route("/api/suppliers", suppliers);
app.route("/api/activity", activity);
app.route("/api/portal-dashboard", portalDashboard);
app.route("/api/supplier-products", supplierProducts);
app.route("/api/orders", orders);
app.route("/api/order-receipts", orderReceipts);
app.route("/api/export-templates", exportTemplates);
app.route("/api/accounts-payable", accountsPayable);
app.route("/api/accounts-receivable", accountsReceivable);
app.route("/api/accounts-receivable", accountsReceivableReverse);
app.route("/api/payment-records", paymentRecords);
app.route("/api/bank-accounts", bankAccounts);
app.route("/api/lancamentos", lancamentos);
app.route("/api/ofx-import", ofxImport);
app.route("/api/ofx-import/parse", ofxImportParse);
app.route("/api/reconciliation", reconciliation);
app.route("/api/reconciliation/search", reconciliationSearch);
app.route("/api/transaction-history", transactionHistory);
app.route("/api/recurring-transactions", recurringTransactions);
app.route("/api/financeiro-dashboard", financeiroDashboard);
app.route("/api/financeiro-projection", financeiroProjection);
app.route("/api/financeiro-projection-chart", financeiroProjectionChart);
app.route("/api/supplier-unavailable-items", supplierUnavailableItems);
app.route("/api/supplier-forecast", supplierForecast);
app.route("/api/receipt-errors", receiptErrors);
app.route("/api/purchase-order-v3/analytics", purchaseOrderAnalytics);
app.route("/api/supplier-distribution", supplierDistribution);
app.route("/api/admin", admin);
app.route("/api/collection-points", collectionPoints);
app.route("/api/marketplaces", marketplaces);
app.route("/api/admin/collection-points", adminCollectionPoints);

// Additional collection point routes (not under /collection-points prefix)
app.get("/api/admin/collection-point-marketplaces", async (c) => {
  try {
    const token = c.req.header("Authorization")?.substring(7);
    if (!token?.startsWith("user_")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = token.substring(5);
    const result = await c.env.DB.prepare("SELECT id, is_admin FROM users WHERE id = ?").bind(userId).first();
    if (!result || (result as any).is_admin !== 1) {
      return c.json({ error: "Admin access required" }, 403);
    }

    const relations = await c.env.DB.prepare(
      `SELECT collection_point_id, marketplace_id, accepts_after_hours 
       FROM collection_point_marketplaces`
    ).all();

    return c.json({ relations: relations.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch collection point marketplaces:", error);
    return c.json({ error: "Failed to fetch marketplaces" }, 500);
  }
});

app.get("/api/admin/collection-point-schedules/:id", async (c) => {
  try {
    const token = c.req.header("Authorization")?.substring(7);
    if (!token?.startsWith("user_")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = token.substring(5);
    const result = await c.env.DB.prepare("SELECT id, is_admin FROM users WHERE id = ?").bind(userId).first();
    if (!result || (result as any).is_admin !== 1) {
      return c.json({ error: "Admin access required" }, 403);
    }

    const id = c.req.param("id");
    const schedules = await c.env.DB.prepare(
      `SELECT * FROM collection_point_schedules 
       WHERE collection_point_id = ? 
       ORDER BY day_of_week`
    ).bind(id).all();

    return c.json({ schedules: schedules.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch collection point schedules:", error);
    return c.json({ error: "Failed to fetch schedules" }, 500);
  }
});

app.get("/api/admin/collection-point-marketplace-schedules/:id", async (c) => {
  try {
    const token = c.req.header("Authorization")?.substring(7);
    if (!token?.startsWith("user_")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = token.substring(5);
    const result = await c.env.DB.prepare("SELECT id, is_admin FROM users WHERE id = ?").bind(userId).first();
    if (!result || (result as any).is_admin !== 1) {
      return c.json({ error: "Admin access required" }, 403);
    }

    const id = c.req.param("id");
    const schedules = await c.env.DB.prepare(
      `SELECT * FROM collection_point_marketplace_schedules 
       WHERE collection_point_id = ? 
       ORDER BY marketplace_id, day_of_week`
    ).bind(id).all();

    return c.json({ schedules: schedules.results || [] });
  } catch (error: any) {
    console.error("Failed to fetch marketplace schedules:", error);
    return c.json({ error: "Failed to fetch marketplace schedules" }, 500);
  }
});

app.route("/api/admin/marketplaces", adminMarketplaces);
app.route("/api/admin/settings", adminSettings);
app.route("/api/banner-settings", bannerSettings);
app.route("/api/admin/upload", adminUpload);
app.route("/api/admin/menu-visibility", adminMenuVisibility);
app.route("/api/admin/users", adminUsers);
app.route("/api/admin", adminTemplates);
app.route("/api/kit-template", kitTemplate);
app.route("/api/variation-config", variationConfig);
app.route("/api/operational-cost", operationalCost);

// Serve the React app for all other routes
app.get("*", (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kryzer Digital</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/react-app/main.tsx"></script>
  </body>
</html>`);
});

export default app;
