import { Component, ReactNode } from "react";
import { AlertTriangle, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { generateCorrelationId } from "@/react-app/lib/correlation";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  correlationId: string | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const correlationId = sessionStorage.getItem('correlation-id') || generateCorrelationId();
    sessionStorage.setItem('correlation-id', correlationId);

    return {
      hasError: true,
      error,
      correlationId,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const correlationId = this.state.correlationId || generateCorrelationId();

    // Log error with correlation ID
    console.error(JSON.stringify({
      type: 'ui_error',
      correlationId,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      url: window.location.href,
      userAgent: navigator.userAgent,
    }));

    this.setState({
      errorInfo,
    });
  }

  handleCopy = () => {
    if (this.state.correlationId) {
      navigator.clipboard.writeText(this.state.correlationId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: null,
      copied: false,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="bg-card border border-border rounded-lg p-8 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    Erro Inesperado
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Algo deu errado. Por favor, tente novamente.
                  </p>
                </div>
              </div>

              {this.state.correlationId && (
                <div className="mb-6 p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium text-foreground mb-2">
                    Código do Erro para Suporte:
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-background border border-border px-3 py-2 rounded truncate">
                      {this.state.correlationId}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={this.handleCopy}
                      className="flex-shrink-0"
                    >
                      {this.state.copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Copie este código ao entrar em contato com o suporte
                  </p>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6 p-4 bg-muted rounded-lg">
                  <summary className="text-sm font-medium cursor-pointer text-foreground mb-2">
                    Detalhes do Erro (Dev)
                  </summary>
                  <pre className="text-xs overflow-auto max-h-40 mt-2 p-2 bg-background border border-border rounded">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex-1"
                >
                  Ir para Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
