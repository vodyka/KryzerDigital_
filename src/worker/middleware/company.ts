import { Context, Next } from "hono";
import type { AppContext } from "../types";

/**
 * Middleware to inject company_id into context
 * Gets the user's default company and adds it to the context
 */
export async function companyMiddleware(c: Context<AppContext>, next: Next) {
  const userId = c.get("userId");
  
  console.log("[Company Middleware] userId from context:", userId, "type:", typeof userId);
  
  if (userId) {
    try {
      const db = c.env.DB;
      
      // Get user's default company
      const result = await db
        .prepare(
          `SELECT company_id 
           FROM user_companies 
           WHERE user_id = ? AND is_default = 1
           LIMIT 1`
        )
        .bind(userId)
        .first();
      
      console.log("[Company Middleware] Query result:", result);
      
      if (result) {
        c.set("companyId", result.company_id as number);
        console.log("[Company Middleware] Set companyId:", result.company_id);
      } else {
        console.log("[Company Middleware] No default company found for user:", userId);
      }
    } catch (error) {
      console.error("[Company Middleware] Failed to load company context:", error);
    }
  } else {
    console.log("[Company Middleware] No userId in context");
  }
  
  await next();
}

/**
 * Helper function to get company_id from context
 * Throws error if not found (should not happen with middleware)
 */
export function getCompanyId(c: Context<AppContext>): number {
  const companyId = c.get("companyId");
  if (!companyId) {
    throw new Error("Company context not found");
  }
  return companyId;
}
