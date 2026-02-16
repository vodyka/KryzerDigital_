import { useState, useEffect } from "react";
import { History, ArrowDownLeft, ArrowUpRight, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { ScrollArea } from "@/react-app/components/ui/scroll-area";

interface HistoryEntry {
  id: number;
  transaction_type: string;
  transaction_id: number;
  action: string;
  changed_fields: string | null;
  old_values: string | null;
  new_values: string | null;
  created_at: string;
  transaction_description: string | null;
  transaction_amount: number | null;
}

interface TransactionHistoryDialogProps {
  trigger?: React.ReactNode;
}

export function TransactionHistoryDialog({ trigger }: TransactionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/transaction-history");
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", { 
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Plus className="h-3.5 w-3.5" />;
      case "update":
        return <Pencil className="h-3.5 w-3.5" />;
      case "delete":
        return <Trash2 className="h-3.5 w-3.5" />;
      case "pay":
        return <Check className="h-3.5 w-3.5" />;
      case "unpay":
        return <X className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case "create":
        return "Criado";
      case "update":
        return "Editado";
      case "delete":
        return "Excluído";
      case "pay":
        return "Marcado como pago";
      case "unpay":
        return "Marcado como não pago";
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-success/10 text-success border-success/20";
      case "update":
        return "bg-primary/10 text-primary border-primary/20";
      case "delete":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "pay":
        return "bg-success/10 text-success border-success/20";
      case "unpay":
        return "bg-muted text-muted-foreground border-muted-foreground/20";
      default:
        return "bg-muted text-muted-foreground border-muted-foreground/20";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Histórico de alterações</DialogTitle>
          <DialogDescription>
            Últimas {history.length} alterações em lançamentos
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <History className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">Nenhum histórico encontrado</p>
              <p className="text-xs text-muted-foreground">
                As alterações em lançamentos aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                        entry.transaction_type === "income" 
                          ? "bg-success/10 text-success" 
                          : "bg-primary/10 text-primary"
                      }`}>
                        {entry.transaction_type === "income" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.transaction_description || `Lançamento #${entry.transaction_id}`}
                        </p>
                        {entry.transaction_amount && (
                          <p className={`text-xs ${
                            entry.transaction_type === "income" ? "text-success" : "text-muted-foreground"
                          }`}>
                            {formatCurrency(entry.transaction_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${getActionColor(entry.action)} gap-1 shrink-0`}>
                      {getActionIcon(entry.action)}
                      {getActionText(entry.action)}
                    </Badge>
                  </div>

                  {entry.changed_fields && (
                    <div className="mt-3 pt-3 border-t text-xs">
                      <p className="text-muted-foreground mb-2">Campos alterados:</p>
                      <div className="flex flex-wrap gap-1">
                        {JSON.parse(entry.changed_fields).map((field: string) => (
                          <Badge key={field} variant="outline" className="text-[10px]">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(entry.created_at)}</span>
                    <span className="text-[10px]">
                      {entry.transaction_type === "income" ? "Entrada" : "Saída"} #{entry.transaction_id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
