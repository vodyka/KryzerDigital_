import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

/**
 * Helper para pegar access_token da integração ativa
 */
async function getAccessToken(c: any, companyId: string) {
  const integration = await c.env.DB.prepare(`
    SELECT access_token
    FROM integrations_marketplace
    WHERE company_id = ? AND marketplace = 'mercadolivre' AND status = 'active'
    LIMIT 1
  `)
    .bind(companyId)
    .first();

  if (!integration) {
    return null;
  }

  return (integration as any).access_token;
}

/**
 * GET /items/:itemId
 * Busca dados completos do anúncio
 */
app.get("/items/:itemId", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const itemId = c.req.param("itemId");
    const companyId = String(c.get("companyId"));

    if (!companyId) {
      return c.json({ error: "Company não selecionada" }, 400);
    }

    // Verifica acesso do usuário à empresa
    const userCompany = await c.env.DB.prepare(
      "SELECT company_id FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
      .bind(userId, companyId)
      .first();

    if (!userCompany) {
      return c.json({ error: "Você não tem acesso a esta empresa" }, 403);
    }

    const accessToken = await getAccessToken(c, companyId);
    if (!accessToken) {
      return c.json({ error: "Integração não conectada", code: "integration_not_connected" }, 401);
    }

    // Busca item do Mercado Livre
    const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return c.json(
        { error: "Erro ao buscar anúncio", detail: errorText, status: response.status },
        response.status as any
      );
    }

    const data = await response.json();
    return c.json(data as any);
  } catch (error) {
    console.error("[ML Items] Get error:", error);
    return c.json({ error: "Erro ao buscar anúncio" }, 500);
  }
});

/**
 * GET /items/:itemId/description
 * Busca descrição do anúncio
 */
app.get("/items/:itemId/description", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const itemId = c.req.param("itemId");
    const companyId = String(c.get("companyId"));

    if (!companyId) {
      return c.json({ error: "Company não selecionada" }, 400);
    }

    const userCompany = await c.env.DB.prepare(
      "SELECT company_id FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
      .bind(userId, companyId)
      .first();

    if (!userCompany) {
      return c.json({ error: "Você não tem acesso a esta empresa" }, 403);
    }

    const accessToken = await getAccessToken(c, companyId);
    if (!accessToken) {
      return c.json({ error: "Integração não conectada", code: "integration_not_connected" }, 401);
    }

    const response = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return c.json(
        { error: "Erro ao buscar descrição", detail: errorText, status: response.status },
        response.status as any
      );
    }

    const data = await response.json();
    return c.json(data as any);
  } catch (error) {
    console.error("[ML Items] Get description error:", error);
    return c.json({ error: "Erro ao buscar descrição" }, 500);
  }
});

/**
 * PUT /items/:itemId
 * Atualiza dados do anúncio (title, price, available_quantity, status)
 */
app.put("/items/:itemId", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const itemId = c.req.param("itemId");
    const companyId = String(c.get("companyId"));

    if (!companyId) {
      return c.json({ error: "Company não selecionada" }, 400);
    }

    const userCompany = await c.env.DB.prepare(
      "SELECT company_id FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
      .bind(userId, companyId)
      .first();

    if (!userCompany) {
      return c.json({ error: "Você não tem acesso a esta empresa" }, 403);
    }

    const accessToken = await getAccessToken(c, companyId);
    if (!accessToken) {
      return c.json({ error: "Integração não conectada", code: "integration_not_connected" }, 401);
    }

    const body = await c.req.json();

    const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      return c.json(
        {
          error: "Erro ao atualizar anúncio",
          detail: errorData,
          status: response.status,
        },
        response.status as any
      );
    }

    const data = await response.json();
    return c.json(data as any);
  } catch (error) {
    console.error("[ML Items] Update error:", error);
    return c.json({ error: "Erro ao atualizar anúncio" }, 500);
  }
});

/**
 * PUT /items/:itemId/variations/:variationId
 * Atualiza variação específica (price, available_quantity)
 */
app.put("/items/:itemId/variations/:variationId", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const itemId = c.req.param("itemId");
    const variationId = c.req.param("variationId");
    const companyId = String(c.get("companyId"));

    if (!companyId) {
      return c.json({ error: "Company não selecionada" }, 400);
    }

    const userCompany = await c.env.DB.prepare(
      "SELECT company_id FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
      .bind(userId, companyId)
      .first();

    if (!userCompany) {
      return c.json({ error: "Você não tem acesso a esta empresa" }, 403);
    }

    const accessToken = await getAccessToken(c, companyId);
    if (!accessToken) {
      return c.json({ error: "Integração não conectada", code: "integration_not_connected" }, 401);
    }

    const body = await c.req.json();

    const response = await fetch(
      `https://api.mercadolibre.com/items/${itemId}/variations/${variationId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      return c.json(
        {
          error: "Erro ao atualizar variação",
          detail: errorData,
          status: response.status,
        },
        response.status as any
      );
    }

    const data = await response.json();
    return c.json(data as any);
  } catch (error) {
    console.error("[ML Items] Update variation error:", error);
    return c.json({ error: "Erro ao atualizar variação" }, 500);
  }
});

/**
 * PUT /items/:itemId/description
 * Atualiza descrição do anúncio
 */
app.put("/items/:itemId/description", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const itemId = c.req.param("itemId");
    const companyId = String(c.get("companyId"));

    if (!companyId) {
      return c.json({ error: "Company não selecionada" }, 400);
    }

    const userCompany = await c.env.DB.prepare(
      "SELECT company_id FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
      .bind(userId, companyId)
      .first();

    if (!userCompany) {
      return c.json({ error: "Você não tem acesso a esta empresa" }, 403);
    }

    const accessToken = await getAccessToken(c, companyId);
    if (!accessToken) {
      return c.json({ error: "Integração não conectada", code: "integration_not_connected" }, 401);
    }

    const body = await c.req.json();

    const response = await fetch(`https://api.mercadolibre.com/items/${itemId}/description`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Erro desconhecido" }));
      return c.json(
        {
          error: "Erro ao atualizar descrição",
          detail: errorData,
          status: response.status,
        },
        response.status as any
      );
    }

    const data = await response.json();
    return c.json(data as any);
  } catch (error) {
    console.error("[ML Items] Update description error:", error);
    return c.json({ error: "Erro ao atualizar descrição" }, 500);
  }
});

export default app;
