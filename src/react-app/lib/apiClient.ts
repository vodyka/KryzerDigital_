// Enhanced API client with correlation ID support and error tracking

import { generateCorrelationId } from "./correlation";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipCorrelationId?: boolean;
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth, skipCorrelationId, ...fetchOptions } = options;

  // Get or generate correlation ID
  const correlationId = skipCorrelationId 
    ? undefined 
    : sessionStorage.getItem('correlation-id') || generateCorrelationId();

  if (correlationId && !skipCorrelationId) {
    sessionStorage.setItem('correlation-id', correlationId);
  }

  // Build headers
  const headers = new Headers(fetchOptions.headers);

  // Add correlation ID
  if (correlationId && !skipCorrelationId) {
    headers.set('X-Correlation-Id', correlationId);
  }

  // Add auth token
  if (!skipAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  // Log request in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Request]', {
      url,
      method: fetchOptions.method || 'GET',
      correlationId,
      headers: Object.fromEntries(headers.entries()),
    });
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response]', {
        url,
        status: response.status,
        correlationId,
      });
    }

    if (!response.ok) {
      // Extract error details
      const errorData = await response.json().catch(() => ({}));
      
      const error = new Error(errorData.error || `Request failed with status ${response.status}`);
      (error as any).status = response.status;
      (error as any).correlationId = correlationId;
      (error as any).url = url;
      (error as any).method = fetchOptions.method || 'GET';
      
      // Log error
      console.error('[API Error]', {
        url,
        method: fetchOptions.method || 'GET',
        status: response.status,
        correlationId,
        error: errorData,
      });

      throw error;
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    // Attach correlation ID to network errors
    if (!error.correlationId && correlationId) {
      error.correlationId = correlationId;
      error.url = url;
      error.method = fetchOptions.method || 'GET';
    }

    console.error('[API Error]', {
      url,
      method: fetchOptions.method || 'GET',
      correlationId,
      error: error.message,
    });

    throw error;
  }
}
