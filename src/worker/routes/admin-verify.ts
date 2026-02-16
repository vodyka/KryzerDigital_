import { Context } from "hono";

export async function verifyAdminAccess(c: Context<{ Bindings: Env }>) {
  try {
    console.log("[Admin Verify] Starting verification");
    const authHeader = c.req.header("Authorization");
    console.log("[Admin Verify] Auth header exists:", !!authHeader);
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[Admin Verify] No valid auth header");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.substring(7);
    console.log("[Admin Verify] Token extracted:", token);

    // Extract user ID from local token format (user_123)
    if (!token.startsWith("user_")) {
      console.log("[Admin Verify] Invalid token format");
      return c.json({ error: "Invalid token" }, 401);
    }

    const userId = token.substring(5); // Remove "user_" prefix
    console.log("[Admin Verify] User ID:", userId);

    // Check if user exists and get admin status from database
    const result = await c.env.DB.prepare(
      "SELECT id, email, name, is_admin FROM users WHERE id = ?"
    )
      .bind(userId)
      .first();

    const typedResult = result as { id: number; email: string; name: string; is_admin: number } | null;
    console.log("[Admin Verify] DB result:", typedResult);

    if (!typedResult) {
      console.log("[Admin Verify] User not found");
      return c.json({ error: "User not found" }, 401);
    }

    const isAdmin = typedResult.is_admin === 1;
    console.log("[Admin Verify] isAdmin:", isAdmin);

    return c.json({
      is_admin: isAdmin,
      email: typedResult.email,
      name: typedResult.name,
    });
  } catch (error: any) {
    console.error("[Admin Verify] Error:", error);
    return c.json({ error: "Failed to verify admin access" }, 500);
  }
}
