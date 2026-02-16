// Correlation ID utilities for error tracking and diagnostics

export function generateCorrelationId(): string {
  // Generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getCorrelationId(): string {
  // Get or create correlation ID for current context
  const existingId = sessionStorage.getItem('correlation-id');
  if (existingId) {
    return existingId;
  }
  
  const newId = generateCorrelationId();
  sessionStorage.setItem('correlation-id', newId);
  return newId;
}

export function setCorrelationId(id: string): void {
  sessionStorage.setItem('correlation-id', id);
}

export function clearCorrelationId(): void {
  sessionStorage.removeItem('correlation-id');
}
