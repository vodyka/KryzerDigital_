/**
 * Formas de pagamento globais do sistema
 * Usadas em todo o sistema financeiro para garantir consistência
 */
export const PAYMENT_METHODS = [
  "Pix",
  "Boleto",
  "Cartão Débito",
  "Cartão Crédito",
  "Transferência",
  "Dinheiro"
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number];
