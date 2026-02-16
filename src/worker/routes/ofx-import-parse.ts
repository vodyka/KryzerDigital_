import { Hono } from "hono";
import type { AppContext } from "../types";
import { parseOFX, validateOFX } from "../utils/ofx-parser";

const app = new Hono<AppContext>();

// Parse OFX file without importing (for reconciliation preview)
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { fileContent } = body;

    if (!fileContent) {
      return c.json({ error: "Conteúdo do arquivo não fornecido" }, 400);
    }

    // Validate OFX content
    const validation = validateOFX(fileContent);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    // Parse OFX
    let ofxData;
    try {
      ofxData = parseOFX(fileContent);
    } catch (error) {
      console.error("Error parsing OFX:", error);
      return c.json({ error: "Erro ao processar arquivo OFX" }, 400);
    }

    if (ofxData.transactions.length === 0) {
      return c.json({ error: "Nenhuma transação encontrada no arquivo" }, 400);
    }

    // Transform transactions for reconciliation dialog
    const transactions = ofxData.transactions.map((tx, index) => ({
      id: tx.fitid || `tx-${index}`,
      date: tx.date,
      amount: tx.amount,
      description: tx.description,
      type: tx.type,
      memo: tx.memo,
      fitid: tx.fitid,
    }));

    return c.json({
      success: true,
      transactions,
      accountInfo: {
        bankId: ofxData.bankId,
        accountId: ofxData.accountId,
        currency: ofxData.currency,
      },
    });
  } catch (error) {
    console.error("Error parsing OFX:", error);
    return c.json({ error: "Erro ao processar arquivo OFX" }, 500);
  }
});

export default app;
