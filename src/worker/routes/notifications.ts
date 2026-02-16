import { Hono } from "hono";
import type { AppContext } from "../types";
import { getUserId } from "../middleware/auth";

const notifications = new Hono<AppContext>();

// Buscar notificações do usuário
notifications.get("/", async (c) => {
  try {
    const userId = getUserId(c);

    // Buscar notificações do usuário (ordenadas por mais recentes)
    const result = await c.env.DB.prepare(`
      SELECT id, title, message, type, is_read, related_entity_type, related_entity_id, created_at
      FROM admin_notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(userId).all();

    return c.json({ notifications: result.results || [] });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return c.json({ error: "Erro ao buscar notificações" }, 500);
  }
});

// Buscar quantidade de notificações não lidas
notifications.get("/unread-count", async (c) => {
  try {
    const userId = getUserId(c);

    // Contar notificações não lidas
    const result = await c.env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM admin_notifications
      WHERE user_id = ? AND is_read = 0
    `).bind(userId).first();

    return c.json({ count: result?.count || 0 });
  } catch (error) {
    console.error("Erro ao contar notificações:", error);
    return c.json({ error: "Erro ao contar notificações" }, 500);
  }
});

// Marcar todas como lidas
notifications.post("/mark-all-read", async (c) => {
  try {
    const userId = getUserId(c);

    // Marcar todas como lidas
    await c.env.DB.prepare(`
      UPDATE admin_notifications
      SET is_read = 1, updated_at = datetime('now')
      WHERE user_id = ? AND is_read = 0
    `).bind(userId).run();

    return c.json({ message: "Notificações marcadas como lidas" });
  } catch (error) {
    console.error("Erro ao marcar notificações:", error);
    return c.json({ error: "Erro ao marcar notificações" }, 500);
  }
});

// Marcar uma notificação específica como lida
notifications.post("/:id/read", async (c) => {
  try {
    const userId = getUserId(c);
    const notificationId = c.req.param("id");

    // Marcar como lida
    await c.env.DB.prepare(`
      UPDATE admin_notifications
      SET is_read = 1, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(notificationId, userId).run();

    return c.json({ message: "Notificação marcada como lida" });
  } catch (error) {
    console.error("Erro ao marcar notificação:", error);
    return c.json({ error: "Erro ao marcar notificação" }, 500);
  }
});

export default notifications;
