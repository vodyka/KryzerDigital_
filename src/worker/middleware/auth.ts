import { Context, Next } from "hono";
import type { AppContext } from "../types";

/**
 * Extract and validate user ID from Authorization header
 * Expected format: "Bearer user_123"
 * Returns the user ID if valid, or throws an error
 */
export async function getUserIdFromToken(c: any): Promise<number> {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // Validate token format (user_123)
  if (!token.startsWith("user_")) {
    throw new Error("Invalid token format");
  }

  const userIdStr = token.substring(5); // Remove "user_"
  const userId = parseInt(userIdStr, 10);

  if (isNaN(userId)) {
    throw new Error("Invalid user ID in token");
  }

  // Verify user exists in database
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE id = ?"
  )
    .bind(userId)
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return userId;
}

/**
 * Get user ID from context (must be called after authMiddleware)
 */
export function getUserId(c: Context<AppContext>): number {
  const userId = c.get("userId");
  if (!userId) {
    throw new Error("User ID not found in context");
  }
  return userId;
}

/**
 * Middleware to extract user ID from token and set in context
 * Skips auth routes
 */
export async function authMiddleware(c: Context<AppContext>, next: Next) {
  // Skip auth for auth routes
  if (c.req.path.startsWith("/api/auth")) {
    return next();
  }

  try {
    const authHeader = c.req.header("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.substring(7);

    if (!token.startsWith("user_")) {
      return c.json({ error: "Invalid token format" }, 401);
    }

    const userIdStr = token.substring(5);
    const userId = parseInt(userIdStr, 10);

    if (isNaN(userId)) {
      return c.json({ error: "Invalid user ID" }, 401);
    }

    // Verify user exists
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE id = ?"
    )
      .bind(userId)
      .first();

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    c.set("userId", userId);
    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
}
