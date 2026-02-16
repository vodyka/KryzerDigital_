import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Badge } from "@/react-app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import { ArrowLeft, Trash2, Check, Link, Plus, Search, X } from "lucide-react";

interface OFXTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  type: "DEBIT" | "CREDIT";
  memo?: string;
}

interface SuggestedMatch {
  id: number;
  type: "income" | "expense";
  description: string;
  amount: number;
  transaction_date: string;
  person_name?: string;
  matchScore: number;
}

interface ReconciliationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: OFXTransaction[];
  bankAccountId: number;
  onComplete: () => void;
}

interface ReconciliationState {
  [key: string]: {
    action: "skip" | "suggestion" | "new" | "multiple";
    suggestionId?: number;
    newTransaction?: {
      type: "payment" | "transfer";
      personName: string;
      description: string;
      categoryId?: number;
      costCenter?: string;
      targetAccountId?: number;
    };
    multipleLinks?: number[];
  };
}

export function ReconciliationDialog({
  open,
  onOpenChange,
  transactions,
  bankAccountId,
  onComplete,
}: ReconciliationDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reconciliationState, setReconciliationState] = useState<ReconciliationState>({});
  const [suggestions, setSuggestions] = useState<{ [key: string]: SuggestedMatch[] }>({});
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedMatch[]>([]);
  const [selectedMultiple, setSelectedMultiple] = useState<number[]>([]);
  const [bankAccounts, setBankAccounts] = useState<Array<{ id: number; account_name: string; bank_name: string }>>([]);

  const currentTransaction = transactions[currentIndex];
  const currentState = reconciliationState[currentTransaction?.id] || { action: "skip" };

  useEffect(() => {
    if (open && transactions.length > 0) {
      loadSuggestions();
      loadCategories();
      loadBankAccounts();
    }
  }, [open, transactions]);

  useEffect(() => {
    // Update selected multiple from state when changing transactions
    if (currentTransaction) {
      const state = reconciliationState[currentTransaction.id];
      if (state?.action === "multiple" && state.multipleLinks) {
        setSelectedMultiple(state.multipleLinks);
      } else {
        setSelectedMultiple([]);
      }
    }
  }, [currentIndex, currentTransaction]);

  const loadSuggestions = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Load suggestions for all transactions
      const suggestionsMap: { [key: string]: SuggestedMatch[] } = {};
      
      for (const transaction of transactions) {
        const response = await fetch(
          `/api/reconciliation/suggestions?date=${transaction.date}&amount=${Math.abs(transaction.amount)}&description=${encodeURIComponent(transaction.description)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          suggestionsMap[transaction.id] = data.suggestions || [];
        }
      }
      
      setSuggestions(suggestionsMap);
    } catch (error) {
      console.error("Erro ao carregar sugestões:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/bank-accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Erro ao carregar contas bancárias:", error);
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
    return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  };

  const handleSkip = () => {
    updateReconciliationState(currentTransaction.id, { action: "skip" });
    goToNext();
  };

  const handleAcceptSuggestion = (suggestionId: number) => {
    updateReconciliationState(currentTransaction.id, {
      action: "suggestion",
      suggestionId,
    });
    goToNext();
  };

  const handleSearchTransactions = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/reconciliation/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    }
  };

  const handleToggleMultiple = (id: number) => {
    const newSelected = selectedMultiple.includes(id)
      ? selectedMultiple.filter((i) => i !== id)
      : [...selectedMultiple, id];

    setSelectedMultiple(newSelected);
    updateReconciliationState(currentTransaction.id, {
      action: "multiple",
      multipleLinks: newSelected,
    });
  };

  const handleConfirmMultiple = () => {
    if (selectedMultiple.length > 0) {
      goToNext();
    }
  };

  const getSelectedTotal = () => {
    const allSuggestions = Object.values(suggestions).flat();
    const selected = allSuggestions.filter((s) => selectedMultiple.includes(s.id));
    return selected.reduce((sum, s) => sum + s.amount, 0);
  };

  const updateReconciliationState = (id: string, state: ReconciliationState[string]) => {
    setReconciliationState((prev) => ({
      ...prev,
      [id]: state,
    }));
  };

  const goToNext = () => {
    if (currentIndex < transactions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // All transactions processed - submit
      handleSubmit();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch("/api/reconciliation/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bankAccountId,
          reconciliations: Object.entries(reconciliationState).map(([txId, state]) => {
            const transaction = transactions.find((t) => t.id === txId);
            return {
              ofxTransaction: transaction,
              action: state.action,
              suggestionId: state.suggestionId,
              newTransaction: state.newTransaction,
              multipleLinks: state.multipleLinks,
            };
          }),
        }),
      });
      
      if (response.ok) {
        onComplete();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Erro ao processar conciliação:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentTransaction) {
    return null;
  }

  const currentSuggestions = suggestions[currentTransaction.id] || [];
  const topSuggestion = currentSuggestions[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <DialogTitle>Conciliação Bancária</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Transação {currentIndex + 1} de {transactions.length}
                </p>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              Concluir conciliação
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6 p-6">
            {/* Left: Transaction from OFX */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Transação do Extrato</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  title="Ignorar esta transação"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Data</span>
                  <span className="font-medium">{formatDate(currentTransaction.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span
                    className={`font-bold text-lg ${
                      currentTransaction.type === "CREDIT"
                        ? "text-success"
                        : "text-primary"
                    }`}
                  >
                    {currentTransaction.type === "CREDIT" ? "+" : "-"}
                    {formatCurrency(currentTransaction.amount)}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                  <p className="font-medium">{currentTransaction.description}</p>
                </div>
                {currentTransaction.memo && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Memo</p>
                    <p className="text-sm">{currentTransaction.memo}</p>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="flex-1"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={goToNext}
                  disabled={currentIndex === transactions.length - 1}
                  className="flex-1"
                >
                  Próxima
                </Button>
              </div>
            </div>

            {/* Right: Reconciliation Options */}
            <div className="space-y-4">
              <h3 className="font-semibold">Conciliar com</h3>

              <Tabs defaultValue={topSuggestion ? "suggestion" : "new"} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="suggestion" className="gap-2">
                    <Check className="h-4 w-4" />
                    Sugestão
                    {topSuggestion && (
                      <Badge variant="secondary" className="ml-1">
                        {currentSuggestions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="new" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova
                  </TabsTrigger>
                  <TabsTrigger value="multiple" className="gap-2">
                    <Link className="h-4 w-4" />
                    Múltiplas
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="suggestion" className="space-y-3 mt-4">
                  {currentSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma sugestão encontrada
                    </div>
                  ) : (
                    currentSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="rounded-lg border bg-card p-4 space-y-3 hover:border-primary cursor-pointer transition-colors"
                        onClick={() => handleAcceptSuggestion(suggestion.id)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {suggestion.matchScore}% compatível
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(suggestion.transaction_date)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{suggestion.description}</p>
                            {suggestion.person_name && (
                              <p className="text-sm text-muted-foreground">
                                {suggestion.person_name}
                              </p>
                            )}
                          </div>
                          <span className="font-bold">{formatCurrency(suggestion.amount)}</span>
                        </div>
                        <Button className="w-full" size="sm">
                          Confirmar conciliação
                        </Button>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="new" className="space-y-3 mt-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tipo</label>
                      <Select
                        value={currentState.newTransaction?.type || "payment"}
                        onValueChange={(newType: "payment" | "transfer") => {
                          const updated = {
                            ...currentState.newTransaction,
                            type: newType,
                            personName: currentState.newTransaction?.personName || "",
                            description: currentState.newTransaction?.description || currentTransaction.description,
                          };
                          updateReconciliationState(currentTransaction.id, {
                            action: "new",
                            newTransaction: updated,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment">Pagamento</SelectItem>
                          <SelectItem value="transfer">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {currentState.newTransaction?.type === "transfer" ? (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Conta de {currentTransaction.type === "CREDIT" ? "Origem" : "Destino"}
                        </label>
                        <Select
                          value={currentState.newTransaction?.targetAccountId?.toString() || ""}
                          onValueChange={(value) => {
                            const updated = {
                              ...currentState.newTransaction,
                              type: "transfer" as const,
                              personName: currentState.newTransaction?.personName || "",
                              description: currentState.newTransaction?.description || currentTransaction.description,
                              targetAccountId: parseInt(value),
                            };
                            updateReconciliationState(currentTransaction.id, {
                              action: "new",
                              newTransaction: updated,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a conta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts
                              .filter((acc) => acc.id !== bankAccountId)
                              .map((account) => (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  {account.account_name} - {account.bank_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {currentTransaction.type === "CREDIT"
                            ? "Selecione de qual conta saiu o dinheiro"
                            : "Selecione para qual conta foi o dinheiro"}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nome/Fornecedor</label>
                        <Input
                          placeholder="Digite o nome..."
                          value={currentState.newTransaction?.personName || ""}
                          onChange={(e) => {
                            const updated = {
                              ...currentState.newTransaction,
                              type: currentState.newTransaction?.type || ("payment" as const),
                              personName: e.target.value,
                              description: currentState.newTransaction?.description || currentTransaction.description,
                            };
                            updateReconciliationState(currentTransaction.id, {
                              action: "new",
                              newTransaction: updated,
                            });
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-2 block">Descrição</label>
                      <Input
                        value={
                          currentState.newTransaction?.description ||
                          currentTransaction.description
                        }
                        onChange={(e) => {
                          const updated = {
                            ...currentState.newTransaction,
                            type: currentState.newTransaction?.type || ("payment" as const),
                            personName: currentState.newTransaction?.personName || "",
                            description: e.target.value,
                          };
                          updateReconciliationState(currentTransaction.id, {
                            action: "new",
                            newTransaction: updated,
                          });
                        }}
                      />
                    </div>

                    {currentState.newTransaction?.type !== "transfer" && (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Categoria</label>
                          <Select
                            value={currentState.newTransaction?.categoryId?.toString() || ""}
                            onValueChange={(value) => {
                              const updated = {
                                ...currentState.newTransaction,
                                type: currentState.newTransaction?.type || ("payment" as const),
                                personName: currentState.newTransaction?.personName || "",
                                description: currentState.newTransaction?.description || currentTransaction.description,
                                categoryId: parseInt(value),
                              };
                              updateReconciliationState(currentTransaction.id, {
                                action: "new",
                                newTransaction: updated,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Centro de Custo</label>
                          <Input
                            placeholder="Digite o centro de custo..."
                            value={currentState.newTransaction?.costCenter || ""}
                            onChange={(e) => {
                              const updated = {
                                ...currentState.newTransaction,
                                type: currentState.newTransaction?.type || ("payment" as const),
                                personName: currentState.newTransaction?.personName || "",
                                description: currentState.newTransaction?.description || currentTransaction.description,
                                costCenter: e.target.value,
                              };
                              updateReconciliationState(currentTransaction.id, {
                                action: "new",
                                newTransaction: updated,
                              });
                            }}
                          />
                        </div>
                      </>
                    )}

                    <Button className="w-full" onClick={goToNext}>
                      Criar e continuar
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="multiple" className="space-y-3 mt-4">
                  <div className="space-y-4">
                    {/* Search */}
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por descrição, fornecedor..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSearchTransactions();
                            }
                          }}
                          className="pl-9"
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => {
                              setSearchQuery("");
                              setSearchResults([]);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Button onClick={handleSearchTransactions}>
                        Buscar
                      </Button>
                    </div>

                    {/* Selected total */}
                    {selectedMultiple.length > 0 && (
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {selectedMultiple.length} transações selecionadas
                            </p>
                            <p className="text-lg font-bold mt-1">
                              Total: {formatCurrency(getSelectedTotal())}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Extrato</p>
                            <p className="text-lg font-bold mt-1">
                              {formatCurrency(currentTransaction.amount)}
                            </p>
                          </div>
                        </div>
                        {Math.abs(getSelectedTotal() - Math.abs(currentTransaction.amount)) > 0.01 && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-sm text-warning">
                              ⚠️ Diferença: {formatCurrency(Math.abs(getSelectedTotal() - Math.abs(currentTransaction.amount)))}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Search results */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {searchResults.length === 0 && searchQuery && (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhuma transação encontrada
                        </div>
                      )}

                      {searchResults.length === 0 && !searchQuery && (
                        <div className="text-center py-8 text-muted-foreground">
                          Digite algo para buscar transações existentes
                        </div>
                      )}

                      {searchResults.map((result) => {
                        const isSelected = selectedMultiple.includes(result.id);
                        return (
                          <div
                            key={result.id}
                            className={`rounded-lg border p-3 cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            }`}
                            onClick={() => handleToggleMultiple(result.id)}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleMultiple(result.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-medium text-sm truncate">
                                    {result.description}
                                  </p>
                                  <span className="font-bold text-sm ml-2 shrink-0">
                                    {formatCurrency(result.amount)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {result.person_name && (
                                    <span>{result.person_name}</span>
                                  )}
                                  <span>•</span>
                                  <span>{formatDate(result.transaction_date)}</span>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    {result.type === "income" ? "Receita" : "Despesa"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Confirm button */}
                    {selectedMultiple.length > 0 && (
                      <Button
                        className="w-full"
                        onClick={handleConfirmMultiple}
                      >
                        Vincular {selectedMultiple.length} transações
                      </Button>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
