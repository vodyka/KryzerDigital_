import { useState, useEffect } from "react";
import { Button } from "@/react-app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/react-app/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import { Badge } from "@/react-app/components/ui/badge";
import {
  Repeat,
  Plus,
  Play,
  Pause,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { NovaRecorrenciaDialog } from "./NovaRecorrenciaDialog";

interface RecurringTransaction {
  id: number;
  type: "income" | "expense";
  recurrence_type: "monthly" | "installment";
  description: string;
  amount: number;
  person_name_display: string | null;
  category_id: number | null;
  start_date: string;
  end_date: string | null;
  total_installments: number | null;
  current_installment: number;
  day_of_month: number | null;
  is_active: boolean;
  last_generated_date: string | null;
}

export function RecurringTransactionsDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [novaOpen, setNovaOpen] = useState(false);

  const fetchRecurring = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/recurring-transactions");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setRecurring(data.recurring || []);
    } catch (error) {
      console.error("Erro ao carregar recorrências:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRecurring();
    }
  }, [open]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const response = await fetch("/api/recurring-transactions/generate", {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Failed to generate");
      
      const data = await response.json();
      
      if (data.generated > 0) {
        alert(`${data.generated} lançamento(s) criado(s) com sucesso.`);
      }
      
      await fetchRecurring();
    } catch (error) {
      alert("Erro ao gerar lançamentos.");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const response = await fetch(`/api/recurring-transactions/${id}/toggle`, {
        method: "PATCH",
      });
      
      if (!response.ok) throw new Error("Failed to toggle");
      
      await fetchRecurring();
    } catch (error) {
      alert("Erro ao atualizar status.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta recorrência?")) return;
    
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) throw new Error("Failed to delete");
      
      await fetchRecurring();
    } catch (error) {
      alert("Erro ao excluir recorrência.");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Repeat className="h-4 w-4" />
            <span className="hidden sm:inline">Recorrências</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lançamentos recorrentes</DialogTitle>
            <DialogDescription>
              Gerencie lançamentos mensais e parcelados que se repetem automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setNovaOpen(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nova recorrência
                </Button>
                <Button
                  onClick={handleGenerate}
                  variant="outline"
                  size="sm"
                  disabled={generating}
                  className="gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Gerar pendentes
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {recurring.filter(r => r.is_active).length} ativa(s)
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recurring.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Repeat className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  Nenhuma recorrência configurada
                </p>
                <Button onClick={() => setNovaOpen(true)} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar primeira recorrência
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Tipo</TableHead>
                        <TableHead className="min-w-[200px]">Descrição</TableHead>
                        <TableHead className="w-[120px]">Recorrência</TableHead>
                        <TableHead className="w-[100px]">Valor</TableHead>
                        <TableHead className="w-[120px]">Início</TableHead>
                        <TableHead className="w-[100px]">Progresso</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurring.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-md ${
                                r.type === "income"
                                  ? "bg-success/10 text-success"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {r.type === "income" ? (
                                <ArrowDownLeft className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm truncate">
                                {r.description}
                              </p>
                              {r.person_name_display && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {r.person_name_display}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {r.recurrence_type === "monthly"
                                ? `Mensal (dia ${r.day_of_month || 1})`
                                : `${r.total_installments}x parcelado`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">
                              {formatCurrency(r.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(r.start_date)}
                          </TableCell>
                          <TableCell>
                            {r.recurrence_type === "installment" && r.total_installments ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {r.current_installment}/{r.total_installments}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{
                                      width: `${(r.current_installment / r.total_installments) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.is_active ? (
                              <Badge className="bg-success/10 text-success border-success/20">
                                Ativa
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Pausada
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                onClick={() => handleToggle(r.id)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title={r.is_active ? "Pausar" : "Ativar"}
                              >
                                {r.is_active ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                onClick={() => handleDelete(r.id)}
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:text-destructive"
                                title="Excluir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <NovaRecorrenciaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onSuccess={() => {
          setNovaOpen(false);
          fetchRecurring();
        }}
      />
    </>
  );
}
