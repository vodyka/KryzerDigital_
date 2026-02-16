import { Hono } from "hono";
import type { Env } from "../types";

const auth = new Hono<{ Bindings: Env }>();

// Helper para hash de senha (simulação simples - em produção use bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Endpoint de registro
auth.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, company, password } = body;

    // Validação básica
    if (!name || !email || !password) {
      return c.json({ error: "Nome, email e senha são obrigatórios" }, 400);
    }

    // Verificar se email já existe
    const existingUser = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first();

    if (existingUser) {
      return c.json({ error: "Email já cadastrado" }, 400);
    }

    // Hash da senha
    const hashedPassword = await hashPassword(password);

    // Calcular data de fim do trial (30 dias)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Inserir usuário
    const result = await c.env.DB.prepare(
      `INSERT INTO users (name, email, phone, company, password, plan, trial_ends_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'Starter', ?, datetime('now'), datetime('now'))`
    ).bind(
      name,
      email,
      phone || null,
      company || null,
      hashedPassword,
      trialEndsAt.toISOString()
    ).run();

    if (!result.success) {
      return c.json({ error: "Erro ao criar usuário" }, 500);
    }

    const userId = result.meta.last_row_id;

    // Criar empresa padrão para o usuário
    const companyResult = await c.env.DB.prepare(
      `INSERT INTO companies (name, slug, created_at, updated_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`
    ).bind(
      company || `Empresa de ${name}`,
      `company-${userId}-${Date.now()}`
    ).run();

    if (!companyResult.success) {
      return c.json({ error: "Erro ao criar empresa" }, 500);
    }

    const companyId = companyResult.meta.last_row_id;

    // Vincular usuário à empresa
    await c.env.DB.prepare(
      `INSERT INTO user_companies (user_id, company_id, role, is_default, created_at, updated_at)
       VALUES (?, ?, 'owner', 1, datetime('now'), datetime('now'))`
    ).bind(userId, companyId).run();

    // Criar categorias padrão do sistema para o usuário
    const defaultCategories = [
      // RECEITAS OPERACIONAIS
      { name: "Descontos Concedidos", type: "expense", group: "RECEITAS OPERACIONAIS", order: 1 },
      { name: "Juros Recebidos", type: "income", group: "RECEITAS OPERACIONAIS", order: 2 },
      { name: "Multas Recebidas", type: "income", group: "RECEITAS OPERACIONAIS", order: 3 },
      { name: "Outras receitas", type: "income", group: "RECEITAS OPERACIONAIS", order: 4 },
      
      // CUSTOS OPERACIONAIS
      { name: "Compras de fornecedores", type: "expense", group: "CUSTOS OPERACIONAIS", order: 1 },
      { name: "Custo serviço prestado", type: "expense", group: "CUSTOS OPERACIONAIS", order: 2 },
      { name: "Custos produto vendido", type: "expense", group: "CUSTOS OPERACIONAIS", order: 3 },
      { name: "Impostos sobre receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 4 },
      { name: "INSS Retido sobre a Receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 5 },
      { name: "Outras Retenções sobre a Receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 6 },
      { name: "CSLL Retido sobre a Receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 7 },
      { name: "ISS Retido sobre a Receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 8 },
      { name: "PIS Retido sobre a Receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 9 },
      { name: "IRPJ Retido sobre a Receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 10 },
      { name: "COFINS Retido sobre a Receita", type: "expense", group: "CUSTOS OPERACIONAIS", order: 11 },
      { name: "Compras - Embalagens", type: "expense", group: "CUSTOS OPERACIONAIS", order: 12 },
      { name: "Frete sobre Compras", type: "expense", group: "CUSTOS OPERACIONAIS", order: 13 },
      
      // DESPESAS OPERACIONAIS E OUTRAS RECEITAS
      { name: "Aluguel e condomínio", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 1 },
      { name: "Descontos Recebidos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 2 },
      { name: "Juros Pagos", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 3 },
      { name: "Luz, água e outros", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 4 },
      { name: "Material de escritório", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 5 },
      { name: "Multas Pagas", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 6 },
      { name: "Outras despesas", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 7 },
      { name: "Salários, encargos e benefícios", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 8 },
      { name: "Serviços contratados", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 9 },
      { name: "Taxas e contribuições", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 10 },
      { name: "Pagamento de CSLL Retido", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 11 },
      { name: "Pagamento de Cofins Retido", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 12 },
      { name: "Pagamento de INSS Retido", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 13 },
      { name: "Pagamento de IRPJ Retido", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 14 },
      { name: "Pagamento de Outras retenções", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 15 },
      { name: "Pagamento de ISS Retido", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 16 },
      { name: "Pagamento de PIS Retido", type: "expense", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 17 },
      { name: "CSLL Retido sobre Pagamentos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 18 },
      { name: "INSS Retido sobre Pagamentos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 19 },
      { name: "IRPJ Retido sobre Pagamentos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 20 },
      { name: "COFINS Retido sobre Pagamentos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 21 },
      { name: "PIS Retido sobre Pagamentos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 22 },
      { name: "ISS Retido sobre Pagamentos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 23 },
      { name: "Outras Retenções sobre Pagamentos", type: "income", group: "DESPESAS OPERACIONAIS E OUTRAS RECEITAS", order: 24 },
      
      // ATIVIDADES DE INVESTIMENTO
      { name: "Compra de ativo fixo", type: "expense", group: "ATIVIDADES DE INVESTIMENTO", order: 1 },
      { name: "Venda de ativo fixo", type: "income", group: "ATIVIDADES DE INVESTIMENTO", order: 2 },
      
      // ATIVIDADES DE FINANCIAMENTO
      { name: "Aporte de capital", type: "income", group: "ATIVIDADES DE FINANCIAMENTO", order: 1 },
      { name: "Obtenção de empréstimo", type: "income", group: "ATIVIDADES DE FINANCIAMENTO", order: 2 },
      { name: "Pagamento de empréstimo", type: "expense", group: "ATIVIDADES DE FINANCIAMENTO", order: 3 },
      { name: "Retirada de capital", type: "expense", group: "ATIVIDADES DE FINANCIAMENTO", order: 4 },
    ];

    for (const cat of defaultCategories) {
      await c.env.DB.prepare(
        `INSERT INTO categories (company_id, name, type, is_native, group_name, display_order, created_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'))`
      ).bind(companyId, cat.name, cat.type, cat.group, cat.order).run();
    }

    return c.json({
      message: "Usuário criado com sucesso",
      user: {
        name,
        email,
        plan: "Starter",
        trial_ends_at: trialEndsAt.toISOString()
      }
    }, 201);
  } catch (error) {
    console.error("Erro no registro:", error);
    return c.json({ error: "Erro ao processar registro" }, 500);
  }
});

// Endpoint de login
auth.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // Validação básica
    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    // Hash da senha fornecida
    const hashedPassword = await hashPassword(password);

    // Buscar usuário
    const user = await c.env.DB.prepare(
      `SELECT id, name, email, phone, company, plan, trial_ends_at, is_admin, created_at
       FROM users
       WHERE email = ? AND password = ?`
    ).bind(email, hashedPassword).first();

    if (!user) {
      return c.json({ error: "Email ou senha incorretos" }, 401);
    }

    // Generate token in the format expected by the backend (user_XXX)
    const token = `user_${user.id}`;

    return c.json({
      message: "Login realizado com sucesso",
      token: token,
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        plan: user.plan,
        trial_ends_at: user.trial_ends_at,
        is_admin: user.is_admin === 1,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return c.json({ error: "Erro ao processar login" }, 500);
  }
});

// Helper para verificar token
async function verifyToken(token: string | undefined): Promise<any> {
  if (!token || !token.startsWith("Bearer ")) {
    return null;
  }
  
  // Token é o email hashado (para simplificar)
  const email = token.replace("Bearer ", "");
  return email;
}

// Endpoint para atualizar perfil
auth.put("/profile", async (c) => {
  try {
    const token = c.req.header("Authorization");
    const email = await verifyToken(token);
    
    if (!email) {
      return c.json({ error: "Não autorizado" }, 401);
    }

    const body = await c.req.json();
    const { name, phone, company } = body;

    // Atualizar usuário
    const result = await c.env.DB.prepare(
      `UPDATE users 
       SET name = ?, phone = ?, company = ?, updated_at = datetime('now')
       WHERE email = ?`
    ).bind(name, phone || null, company || null, email).run();

    if (!result.success) {
      return c.json({ error: "Erro ao atualizar perfil" }, 500);
    }

    // Buscar dados atualizados
    const user = await c.env.DB.prepare(
      `SELECT id, name, email, phone, company, plan, trial_ends_at, is_admin, created_at
       FROM users WHERE email = ?`
    ).bind(email).first();

    return c.json({
      message: "Perfil atualizado com sucesso",
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        company: user?.company,
        plan: user?.plan,
        trial_ends_at: user?.trial_ends_at,
        is_admin: user?.is_admin === 1,
      }
    });
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return c.json({ error: "Erro ao processar atualização" }, 500);
  }
});

// Endpoint para alterar senha
auth.post("/change-password", async (c) => {
  try {
    const token = c.req.header("Authorization");
    const email = await verifyToken(token);
    
    if (!email) {
      return c.json({ error: "Não autorizado" }, 401);
    }

    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    // Verificar senha atual
    const currentHashedPassword = await hashPassword(currentPassword);
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ? AND password = ?"
    ).bind(email, currentHashedPassword).first();

    if (!user) {
      return c.json({ error: "Senha atual incorreta" }, 401);
    }

    // Atualizar senha
    const newHashedPassword = await hashPassword(newPassword);
    const result = await c.env.DB.prepare(
      `UPDATE users 
       SET password = ?, updated_at = datetime('now')
       WHERE email = ?`
    ).bind(newHashedPassword, email).run();

    if (!result.success) {
      return c.json({ error: "Erro ao alterar senha" }, 500);
    }

    return c.json({
      message: "Senha alterada com sucesso"
    });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return c.json({ error: "Erro ao processar alteração de senha" }, 500);
  }
});

// Get current user
auth.get("/me", async (c) => {
  try {
    const token = c.req.header("Authorization")?.substring(7);
    if (!token?.startsWith("user_")) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const userId = token.substring(5);
    const user = await c.env.DB.prepare(
      `SELECT id, name, email, phone, company, plan, trial_ends_at, is_admin, is_active, access_level, penalty_points, created_at
       FROM users WHERE id = ?`
    ).bind(userId).first();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      appUser: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        company: user.company,
        plan: user.plan,
        trial_ends_at: user.trial_ends_at,
        is_admin: user.is_admin,
        is_active: user.is_active,
        access_level: user.access_level,
        penalty_points: user.penalty_points || 0,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error("Failed to get user:", error);
    return c.json({ error: "Failed to get user" }, 500);
  }
});

export default auth;
