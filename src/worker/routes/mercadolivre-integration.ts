// @ts-nocheck
import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

/**
 * ⚠️ IMPORTANTE (por que estava "desconectando" em ~24h)
 * - O access_token do Mercado Livre expira em poucas horas.
 * - Para manter a integração funcionando por meses, você precisa usar o refresh_token
 *   e renovar o access_token automaticamente quando der 401.
 *
 * Este arquivo implementa:
 * ✅ Validade da INTEGRAÇÃO: 365 dias (expires_at)
 * ✅ Data de autenticação (último conectar/reconectar): connected_at
 * ✅ Refresh automático do access_token usando refresh_token quando necessário
 * ✅ Status "expired" calculado em tempo real (se expires_at < agora)
 */

type MLIntegrationRow = {
  id: string;
  company_id: string;
  user_id: string;
  marketplace: string;
  site: string | null;
  store_name: string | null;
  nickname: string | null;
  external_store_id: string | null;
  status: string;
  access_token: string | null;
  refresh_token: string | null;
  access_token_expires_at: string | null; // expiração real do access_token do ML
  connected_at: string | null; // último conectar/reconectar
  expires_at: string | null; // validade da integração (365d)
  created_at: string | null;
  updated_at: string | null;
};

function isoNow() {
  return new Date().toISOString();
}

function addDaysISO(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/**
 * Renova access_token via refresh_token e salva no DB.
 * Retorna o novo access_token.
 */
async function refreshAccessToken(
  c: any,
  integration: MLIntegrationRow
): Promise<string> {
  const { ML_CLIENT_ID, ML_CLIENT_SECRET } = c.env;
  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    throw new Error("config_incomplete");
  }

  if (!integration.refresh_token) {
    throw new Error("missing_refresh_token");
  }

  const resp = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
    }),
  });

  const txt = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.error("[ML refresh] failed:", resp.status, txt);
    throw new Error(`refresh_failed_${resp.status}`);
  }

  let data: any = {};
  try {
    data = txt ? JSON.parse(txt) : {};
  } catch {
    throw new Error("refresh_invalid_json");
  }

  const newAccess = String(data?.access_token || "");
  const newRefresh = data?.refresh_token ? String(data.refresh_token) : integration.refresh_token;
  const expiresInSec = Number(data?.expires_in || 0);
  const accessExp = expiresInSec
    ? new Date(Date.now() + expiresInSec * 1000).toISOString()
    : null;

  if (!newAccess) throw new Error("refresh_missing_access_token");

  await c.env.DB.prepare(
    `UPDATE integrations_marketplace
     SET access_token = ?, refresh_token = ?, access_token_expires_at = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(newAccess, newRefresh, accessExp, isoNow(), integration.id)
    .run();

  return newAccess;
}

/**
 * Fetch com retry automático:
 * - tenta com access_token atual
 * - se vier 401/403, tenta refresh_token e repete 1 vez
 */
async function mlFetchWithAutoRefresh(
  c: any,
  integration: MLIntegrationRow,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const doFetch = async (token: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  if (!integration.access_token) {
    throw new Error("missing_access_token");
  }

  let resp = await doFetch(integration.access_token);

  if (resp.status !== 401 && resp.status !== 403) return resp;

  // tenta refresh e refaz
  try {
    const newToken = await refreshAccessToken(c, integration);
    resp = await doFetch(newToken);
    return resp;
  } catch (err) {
    console.error("[ML auto-refresh] failed:", err);
    return resp; // devolve o 401/403 original
  }
}

/** valida que user tem acesso à company */
async function assertUserCompany(c: any, userId: string, companyId: string) {
  const uc = await c.env.DB.prepare(
    "SELECT company_id FROM user_companies WHERE user_id = ? AND company_id = ?"
  )
    .bind(userId, companyId)
    .first();
  if (!uc) return false;
  return true;
}

/** carrega integrações ML ativas (ou todas) */
async function getIntegrations(
  c: any,
  companyId: string,
  onlyActive = true
): Promise<MLIntegrationRow[]> {
  const q = onlyActive
    ? `SELECT * FROM integrations_marketplace
       WHERE company_id = ? AND marketplace = 'mercadolivre' AND status = 'active'
       ORDER BY created_at ASC`
    : `SELECT * FROM integrations_marketplace
       WHERE company_id = ? AND marketplace = 'mercadolivre'
       ORDER BY created_at DESC`;

  const r = await c.env.DB.prepare(q).bind(companyId).all();
  return (r.results || []) as any;
}

/**
 * POST /generate-connection-link
 * Gera um link de conexão temporário que pode ser usado sem login (1 hora)
 */
app.post("/generate-connection-link", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const body = await c.req.json().catch(() => ({} as any));
    const companyId = String(body?.companyId || "");
    if (!companyId) return c.json({ error: "companyId é obrigatório" }, 400);

    const ok = await assertUserCompany(c, userId, companyId);
    if (!ok) return c.json({ error: "Você não tem acesso a esta empresa" }, 403);

    const token = crypto.randomUUID();
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hora
    const now = isoNow();

    await c.env.DB.prepare(
      `INSERT INTO integration_connection_tokens (
        id, company_id, user_id, marketplace, token, expires_at, created_at, updated_at, used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
      .bind(id, companyId, userId, "mercadolivre", token, expiresAt, now, now)
      .run();

    const connectionUrl = `${new URL(c.req.url).origin}/integracoes/mercadolivre/connect/${token}`;
    return c.json({ url: connectionUrl, expiresAt });
  } catch (error) {
    console.error("[ML Integration] Error generating connection link:", error);
    return c.json({ error: "Erro ao gerar link de conexão" }, 500);
  }
});

/**
 * GET /connect/:token (público, sem autenticação)
 * Inicia OAuth usando token de conexão
 */
app.get("/connect/:token", async (c) => {
  try {
    const token = c.req.param("token");
    const now = isoNow();

    const tokenRecord = await c.env.DB.prepare(
      `SELECT id, company_id, user_id, used, expires_at
       FROM integration_connection_tokens
       WHERE token = ? AND used = 0 AND expires_at > ?`
    )
      .bind(token, now)
      .first();

    if (!tokenRecord) {
      return c.html(`
        <html>
          <body style="font-family: sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f3f4f6;">
            <div style="text-align:center; padding:2rem; background:white; border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="color:#ef4444;">❌ Link Inválido ou Expirado</h2>
              <p style="color:#6b7280;">Este link de conexão não é válido ou já expirou.</p>
              <p style="color:#9ca3af; font-size:0.875rem;">Solicite um novo link de conexão.</p>
            </div>
          </body>
        </html>
      `);
    }

    const { ML_CLIENT_ID, ML_REDIRECT_URI } = c.env;
    if (!ML_CLIENT_ID || !ML_REDIRECT_URI) {
      return c.json({ error: "Configuração incompleta" }, 500);
    }

    await c.env.DB.prepare(
      "UPDATE integration_connection_tokens SET used = 1, updated_at = ? WHERE id = ?"
    )
      .bind(now, (tokenRecord as any).id)
      .run();

    const stateObj = {
      companyId: (tokenRecord as any).company_id,
      userId: (tokenRecord as any).user_id,
      timestamp: Date.now(),
      fromToken: true,
    };
    const state = encodeURIComponent(btoa(JSON.stringify(stateObj)));

    const authUrl =
      `https://auth.mercadolivre.com.br/authorization` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(ML_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}` +
      `&state=${state}`;

    return c.redirect(authUrl);
  } catch (error) {
    console.error("[ML Integration] Error in connection link:", error);
    return c.json({ error: "Erro ao processar link de conexão" }, 500);
  }
});

/**
 * GET /start
 * Query: ?companyId=#
 */
app.get("/start", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const companyId = String(c.req.query("companyId") || "");
    if (!companyId) return c.json({ error: "companyId é obrigatório" }, 400);

    const ok = await assertUserCompany(c, userId, companyId);
    if (!ok) return c.json({ error: "Você não tem acesso a esta empresa" }, 403);

    const { ML_CLIENT_ID, ML_REDIRECT_URI } = c.env;
    if (!ML_CLIENT_ID || !ML_REDIRECT_URI) {
      return c.json({ error: "Configuração incompleta. Configure ML_CLIENT_ID e ML_REDIRECT_URI." }, 500);
    }

    const stateObj = { companyId, userId, timestamp: Date.now() };
    const state = encodeURIComponent(btoa(JSON.stringify(stateObj)));

    const authUrl =
      `https://auth.mercadolivre.com.br/authorization` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(ML_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}` +
      `&state=${state}`;

    return c.json({ url: authUrl });
  } catch (error) {
    console.error("[ML Integration] Error starting OAuth:", error);
    return c.json({ error: "Erro ao iniciar conexão" }, 500);
  }
});

/**
 * POST /finish
 * Body: { code, state }
 * ✅ Salva validade de 365 dias em expires_at
 * ✅ Salva connected_at = agora (data de autenticação)
 * ✅ Salva access_token_expires_at (expiração real do access_token)
 */
app.post("/finish", async (c) => {
  try {
    const userIdFromToken = String(c.get("userId"));
    const body = await c.req.json().catch(() => ({} as any));
    const code = String(body?.code || "");
    const stateRaw = String(body?.state || "");

    if (!code) return c.json({ error: "no_code" }, 400);
    if (!stateRaw) return c.json({ error: "invalid_state" }, 400);

    // decode state
    let stateDecodedStr = "";
    try {
      stateDecodedStr = atob(decodeURIComponent(stateRaw));
    } catch {
      try {
        stateDecodedStr = atob(stateRaw);
      } catch {
        return c.json({ error: "invalid_state" }, 400);
      }
    }

    let state: any;
    try {
      state = JSON.parse(stateDecodedStr);
    } catch {
      return c.json({ error: "invalid_state" }, 400);
    }

    const companyId = String(state?.companyId || "");
    const userIdInState = String(state?.userId || "");
    if (!companyId || !userIdInState) return c.json({ error: "invalid_state" }, 400);
    if (userIdInState !== userIdFromToken) return c.json({ error: "invalid_state_user" }, 403);

    const ok = await assertUserCompany(c, userIdFromToken, companyId);
    if (!ok) return c.json({ error: "invalid_user_company" }, 403);

    const { ML_CLIENT_ID, ML_CLIENT_SECRET, ML_REDIRECT_URI } = c.env;
    if (!ML_CLIENT_ID || !ML_CLIENT_SECRET || !ML_REDIRECT_URI) {
      return c.json({ error: "config_incomplete" }, 500);
    }

    // token exchange
    const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: ML_REDIRECT_URI,
      }),
    });

    const tokenTxt = await tokenResponse.text().catch(() => "");
    if (!tokenResponse.ok) {
      console.error("[ML finish] token_exchange_failed:", tokenResponse.status, tokenTxt);
      return c.json(
        { error: "token_exchange_failed", status: tokenResponse.status, detail: tokenTxt || "(sem body do Mercado Livre)" },
        400
      );
    }

    let tokenData: any = {};
    try {
      tokenData = tokenTxt ? JSON.parse(tokenTxt) : {};
    } catch (e) {
      console.error("[ML finish] token JSON parse failed:", e, tokenTxt);
      return c.json({ error: "token_exchange_failed", detail: "Resposta inválida do token endpoint", raw: tokenTxt }, 400);
    }

    const accessToken = String(tokenData?.access_token || "");
    const refreshToken = tokenData?.refresh_token ? String(tokenData.refresh_token) : null;
    const expiresInSec = Number(tokenData?.expires_in || 0);
    const accessTokenExpiresAt = expiresInSec
      ? new Date(Date.now() + expiresInSec * 1000).toISOString()
      : null;

    if (!accessToken) {
      console.error("[ML finish] token payload invalid:", tokenData);
      return c.json({ error: "token_exchange_failed", detail: "Sem access_token na resposta", raw: tokenTxt }, 400);
    }

    // user info
    const meResp = await fetch("https://api.mercadolibre.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const meTxt = await meResp.text().catch(() => "");
    if (!meResp.ok) {
      console.error("[ML finish] user_fetch_failed:", meResp.status, meTxt);
      return c.json({ error: "user_fetch_failed", status: meResp.status, detail: meTxt }, 400);
    }

    let me: any = {};
    try {
      me = meTxt ? JSON.parse(meTxt) : {};
    } catch {
      return c.json({ error: "user_fetch_failed", detail: "Resposta inválida do /users/me" }, 400);
    }

    const externalStoreId = String(me?.id || "");
    const storeName = String(me?.nickname || "Mercado Livre");
    const site = String(me?.site_id || "MLB");
    if (!externalStoreId) return c.json({ error: "user_fetch_failed", detail: "Sem id do usuário ML" }, 400);

    const now = isoNow();

    // ✅ validade da integração: 365 dias
    const integrationExpiresAt = addDaysISO(365);
    const connectedAt = now;

    const existing = await c.env.DB.prepare(
      `SELECT id, external_store_id
       FROM integrations_marketplace
       WHERE company_id = ? AND marketplace = 'mercadolivre' AND external_store_id = ?`
    )
      .bind(companyId, externalStoreId)
      .first();

    if (existing) {
      if ((existing as any).external_store_id !== externalStoreId) {
        return c.json(
          { error: "different_account", message: "Conta diferente da reconexão. Faça login na mesma conta do Mercado Livre no navegador." },
          400
        );
      }

      await c.env.DB.prepare(
        `UPDATE integrations_marketplace
         SET user_id = ?, site = ?, store_name = ?, status = 'active',
             access_token = ?, refresh_token = ?, access_token_expires_at = ?,
             connected_at = ?, expires_at = ?, updated_at = ?
         WHERE id = ?`
      )
        .bind(
          userIdFromToken,
          site,
          storeName,
          accessToken,
          refreshToken,
          accessTokenExpiresAt,
          connectedAt,
          integrationExpiresAt,
          now,
          (existing as any).id
        )
        .run();
    } else {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO integrations_marketplace (
          id, company_id, user_id, marketplace, site, store_name,
          external_store_id, status, access_token, refresh_token,
          access_token_expires_at, connected_at, expires_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          companyId,
          userIdFromToken,
          "mercadolivre",
          site,
          storeName,
          externalStoreId,
          "active",
          accessToken,
          refreshToken,
          accessTokenExpiresAt,
          connectedAt,
          integrationExpiresAt,
          now,
          now
        )
        .run();
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("[ML finish] callback_failed:", err);
    return c.json({ error: "callback_failed" }, 500);
  }
});

/**
 * GET /list
 * Query: ?companyId=#
 * Retorna integrações com status calculado em tempo real:
 * - se expires_at < agora => status_calc = 'expired'
 */
app.get("/list", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const companyId = String(c.req.query("companyId") || "");
    if (!companyId) return c.json({ error: "companyId é obrigatório" }, 400);

    const ok = await assertUserCompany(c, userId, companyId);
    if (!ok) return c.json({ error: "Você não tem acesso a esta empresa" }, 403);

    const r = await c.env.DB.prepare(
      `SELECT
        id, company_id, user_id, marketplace, site, store_name, external_store_id,
        status,
        expires_at, connected_at, created_at, updated_at,
        nickname
      FROM integrations_marketplace
      WHERE company_id = ? AND marketplace = 'mercadolivre'
      ORDER BY created_at DESC`
    )
      .bind(companyId)
      .all();

    const rows = (r.results || []) as any[];

    const enriched = rows.map((it) => {
      const expired = isExpired(it.expires_at);
      const status_calc = expired ? "expired" : String(it.status || "inactive");
      return { ...it, status_calc };
    });

    return c.json({ integrations: enriched });
  } catch (error) {
    console.error("[ML Integration] List error:", error);
    return c.json({ error: "Erro ao listar integrações" }, 500);
  }
});

/**
 * GET /listings
 * Query: ?companyId=# &integration_id=#
 */
app.get("/listings", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const companyId = String(c.req.query("companyId") || "");
    const integrationId = c.req.query("integration_id");

    if (!companyId) return c.json({ error: "companyId é obrigatório" }, 400);

    const ok = await assertUserCompany(c, userId, companyId);
    if (!ok) return c.json({ error: "Você não tem acesso a esta empresa" }, 403);

    let query = `
      SELECT
        ml.listing_id as id,
        ml.sku,
        ml.title,
        ml.subtitle,
        ml.price,
        ml.original_price as originalPrice,
        ml.available_quantity as availableQuantity,
        ml.sold_quantity as soldQuantity,
        ml.thumbnail,
        ml.permalink,
        ml.status,
        ml.listing_type as listingType,
        ml.category_id as categoryId,
        ml.category_name as categoryName,
        ml.free_shipping as freeShipping,
        ml.logistic_type as logisticType,
        ml.health,
        ml.store_name as storeName,
        ml.listing_created_at as createdAt,
        ml.listing_updated_at as updatedAt,
        ml.synced_at as syncedAt,
        ml.integration_id,
        CASE WHEN m_check.id IS NOT NULL THEN 1 ELSE 0 END as mapped,
        m_no_var.product_sku as user_product_id
      FROM marketplace_listings ml
      LEFT JOIN product_ml_mappings m_check
        ON ml.listing_id = m_check.ml_listing_id
        AND ml.company_id = m_check.company_id
      LEFT JOIN product_ml_mappings m_no_var
        ON ml.listing_id = m_no_var.ml_listing_id
        AND ml.company_id = m_no_var.company_id
        AND m_no_var.ml_variation_id IS NULL
      WHERE ml.company_id = ? AND ml.user_id = ?
    `;

    const params: any[] = [companyId, userId];
    if (integrationId) {
      query += ` AND ml.integration_id = ?`;
      params.push(integrationId);
    }
    query += ` ORDER BY ml.synced_at DESC`;

    const res = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ listings: res.results || [] });
  } catch (error) {
    console.error("[ML Integration] Listings error:", error);
    return c.json({ error: "Erro ao buscar anúncios" }, 500);
  }
});

/**
 * PUT /update-nickname
 * Body: { integrationId, nickname }
 */
app.put("/update-nickname", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const { integrationId, nickname } = await c.req.json();

    if (!integrationId) return c.json({ error: "ID da integração é obrigatório" }, 400);

    const integration = await c.env.DB.prepare(
      "SELECT id, company_id FROM integrations_marketplace WHERE id = ?"
    )
      .bind(integrationId)
      .first();

    if (!integration) return c.json({ error: "Integração não encontrada" }, 404);

    const ok = await assertUserCompany(c, userId, String((integration as any).company_id));
    if (!ok) return c.json({ error: "Você não tem acesso a esta integração" }, 403);

    await c.env.DB.prepare(
      `UPDATE integrations_marketplace
       SET nickname = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(nickname || null, isoNow(), integrationId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("[ML Integration] Update nickname error:", error);
    return c.json({ error: "Erro ao atualizar apelido" }, 500);
  }
});

/**
 * POST /disconnect
 * Body: { integrationId }
 */
app.post("/disconnect", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const { integrationId } = await c.req.json();

    if (!integrationId) return c.json({ error: "ID da integração é obrigatório" }, 400);

    const integration = await c.env.DB.prepare(
      "SELECT id, company_id FROM integrations_marketplace WHERE id = ?"
    )
      .bind(integrationId)
      .first();

    if (!integration) return c.json({ error: "Integração não encontrada" }, 404);

    const ok = await assertUserCompany(c, userId, String((integration as any).company_id));
    if (!ok) return c.json({ error: "Você não tem acesso a esta integração" }, 403);

    await c.env.DB.prepare(`DELETE FROM marketplace_listings WHERE integration_id = ?`)
      .bind(integrationId)
      .run();

    await c.env.DB.prepare(`DELETE FROM integrations_marketplace WHERE id = ?`)
      .bind(integrationId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error("[ML Integration] Disconnect error:", error);
    return c.json({ error: "Erro ao desconectar" }, 500);
  }
});

/**
 * POST /sync-listings
 * Query: ?companyId=#
 */
app.post("/sync-listings", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const companyId = String(c.req.query("companyId") || "");
    if (!companyId) return c.json({ error: "companyId é obrigatório" }, 400);

    const ok = await assertUserCompany(c, userId, companyId);
    if (!ok) return c.json({ error: "Você não tem acesso a esta empresa" }, 403);

    const integrations = await getIntegrations(c, companyId, true);

    if (integrations.length === 0) {
      return c.json({ error: "Nenhuma integração ativa encontrada" }, 404);
    }

    const now = isoNow();
    const allStoresListings: any[] = [];

    for (const integration of integrations) {
      // se integração vencida (365d), pula
      if (isExpired(integration.expires_at)) continue;

      const integrationId = integration.id;
      const sellerId = integration.external_store_id;
      const storeNickname = integration.nickname || integration.store_name || "Sem nome";

      if (!sellerId || !integration.access_token) continue;

      // busca IDs (paginado)
      let allItemIds: string[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const searchUrl = `https://api.mercadolibre.com/users/${sellerId}/items/search?status=active,paused&offset=${offset}&limit=${limit}`;
        const searchResp = await mlFetchWithAutoRefresh(c, integration, searchUrl);

        if (!searchResp.ok) {
          const errorText = await searchResp.text().catch(() => "");
          console.error(`[ML Sync] Search failed for seller ${sellerId}:`, searchResp.status, errorText);
          break;
        }

        const searchData = (await searchResp.json()) as any;
        const pageIds = searchData.results || [];
        if (pageIds.length === 0) {
          hasMore = false;
        } else {
          allItemIds = allItemIds.concat(pageIds);
          offset += limit;
          if (pageIds.length < limit) hasMore = false;
        }
      }

      if (allItemIds.length === 0) continue;

      // detalhes em lotes de 20
      const batchSize = 20;
      for (let i = 0; i < allItemIds.length; i += batchSize) {
        const batchIds = allItemIds.slice(i, i + batchSize);
        const itemIdsString = batchIds.join(",");
        const itemsUrl =
          `https://api.mercadolibre.com/items?ids=${itemIdsString}` +
          `&attributes=id,title,subtitle,price,original_price,base_price,available_quantity,thumbnail,permalink,sold_quantity,status,listing_type_id,shipping,health,date_created,last_updated,seller_custom_field,category_id,variations,prices`;

        const itemsResp = await mlFetchWithAutoRefresh(c, integration, itemsUrl);
        if (!itemsResp.ok) {
          const errorText = await itemsResp.text().catch(() => "");
          console.error(`[ML Sync] Items fetch failed for seller ${sellerId}:`, itemsResp.status, errorText);
          continue;
        }

        const itemsData = (await itemsResp.json()) as any;

        const batchListings = itemsData
          .filter((item: any) => item.code === 200)
          .map((item: any) => {
            const data = item.body;

            // SKU: tenta item.seller_custom_field, depois variações (primeira)
            let sku = data.seller_custom_field || "";
            if (!sku && Array.isArray(data.variations) && data.variations.length > 0) {
              sku = data.variations[0]?.seller_custom_field || "";
            }

            // Promo: detectar "preço de antes"
            let originalPrice = null;

            if (data.original_price && data.original_price > data.price) originalPrice = data.original_price;
            else if (data.base_price && data.base_price > data.price) originalPrice = data.base_price;

            if (!originalPrice && data.prices) {
              // prices pode vir array OU objeto
              if (Array.isArray(data.prices?.prices)) {
                const std = data.prices.prices.find((p: any) => p.type === "standard" || p.type === "original");
                if (std?.amount && std.amount > data.price) originalPrice = std.amount;
              } else if (Array.isArray(data.prices)) {
                const std = data.prices.find((p: any) => p.type === "standard" || p.type === "original");
                if (std?.amount && std.amount > data.price) originalPrice = std.amount;
              } else if (typeof data.prices === "object") {
                const std = data.prices.standard || data.prices.original_price || data.prices.list || data.prices.was;
                if (std?.amount && std.amount > data.price) originalPrice = std.amount;
              }
            }

            return {
              integrationId,
              id: data.id,
              sku,
              title: data.title,
              subtitle: data.subtitle || "",
              price: data.price,
              originalPrice,
              availableQuantity: data.available_quantity,
              soldQuantity: data.sold_quantity || 0,
              thumbnail: data.thumbnail,
              permalink: data.permalink,
              status: data.status,
              listingType: data.listing_type_id,
              categoryId: data.category_id || "",
              freeShipping: data.shipping?.free_shipping || false,
              logisticType: data.shipping?.logistic_type || "",
              health: data.health || 0,
              createdAt: data.date_created,
              updatedAt: data.last_updated,
              storeName: storeNickname,
            };
          });

        allStoresListings.push(...batchListings);
      }
    }

    // categorias
    const uniqueCategoryIds = [...new Set(allStoresListings.map((l) => l.categoryId).filter(Boolean))];
    const categoryNames: Record<string, string> = {};

    for (const categoryId of uniqueCategoryIds) {
      try {
        const resp = await fetch(`https://api.mercadolibre.com/categories/${categoryId}`);
        if (resp.ok) {
          const d = (await resp.json()) as any;
          categoryNames[categoryId] = d.name || categoryId;
        } else {
          categoryNames[categoryId] = categoryId;
        }
      } catch {
        categoryNames[categoryId] = categoryId;
      }
    }

    // UPSERT listings
    let savedCount = 0;
    for (const listing of allStoresListings) {
      const categoryName = categoryNames[listing.categoryId] || listing.categoryId || "Sem categoria";
      try {
        await c.env.DB.prepare(
          `INSERT INTO marketplace_listings (
            user_id, company_id, integration_id, listing_id, sku, title, subtitle,
            price, original_price, available_quantity, sold_quantity, thumbnail,
            permalink, status, listing_type, category_id, category_name,
            free_shipping, logistic_type, health, store_name,
            listing_created_at, listing_updated_at, synced_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(company_id, integration_id, listing_id) DO UPDATE SET
            sku = excluded.sku,
            title = excluded.title,
            subtitle = excluded.subtitle,
            price = excluded.price,
            original_price = excluded.original_price,
            available_quantity = excluded.available_quantity,
            sold_quantity = excluded.sold_quantity,
            thumbnail = excluded.thumbnail,
            permalink = excluded.permalink,
            status = excluded.status,
            listing_type = excluded.listing_type,
            category_id = excluded.category_id,
            category_name = excluded.category_name,
            free_shipping = excluded.free_shipping,
            logistic_type = excluded.logistic_type,
            health = excluded.health,
            store_name = excluded.store_name,
            listing_created_at = excluded.listing_created_at,
            listing_updated_at = excluded.listing_updated_at,
            synced_at = excluded.synced_at,
            updated_at = excluded.updated_at`
        )
          .bind(
            userId,
            companyId,
            listing.integrationId,
            listing.id,
            listing.sku || null,
            listing.title,
            listing.subtitle || null,
            listing.price,
            listing.originalPrice,
            listing.availableQuantity,
            listing.soldQuantity,
            listing.thumbnail || null,
            listing.permalink || null,
            listing.status,
            listing.listingType || null,
            listing.categoryId || null,
            categoryName,
            listing.freeShipping ? 1 : 0,
            listing.logisticType || null,
            listing.health,
            listing.storeName,
            listing.createdAt || null,
            listing.updatedAt || null,
            now,
            now,
            now
          )
          .run();

        savedCount++;
      } catch (err) {
        console.error(`[ML Sync] Erro ao salvar anúncio ${listing.id}:`, err);
      }
    }

    return c.json({ success: true, synced: savedCount, total: allStoresListings.length });
  } catch (error) {
    console.error("[ML Sync] Error:", error);
    return c.json({ error: "Erro ao sincronizar anúncios" }, 500);
  }
});

/**
 * GET /promotions
 * Query: ?companyId=#
 */
app.get("/promotions", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const companyId = String(c.req.query("companyId") || "");
    if (!companyId) return c.json({ error: "companyId é obrigatório" }, 400);

    const ok = await assertUserCompany(c, userId, companyId);
    if (!ok) return c.json({ error: "Você não tem acesso a esta empresa" }, 403);

    const integrations = await getIntegrations(c, companyId, true);
    if (integrations.length === 0) return c.json({ error: "Nenhuma integração ativa encontrada" }, 404);

    const allPromotions: any[] = [];

    for (const integration of integrations) {
      if (isExpired(integration.expires_at)) continue;

      const sellerId = integration.external_store_id;
      const storeNickname = integration.nickname || integration.store_name || "Sem nome";
      if (!sellerId || !integration.access_token) continue;

      const endpoints = [
        { name: "deals", url: `https://api.mercadolibre.com/deals/search?seller_id=${sellerId}` },
        { name: "campaigns", url: `https://api.mercadolibre.com/campaigns/search?seller_id=${sellerId}` },
        { name: "promotions_packs", url: `https://api.mercadolibre.com/promotions_packs/search?seller_id=${sellerId}` },
        { name: "items_with_promo", url: `https://api.mercadolibre.com/users/${sellerId}/items/search?status=active&has_promotions=true` },
      ];

      for (const endpoint of endpoints) {
        const resp = await mlFetchWithAutoRefresh(c, integration, endpoint.url);
        if (!resp.ok) continue;

        const data = (await resp.json()) as any;
        const results = data.results || data.deals || data.campaigns || data.items || [];

        if (!results?.length) continue;

        if (endpoint.name === "items_with_promo") {
          const itemsToFetch = results.slice(0, 50);
          for (const itemId of itemsToFetch) {
            const itemResp = await mlFetchWithAutoRefresh(c, integration, `https://api.mercadolibre.com/items/${itemId}`);
            if (!itemResp.ok) continue;
            const itemData = (await itemResp.json()) as any;

            const salePrice = itemData.sale_price || itemData.prices?.sale_price?.amount || null;
            const basePrice = itemData.base_price || itemData.original_price || itemData.price;

            let discount = 0;
            if (salePrice && basePrice && basePrice > salePrice) {
              discount = Math.round(((basePrice - salePrice) / basePrice) * 100);
            }

            allPromotions.push({
              id: itemData.deal_ids?.[0] || `promo-${itemData.id}`,
              name: itemData.title,
              date_from: itemData.start_time || itemData.date_created,
              date_to: itemData.stop_time || null,
              discount,
              status: itemData.status === "active" ? "active" : "finished",
              deal_type: "item_promotion",
              storeName: storeNickname,
              sellerId,
              source: endpoint.name,
              item_id: itemData.id,
              price: salePrice || itemData.price,
              original_price: basePrice,
              thumbnail: itemData.thumbnail,
            });
          }
        } else {
          for (const item of results) {
            allPromotions.push({ ...item, storeName: storeNickname, sellerId, source: endpoint.name });
          }
        }
      }
    }

    allPromotions.sort((a, b) => new Date(b.date_from || 0).getTime() - new Date(a.date_from || 0).getTime());
    return c.json({ promotions: allPromotions });
  } catch (err) {
    console.error("[ML Promotions] Error:", err);
    return c.json({ error: "Erro ao buscar promoções" }, 500);
  }
});

/**
 * GET /promotion/:dealId
 * Query: ?companyId=#
 */
app.get("/promotion/:dealId", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const companyId = String(c.req.query("companyId") || "");
    const dealId = c.req.param("dealId");

    if (!companyId) return c.json({ error: "companyId é obrigatório" }, 400);
    if (!dealId) return c.json({ error: "dealId é obrigatório" }, 400);

    const ok = await assertUserCompany(c, userId, companyId);
    if (!ok) return c.json({ error: "Você não tem acesso a esta empresa" }, 403);

    // pega 1 integração ativa
    const integrations = await getIntegrations(c, companyId, true);
    const integration = integrations.find((i) => !isExpired(i.expires_at));

    if (!integration || !integration.access_token) {
      return c.json({ error: "Nenhuma integração ativa encontrada" }, 404);
    }

    const resp = await mlFetchWithAutoRefresh(c, integration, `https://api.mercadolibre.com/deals/${dealId}`);
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("[ML Promotion Detail] Failed:", resp.status, t);
      return c.json({ error: "Erro ao buscar detalhes da promoção" }, 500);
    }

    const dealData = await resp.json();
    return c.json({ promotion: dealData });
  } catch (err) {
    console.error("[ML Promotion Detail] Error:", err);
    return c.json({ error: "Erro ao buscar detalhes da promoção" }, 500);
  }
});

export default app;
