import type { Context, Next } from "hono";

// Middleware to handle correlation IDs and structured logging
export async function correlationMiddleware(c: Context, next: Next) {
  const startTime = Date.now();
  
  // Get or generate correlation ID
  const correlationId = c.req.header('X-Correlation-Id') || 
    c.req.header('x-correlation-id') ||
    crypto.randomUUID();

  // Store in context for use in route handlers
  c.set('correlationId', correlationId);

  // Add to response headers
  c.header('X-Correlation-Id', correlationId);

  // Get request info
  const method = c.req.method;
  const path = c.req.path;
  const userAgent = c.req.header('User-Agent') || 'unknown';

  // Extract user/company info if available
  const token = c.req.header('Authorization')?.substring(7);
  let userId: string | null = null;
  let companyId: number | null = null;

  if (token?.startsWith('user_')) {
    userId = token.substring(5);
  }

  try {
    companyId = c.get('companyId') || null;
  } catch {
    // Company ID not available yet
  }

  // Log request
  console.log(JSON.stringify({
    type: 'request',
    correlationId,
    timestamp: new Date().toISOString(),
    method,
    path,
    userId,
    companyId,
    userAgent,
  }));

  try {
    await next();

    // Log successful response
    const duration = Date.now() - startTime;
    const status = c.res.status;

    console.log(JSON.stringify({
      type: 'response',
      correlationId,
      timestamp: new Date().toISOString(),
      method,
      path,
      userId,
      companyId,
      status,
      duration,
    }));
  } catch (error: any) {
    // Log error
    const duration = Date.now() - startTime;

    console.error(JSON.stringify({
      type: 'error',
      correlationId,
      timestamp: new Date().toISOString(),
      method,
      path,
      userId,
      companyId,
      duration,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    }));

    // Re-throw to be handled by error handler
    throw error;
  }
}

// Error handler middleware
export function errorHandler(error: Error, c: Context) {
  const correlationId = c.get('correlationId') || 'unknown';
  
  console.error(JSON.stringify({
    type: 'unhandled_error',
    correlationId,
    timestamp: new Date().toISOString(),
    path: c.req.path,
    method: c.req.method,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  }));

  // Return error response with correlation ID
  return c.json(
    {
      error: 'Ocorreu um erro inesperado',
      correlationId,
    },
    500
  );
}
