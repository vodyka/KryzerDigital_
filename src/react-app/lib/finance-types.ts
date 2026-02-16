// Tipos de dados do sistema financeiro

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
}

export interface GlobalBank {
  codigo: string;
  nome: string;
  logoUrl?: string;
}

export interface BankAccount {
  id: string;
  companyId: string;
  bankCode: string;
  accountName: string;
  initialBalance: number;
  balanceStartDate: string;
  overdraftLimit?: number;
  isDefault?: boolean;
  bankName?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  type: "receita" | "despesa";
  groupId: string;
  isDefault?: boolean;
}

export interface Payable {
  id: string;
  companyId: string;
  description: string;
  amount: number;
  dueDate: string;
  bankId: string;
  categoryId: string;
  paymentMethod: string;
  status: "pendente" | "pago" | "vencido";
  supplierId?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  negotiationOrigins?: NegotiationOrigin[];
  partialGroupId?: string;
  partialNumber?: number;
  partialTotal?: number;
}

export interface NegotiationOrigin {
  description: string;
  amount: number;
  dueDate: string;
}

export interface Receivable {
  id: string;
  companyId: string;
  description: string;
  amount: number;
  receiptDate: string;
  bankId: string;
  categoryId: string;
  status: "pendente" | "recebido" | "vencido";
  clientId?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  partialGroupId?: string;
  partialNumber?: number;
  partialTotal?: number;
}

export interface Payment {
  id: string;
  companyId: string;
  date: string;
  bankId: string;
  paymentMethod: string;
  amount: number;
  payableIds: string[];
  description: string;
  discount?: number;
  interest?: number;
  fine?: number;
}

export interface Receipt {
  id: string;
  companyId: string;
  date: string;
  bankId: string;
  amount: number;
  receivableIds: string[];
  description: string;
}

export interface AppSettings {
  countOverdueInBalance: boolean;
}

export interface SupplierClient {
  id: string;
  companyId: string;
  name: string;
  documentType: "cnpj" | "cpf";
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  contactTypes: ("fornecedor" | "cliente" | "socio" | "funcionario")[];
  notes?: string;
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: "grp-1", name: "Receitas Operacionais" },
  { id: "grp-2", name: "Custos Operacionais" },
  { id: "grp-3", name: "Despesas Operacionais e Outras Receitas" },
  { id: "grp-4", name: "Atividades de Investimento" },
  { id: "grp-5", name: "Atividades de Financiamento" },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Receitas Operacionais
  { id: "cat-1", name: "Descontos Concedidos", type: "despesa", groupId: "grp-1", isDefault: true },
  { id: "cat-2", name: "Juros Recebidos", type: "receita", groupId: "grp-1", isDefault: true },
  { id: "cat-3", name: "Multas Recebidas", type: "receita", groupId: "grp-1", isDefault: true },
  { id: "cat-4", name: "Outras receitas", type: "receita", groupId: "grp-1", isDefault: true },

  // Custos Operacionais
  { id: "cat-5", name: "Compras de fornecedores", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-6", name: "Custo serviço prestado", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-7", name: "Custos produto vendido", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-8", name: "Impostos sobre receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-9", name: "INSS Retido sobre a Receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-10", name: "Outras Retenções sobre a Receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-11", name: "CSLL Retido sobre a Receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-12", name: "ISS Retido sobre a Receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-13", name: "PIS Retido sobre a Receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-14", name: "IRPJ Retido sobre a Receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-15", name: "COFINS Retido sobre a Receita", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-16", name: "Compras - Embalagens", type: "despesa", groupId: "grp-2", isDefault: true },
  { id: "cat-17", name: "Frete sobre Compras", type: "despesa", groupId: "grp-2", isDefault: true },

  // Despesas Operacionais e Outras Receitas
  { id: "cat-18", name: "Aluguel e condomínio", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-19", name: "Descontos Recebidos", type: "receita", groupId: "grp-3", isDefault: true },
  { id: "cat-20", name: "Juros Pagos", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-21", name: "Luz, água e outros", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-22", name: "Material de escritório", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-23", name: "Multas Pagas", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-24", name: "Outras despesas", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-25", name: "Salários, encargos e benefícios", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-26", name: "Serviços contratados", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-27", name: "Taxas e contribuições", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-28", name: "Pagamento de CSLL Retido", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-29", name: "Pagamento de Cofins Retido", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-30", name: "Pagamento de INSS Retido", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-31", name: "Pagamento de IRPJ Retido", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-32", name: "Pagamento de Outras retenções", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-33", name: "Pagamento de ISS Retido", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-34", name: "Pagamento de PIS Retido", type: "despesa", groupId: "grp-3", isDefault: true },
  { id: "cat-35", name: "CSLL Retido sobre Pagamentos", type: "receita", groupId: "grp-3", isDefault: true },
  { id: "cat-36", name: "INSS Retido sobre Pagamentos", type: "receita", groupId: "grp-3", isDefault: true },
  { id: "cat-37", name: "IRPJ Retido sobre Pagamentos", type: "receita", groupId: "grp-3", isDefault: true },
  { id: "cat-38", name: "COFINS Retido sobre Pagamentos", type: "receita", groupId: "grp-3", isDefault: true },
  { id: "cat-39", name: "PIS Retido sobre Pagamentos", type: "receita", groupId: "grp-3", isDefault: true },
  { id: "cat-40", name: "ISS Retido sobre Pagamentos", type: "receita", groupId: "grp-3", isDefault: true },
  { id: "cat-41", name: "Outras Retenções sobre Pagamentos", type: "receita", groupId: "grp-3", isDefault: true },

  // Atividades de Investimento
  { id: "cat-42", name: "Compra de ativo fixo", type: "despesa", groupId: "grp-4", isDefault: true },
  { id: "cat-43", name: "Venda de ativo fixo", type: "receita", groupId: "grp-4", isDefault: true },

  // Atividades de Financiamento
  { id: "cat-44", name: "Aporte de capital", type: "receita", groupId: "grp-5", isDefault: true },
  { id: "cat-45", name: "Obtenção de empréstimo", type: "receita", groupId: "grp-5", isDefault: true },
  { id: "cat-46", name: "Pagamento de empréstimo", type: "despesa", groupId: "grp-5", isDefault: true },
  { id: "cat-47", name: "Retirada de capital", type: "despesa", groupId: "grp-5", isDefault: true },
];

export const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Cartão de Crédito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "deposito", label: "Depósito" },
  { value: "dinheiro", label: "Dinheiro" },
];
