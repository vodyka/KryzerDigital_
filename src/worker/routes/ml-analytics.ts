import { Hono } from "hono";
import type { AppContext } from "../types";

const app = new Hono<AppContext>();

interface DailyData {
  date: string; // YYYY-MM-DD (America/Sao_Paulo)
  revenue: number;
  orders: number;
}

interface SummaryResponse {
  timezone: string;
  from: string;
  to: string;
  mode: "gross" | "net";
  totals: {
    revenue: number;
    orders: number;
    avg_ticket: number;
  };
  daily: DailyData[];
}

app.get("/summary", async (c) => {
  try {
    const userId = String(c.get("userId"));
    const companyId = c.req.query("companyId");
    const integrationId = c.req.query("integration_id") || ""; // vazio = todas
    const from = c.req.query("from"); // YYYY-MM-DD
    const to = c.req.query("to"); // YYYY-MM-DD
    const mode = (c.req.query("mode") || "gross") as "gross" | "net";

    if (!companyId || !from || !to) {
      return c.json({ error: "Parâmetros obrigatórios: companyId, from, to" }, 400);
    }

    // Verifica acesso à empresa
    const userCompany = await c.env.DB.prepare(
      "SELECT company_id FROM user_companies WHERE user_id = ? AND company_id = ?"
    )
      .bind(userId, companyId)
      .first();

    if (!userCompany) {
      return c.json({ error: "Você não tem acesso a esta empresa" }, 403);
    }

    // Datas no fuso -03:00 (SP)
    // Importante: vamos criar um range “fechado” de dia inteiro em São Paulo,
    // mas quando mandarmos pra API, mandamos ISO completo.
    const fromDate = new Date(`${from}T00:00:00-03:00`);
    const toDate = new Date(`${to}T23:59:59-03:00`);

    // Integrações
    let integrations: any[] = [];
    if (!integrationId || integrationId === "all") {
      const result = await c.env.DB.prepare(
        "SELECT id, access_token, nickname, store_name FROM integrations_marketplace WHERE company_id = ? AND status = 'active'"
      )
        .bind(companyId)
        .all();

      integrations = result.results || [];
    } else {
      const integration = await c.env.DB.prepare(
        "SELECT id, access_token, nickname, store_name FROM integrations_marketplace WHERE id = ? AND company_id = ?"
      )
        .bind(integrationId, companyId)
        .first();

      if (integration) integrations = [integration];
    }

    if (integrations.length === 0) {
      return c.json(
        { error: "Nenhuma integração encontrada. Por favor, conecte uma loja." },
        404
      );
    }

    const dailyMap = new Map<string, { revenue: number; orders: number }>();

    for (const integration of integrations) {
      if (!integration.access_token) {
        console.warn(`[ML Analytics] Integração ${integration.id} sem access_token`);
        continue;
      }

      try {
        const orders = await fetchMLOrders(integration.access_token, fromDate, toDate);

        for (const order of orders) {
          // ✅ filtro correto: só pedidos pagos
          if ((order?.status || "").toLowerCase() !== "paid") continue;

          // ✅ data mais correta para venda: date_closed quando existir; senão date_created
          const rawDate = order?.date_closed || order?.date_created;
          const dateKey = toDateKeySaoPaulo(rawDate);

          // ✅ gross = total_amount
          const gross = toNumber(order?.total_amount, 0);

          // ✅ net (best-effort):
          // tenta somar net_received_amount dos payments; se não tiver, cai no gross
          const net = computeNetFromOrderPayments(order) ?? gross;

          const revenue = mode === "net" ? net : gross;

          if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, { revenue: 0, orders: 0 });
          const dayData = dailyMap.get(dateKey)!;
          dayData.revenue += revenue;
          dayData.orders += 1;
        }
      } catch (error: any) {
        console.error(
          `[ML Analytics] Erro ao buscar pedidos da integração ${integration.id}:`,
          error
        );
        continue;
      }
    }

    // Preenche todos os dias do intervalo (SP)
    const daily: DailyData[] = [];
    const cursor = new Date(fromDate);

    while (cursor <= toDate) {
      const dateKey = toDateKeySaoPaulo(cursor.toISOString());
      const dayData = dailyMap.get(dateKey) || { revenue: 0, orders: 0 };

      daily.push({
        date: dateKey,
        revenue: round2(dayData.revenue),
        orders: dayData.orders,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    const totalRevenue = daily.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = daily.reduce((sum, d) => sum + d.orders, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const response: SummaryResponse = {
      timezone: "America/Sao_Paulo",
      from,
      to,
      mode,
      totals: {
        revenue: round2(totalRevenue),
        orders: totalOrders,
        avg_ticket: round2(avgTicket),
      },
      daily,
    };

    return c.json(response);
  } catch (error: any) {
    console.error("[ML Analytics] Error:", error);

    if (error.message?.includes("401") || error.message?.includes("expired")) {
      return c.json(
        { error: "Token de acesso expirado. Por favor, reconecte a loja nas configurações." },
        401
      );
    }

    return c.json({ error: "Erro ao buscar dados de vendas" }, 500);
  }
});

/**
 * Busca pedidos pagos da API do Mercado Livre
 * - resolve sellerId via /users/me
 * - pagina
 */
async function fetchMLOrders(accessToken: string, fromDate: Date, toDate: Date): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  const limit = 50;

  const sellerId = await fetchSellerId(accessToken);

  // ISO completo
  const fromISO = fromDate.toISOString();
  const toISO = toDate.toISOString();

  while (true) {
    const url = new URL("https://api.mercadolibre.com/orders/search");
    url.searchParams.set("seller", String(sellerId)); // ✅ aqui é o segredo
    url.searchParams.set("order.status", "paid");     // ✅ filtra já na API
    url.searchParams.set("order.date_created.from", fromISO);
    url.searchParams.set("order.date_created.to", toISO);
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("sort", "date_desc");

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[ML Analytics] API error:", response.status, errorText);
      throw new Error(`ML API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const results = data?.results || [];
    all.push(...results);

    const paging = data?.paging || {};
    const total = Number(paging.total || 0);

    offset += limit;
    if (offset >= total) break;

    // segurança: evita loop infinito
    if (all.length > 50000) {
      console.warn("[ML Analytics] safety break: > 50k orders");
      break;
    }
  }

  return all;
}

/**
 * Pega o seller_id da conta do token
 */
async function fetchSellerId(accessToken: string): Promise<number> {
  const resp = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("[ML Analytics] users/me error:", resp.status, t);
    throw new Error(`ML API error users/me: ${resp.status}`);
  }

  const me = (await resp.json()) as any;
  const id = Number(me?.id);

  if (!Number.isFinite(id)) {
    throw new Error("Não foi possível obter seller_id via /users/me");
  }

  return id;
}

/**
 * Converte qualquer date string/ISO para YYYY-MM-DD no fuso de São Paulo
 */
function toDateKeySaoPaulo(dateStr: string): string {
  const d = new Date(dateStr);
  // Intl garante o fuso (sem “andar” por UTC)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const da = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${da}`;
}

function toNumber(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * “Net” (líquido) best-effort:
 * tenta ler net_received_amount nos payments retornados no payload do pedido.
 * Se não existir, retorna null e o chamador usa gross.
 */
function computeNetFromOrderPayments(order: any): number | null {
  const payments = Array.isArray(order?.payments) ? order.payments : null;
  if (!payments || payments.length === 0) return null;

  let sum = 0;
  let found = false;

  for (const p of payments) {
    const net = p?.transaction_details?.net_received_amount;
    if (net !== undefined && net !== null) {
      sum += toNumber(net, 0);
      found = true;
    }
  }

  if (!found) return null;
  return sum;
}

export default app;
