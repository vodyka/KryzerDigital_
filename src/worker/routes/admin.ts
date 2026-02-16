import { Hono } from "hono";
import { verifyAdminAccess } from "./admin-verify";

const admin = new Hono<{ Bindings: Env }>();

// Verify admin access
admin.get("/verify", verifyAdminAccess);

export default admin;
