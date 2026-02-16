// Funções utilitárias para operações financeiras e de data

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

// Retorna a data de hoje em formato YYYY-MM-DD considerando fuso horário do Brasil
export function todayStr(): string {
  const now = new Date();
  const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const year = brazilTime.getFullYear();
  const month = String(brazilTime.getMonth() + 1).padStart(2, "0");
  const day = String(brazilTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Retorna um objeto Date com a data de hoje à meia-noite no fuso horário brasileiro
export function getBrazilToday(): Date {
  const now = new Date();
  const brazilTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  brazilTime.setHours(0, 0, 0, 0);
  return brazilTime;
}

// Converte string YYYY-MM-DD para Date interpretado no fuso brasileiro
export function parseDateBrazil(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0);
}

// Formata data de YYYY-MM-DD para DD/MM/YYYY
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// Verifica se uma data está vencida
export function isOverdue(dateStr: string): boolean {
  const date = parseDateBrazil(dateStr);
  const today = getBrazilToday();
  return date < today;
}

// Adiciona meses a uma data
export function addMonths(dateStr: string, months: number): string {
  const date = parseDateBrazil(dateStr);
  date.setMonth(date.getMonth() + months);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
