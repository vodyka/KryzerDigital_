/**
 * Format a number input value to Brazilian Real currency as user types
 * Example: "5780" -> "57,80" -> "5.780,00"
 */
export function formatCurrencyInput(value: string): string {
  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Convert to number and divide by 100 to get cents
  const numberValue = parseInt(numbers) / 100;
  
  // Format as Brazilian currency
  return numberValue.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a formatted currency string to a number
 * Example: "5.780,00" -> 5780.00
 */
export function parseCurrencyInput(value: string): number {
  const numbers = value.replace(/\D/g, '');
  return parseInt(numbers || '0') / 100;
}
