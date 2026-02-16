/**
 * Centralized API client with automatic authentication
 */

type FetchOptions = RequestInit & {
  headers?: Record<string, string>;
};

/**
 * Make an authenticated API request
 * Automatically adds Authorization header with token from localStorage
 */
export async function apiRequest(url: string, options: FetchOptions = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Merge existing headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value;
    });
  }
  
  // Add auth header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await apiRequest(url, { method: "GET" });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const response = await apiRequest(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(url: string, data?: any): Promise<T> {
  const response = await apiRequest(url, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(url: string): Promise<T> {
  const response = await apiRequest(url, { method: "DELETE" });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return response.json();
}
