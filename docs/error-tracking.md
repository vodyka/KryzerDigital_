# Sistema de Rastreamento de Erros (Error ID / Correlation ID)

## Visão Geral

O sistema de Error ID permite rastrear erros de ponta a ponta, desde o frontend até o backend, facilitando o diagnóstico e suporte ao cliente.

## Como Funciona

### 1. Correlation ID (UUID v4)

Cada requisição recebe um ID único (UUID v4) que é propagado por toda a aplicação:

- **Frontend**: Gera e armazena o ID em `sessionStorage`
- **Backend**: Recebe via header `X-Correlation-Id` e loga em todas as operações
- **Resposta**: Retorna o mesmo ID no header de resposta

### 2. Componentes do Sistema

#### Frontend

**ErrorTrackingContext** (`src/react-app/contexts/ErrorTrackingContext.tsx`)
- Gerencia breadcrumbs (histórico de ações do usuário)
- Mantém o Correlation ID da sessão
- Rastreia navegação e ações do usuário

**NotificationContext** (`src/react-app/contexts/NotificationContext.tsx`)
- Exibe notificações com Error ID quando ocorre erro
- Permite copiar o código para enviar ao suporte
- Auto-fecha após 8 segundos (erros) ou 5 segundos (outros)

**ErrorBoundary** (`src/react-app/components/ErrorBoundary.tsx`)
- Captura erros não tratados na UI
- Exibe tela amigável com Error ID
- Loga detalhes completos no console

**apiClient** (`src/react-app/lib/apiClient.ts`)
- Cliente HTTP centralizado
- Adiciona automaticamente Correlation ID em todas requisições
- Anexa erro ID em exceções

#### Backend

**correlationMiddleware** (`src/worker/middleware/correlation.ts`)
- Recebe ou gera Correlation ID
- Loga todas requisições com contexto completo
- Adiciona ID nas respostas de erro

**errorHandler**
- Captura erros não tratados
- Formata resposta com Correlation ID
- Loga stack trace completo

### 3. Formato dos Logs

Todos os logs seguem formato JSON estruturado:

```json
{
  "type": "request|response|error",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-09T15:30:00.000Z",
  "method": "POST",
  "path": "/api/products/import",
  "userId": "2445148686",
  "companyId": 123,
  "status": 500,
  "duration": 1234,
  "error": {
    "message": "Validation failed",
    "stack": "Error: ...",
    "name": "ValidationError"
  }
}
```

### 4. Breadcrumbs (Rastro de Ações)

O sistema mantém até 50 breadcrumbs (últimas ações) que incluem:

- **navigation**: Mudanças de rota
- **action**: Ações do usuário (submit, upload, etc)
- **api**: Chamadas de API
- **error**: Erros capturados

Exemplo:
```typescript
errorTracking.addBreadcrumb("action", "Importando arquivo: produtos.xlsx");
errorTracking.addBreadcrumb("api", "POST /api/products/import");
errorTracking.addBreadcrumb("error", "Falha na validação do arquivo");
```

## Como Usar

### No Frontend (Componentes React)

#### Opção 1: Hook customizado (Recomendado)

```typescript
import { useApiRequest } from "@/react-app/hooks/useApiRequest";

function MyComponent() {
  const { execute, loading, error } = useApiRequest({
    showSuccessNotification: true,
    successMessage: "Operação concluída!",
    showErrorNotification: true, // default
  });

  const handleSubmit = async () => {
    await execute("/api/endpoint", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    });
  };
}
```

#### Opção 2: Cliente API direto

```typescript
import { apiRequest } from "@/react-app/lib/apiClient";
import { useNotification } from "@/react-app/contexts/NotificationContext";
import { useErrorTracking } from "@/react-app/contexts/ErrorTrackingContext";

function MyComponent() {
  const notification = useNotification();
  const errorTracking = useErrorTracking();

  const handleAction = async () => {
    try {
      errorTracking.addBreadcrumb("action", "Descrição da ação");
      
      const result = await apiRequest("/api/endpoint", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      
      notification.success("Sucesso!");
    } catch (error: any) {
      notification.error("Falha na operação", error.correlationId);
    }
  };
}
```

#### Opção 3: Requisições com FormData (uploads)

```typescript
const handleUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const correlationId = sessionStorage.getItem('correlation-id');
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };
    
    if (correlationId) {
      headers['X-Correlation-Id'] = correlationId;
    }
    
    const response = await fetch("/api/upload", {
      method: "POST",
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorId = response.headers.get('X-Correlation-Id') || correlationId;
      notification.error("Erro no upload", errorId || undefined);
    }
  } catch (error: any) {
    notification.error("Erro no upload", error.correlationId);
  }
};
```

### No Backend (Hono Routes)

O middleware já está configurado globalmente. Para acessar o Correlation ID:

```typescript
app.post("/api/endpoint", async (c) => {
  const correlationId = c.get('correlationId');
  
  try {
    // Lógica da rota
    
    return c.json({ success: true });
  } catch (error: any) {
    // Log com correlation ID
    console.error(JSON.stringify({
      type: 'route_error',
      correlationId,
      error: {
        message: error.message,
        stack: error.stack,
      },
    }));
    
    // Retornar erro com correlation ID
    return c.json({
      error: "Erro ao processar requisição",
      correlationId,
    }, 500);
  }
});
```

## Workflow de Suporte

### Quando um cliente reporta um erro:

1. **Cliente**: Vê notificação com código do erro (ex: `550e8400-e29b-41d4-a716-446655440000`)
2. **Cliente**: Copia o código e envia ao suporte
3. **Suporte**: Busca o código nos logs:
   ```bash
   # Buscar no console do Mocha ou logs do Cloudflare
   grep "550e8400-e29b-41d4-a716-446655440000" logs.txt
   ```
4. **Suporte**: Encontra:
   - Requisição original
   - Stack trace do erro
   - Contexto (user_id, company_id, path, method)
   - Breadcrumbs (ações anteriores ao erro)
   - Payload resumido

### Exemplo de log completo encontrado:

```json
{
  "type": "error",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-09T15:30:45.123Z",
  "method": "POST",
  "path": "/api/products/import",
  "userId": "2445148686",
  "companyId": 123,
  "duration": 2341,
  "error": {
    "message": "Arquivo não começa com 'Lista_de_Estoque_'",
    "stack": "Error: Arquivo não começa com...\n    at validateFile...",
    "name": "ValidationError"
  }
}
```

## Boas Práticas

1. **Sempre use o apiClient** para requisições normais (JSON)
2. **Para uploads**, adicione manualmente o header `X-Correlation-Id`
3. **Adicione breadcrumbs** antes de ações importantes
4. **Não exponha dados sensíveis** nos logs (senhas, tokens, etc)
5. **Use mensagens amigáveis** para o usuário, técnicas para os logs
6. **Mantenha breadcrumbs específicos** mas concisos

## Segurança

- Correlation IDs **não** contêm informações sensíveis
- São apenas UUIDs aleatórios para rastreamento
- Logs estruturados facilitam filtragem de dados sensíveis
- Nunca logue senhas, tokens completos ou dados pessoais

## Debugging

Para ver os Correlation IDs no console do navegador:

```javascript
// Ver correlation ID atual
console.log(sessionStorage.getItem('correlation-id'));

// Ver breadcrumbs (em desenvolvimento)
// Os breadcrumbs são logados automaticamente no console
```

Para ver logs no backend:
- Acesse o console do Mocha durante desenvolvimento
- Para produção, acesse os logs do Cloudflare Workers
