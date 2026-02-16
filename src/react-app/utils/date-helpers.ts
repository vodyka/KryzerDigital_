/**
 * Retorna o primeiro dia do mês atual no formato YYYY-MM-DD
 */
export function getFirstDayOfMonth(): string {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
}

/**
 * Retorna o último dia do mês atual no formato YYYY-MM-DD
 */
export function getLastDayOfMonth(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

/**
 * Formata uma data no padrão brasileiro (dd/MM/yyyy)
 */
export function formatDateBR(dateString: string | null): string {
  if (!dateString) return "-";
  // Parse the date string directly (YYYY-MM-DD format)
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    const day = parts[2];
    const month = parts[1];
    const year = parts[0];
    return `${day}/${month}/${year}`;
  }
  // Fallback to Date object
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/**
 * Formata uma data e hora no padrão brasileiro (dd/MM/yyyy HH:mm)
 */
export function formatDateTimeBR(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("pt-BR", { 
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
