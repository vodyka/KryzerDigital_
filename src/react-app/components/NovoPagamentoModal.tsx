import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Badge } from "@/react-app/components/ui/badge";
import { AlertCircle, Loader2, ArrowDown, Star, Paperclip, FileText, X, Plus } from "lucide-react";
import { formatCurrencyInput, parseCurrencyInput } from "@/react-app/utils/currency";
import { Switch } from "@/react-app/components/ui/switch";
import { PAYMENT_METHODS } from "@/react-app/constants/payment-methods";

interface NovoPagamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: number | null;
  onSaved?: () => void;
}

interface Supplier {
  id: number;
  company_name: string;
  trade_name: string;
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
}

interface CategoryLine {
  id: string;
  category_id: string;
  detalhamento: string;
  value: string;
}

function normalizeDateInput(d: string) {
  if (!d) return "";
  return d.split("T")[0];
}

export default function NovoPagamentoModal({
  open,
  onOpenChange,
  accountId,
  onSaved,
}: NovoPagamentoModalProps) {
  const [dueDate, setDueDate] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [categoryLines, setCategoryLines] = useState<CategoryLine[]>([
    { id: "1", category_id: "", detalhamento: "", value: "" }
  ]);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [bankAccountId, setBankAccountId] = useState("");

  const [valoresDetalhados, setValoresDetalhados] = useState(false);
  const [recorrencia, setRecorrencia] = useState(false);
  const [reembolsavel, setReembolsavel] = useState(false);

  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [hasBankAccounts, setHasBankAccounts] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      loadData();
      if (accountId) loadAccount();
      else resetForm();
    }
  }, [open, accountId]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Load suppliers
      const suppliersRes = await fetch("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData.suppliers || []);
      }

      // Load categories (only expense)
      const categoriesRes = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const expenseCategories = (categoriesData.categories || []).filter(
          (cat: Category) => cat.type === "expense"
        );
        setCategories(expenseCategories);
      }

      // Load bank accounts
      const banksRes = await fetch("/api/bank-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        const accounts = banksData.accounts || [];
        setBankAccounts(accounts);
        setHasBankAccounts(accounts.length > 0);

        if (accounts.length === 0 && !accountId) {
          setError(
            "Você precisa cadastrar pelo menos uma conta bancária antes de criar um pagamento."
          );
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setDueDate(today);
    setScheduledDate(today);
    setSupplierId("");
    setDescription("");
    setReference("");
    setCategoryLines([{ id: "1", category_id: "", detalhamento: "", value: "" }]);
    setPaymentMethod("Pix");
    setValoresDetalhados(false);
    setRecorrencia(false);
    setReembolsavel(false);
    setError("");
  };

  const loadAccount = async () => {
    if (!accountId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/accounts-payable/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const account = data.account;

        setDueDate(normalizeDateInput(account.due_date));
        setScheduledDate(normalizeDateInput(account.competence_date || account.due_date));
        setSupplierId(account.supplier_id?.toString() || "");
        setDescription(account.description || "");
        setReference(account.reference || "");
        setPaymentMethod(account.payment_method || "Pix");
        setBankAccountId(account.bank_account_id?.toString() || "");

        // Load category data
        if (account.category_details) {
          try {
            const details = JSON.parse(account.category_details);
            if (Array.isArray(details) && details.length > 0) {
              setCategoryLines(details.map((item: any, index: number) => {
                const amountInCents = Math.round(Math.abs(parseFloat(item.value || 0)) * 100).toString();
                return {
                  id: (index + 1).toString(),
                  category_id: item.category_id?.toString() || "",
                  detalhamento: item.detalhamento || "",
                  value: formatCurrencyInput(amountInCents)
                };
              }));
            }
          } catch (e) {
            console.error("Error parsing category_details:", e);
            if (account.category_id) {
              const amountInCents = Math.round(Math.abs(parseFloat(account.amount)) * 100).toString();
              setCategoryLines([{
                id: "1",
                category_id: account.category_id.toString(),
                detalhamento: account.cost_center || "",
                value: formatCurrencyInput(amountInCents)
              }]);
            }
          }
        } else if (account.category_id) {
          const amountInCents = Math.round(Math.abs(parseFloat(account.amount)) * 100).toString();
          setCategoryLines([{
            id: "1",
            category_id: account.category_id.toString(),
            detalhamento: account.cost_center || "",
            value: formatCurrencyInput(amountInCents)
          }]);
        }
      }
    } catch (err) {
      console.error("Error loading account:", err);
      setError("Erro ao carregar dados da conta");
    } finally {
      setLoading(false);
    }
  };

  const addCategoryLine = () => {
    const newId = (categoryLines.length + 1).toString();
    setCategoryLines([...categoryLines, { id: newId, category_id: "", detalhamento: "", value: "" }]);
  };

  const removeCategoryLine = (id: string) => {
    if (categoryLines.length === 1) return;
    setCategoryLines(categoryLines.filter(line => line.id !== id));
  };

  const updateCategoryLine = (id: string, field: keyof CategoryLine, value: string) => {
    setCategoryLines(categoryLines.map(line =>
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasBankAccounts && !accountId) return;

    if (!dueDate) {
      setError("Preencha a data de vencimento");
      return;
    }

    // Validate at least one category with value
    const validLines = categoryLines.filter(line => line.category_id && line.value);
    if (validLines.length === 0) {
      setError("Adicione pelo menos uma categoria com valor");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Calculate total amount
      const totalAmount = categoryLines.reduce((sum, line) => {
        const lineValue = parseCurrencyInput(line.value);
        return sum + (isNaN(lineValue) ? 0 : lineValue);
      }, 0);

      if (totalAmount <= 0) {
        setError("O valor total deve ser maior que zero");
        setLoading(false);
        return;
      }

      const selectedBank = bankAccounts.find(b => b.id.toString() === bankAccountId);
      const bankAccountName = selectedBank 
        ? `${selectedBank.account_name} - ${selectedBank.bank_name}`
        : "";

      // Prepare category details as JSON string
      const categoryDetails = JSON.stringify(
        validLines.map(line => ({
          category_id: parseInt(line.category_id),
          detalhamento: line.detalhamento || null,
          value: parseCurrencyInput(line.value)
        }))
      );

      const payload = {
        supplier_id: supplierId ? parseInt(supplierId) : null,
        due_date: dueDate,
        competence_date: scheduledDate || dueDate,
        description: description || "",
        reference: reference || "",
        amount: -Math.abs(totalAmount), // expense negative
        category_id: validLines.length > 0 ? parseInt(validLines[0].category_id) : null,
        category_details: categoryDetails,
        cost_center: validLines[0]?.detalhamento || null,
        payment_method: paymentMethod,
        bank_account: bankAccountName,
        bank_account_id: bankAccountId ? parseInt(bankAccountId) : null,
      };

      const token = localStorage.getItem("token");
      let response: Response;
      if (accountId) {
        response = await fetch(`/api/accounts-payable/${accountId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/accounts-payable", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        onSaved?.();
        onOpenChange(false);
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erro ao salvar");
      }
    } catch (err) {
      console.error("Error saving payment:", err);
      setError("Erro ao salvar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = categoryLines.reduce((sum, line) => {
    const lineValue = parseCurrencyInput(line.value);
    return sum + (isNaN(lineValue) ? 0 : lineValue);
  }, 0);

  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalAmount);

  if (!hasBankAccounts && !accountId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atenção</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={() => (window.location.href = "/financeiro/bancos")}>
              Ir para Bancos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[96vw]
          max-w-[1200px]
          lg:max-w-[1280px]
          xl:max-w-[1400px]
          2xl:max-w-[1520px]
          p-0
          overflow-hidden
        "
      >
        {/* Header fixo */}
        <DialogHeader className="px-6 py-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <DialogTitle className="text-lg sm:text-xl leading-tight">
                  {accountId ? "Editar Pagamento" : "Novo Pagamento"}
                </DialogTitle>
                <span className="text-xs text-muted-foreground">
                  {accountId ? "Atualize as informações deste pagamento" : "Agende um novo pagamento"}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Star className="h-4 w-4" />
              </Button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Paperclip className="h-4 w-4" />
                Anotações
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <FileText className="h-4 w-4" />
                Arquivos
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com scroll */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Não foi possível salvar
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção 1: Datas + Fornecedor */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Dados principais</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Defina datas e selecione o fornecedor.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Datas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Vencimento</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">Previsto para</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Fornecedor */}
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger id="supplier" className="h-11">
                      <SelectValue placeholder="Selecione um fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.trade_name || supplier.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Descrição e Referência */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Descrição <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="description"
                      placeholder="Ex.: Frete, aluguel..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">
                      Referência <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="reference"
                      placeholder="NF, boleto..."
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 2: Categorias */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Categorias e valores</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Distribua o total por categoria (uma ou mais linhas).
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                <div className="hidden md:grid grid-cols-[1.7fr_1.7fr_1fr_auto] gap-3 text-xs text-muted-foreground px-1">
                  <span>Categoria</span>
                  <span>Detalhamento</span>
                  <span className="text-right">Valor</span>
                  <span />
                </div>

                <div className="space-y-3">
                  {categoryLines.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-xl border p-3 md:p-0 md:border-0"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1.7fr_1fr_auto] gap-3 items-end">
                        <div className="space-y-2">
                          <Label className="md:sr-only">Categoria</Label>
                          <Select
                            value={line.category_id}
                            onValueChange={(value) => updateCategoryLine(line.id, "category_id", value)}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted bg background">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <ArrowDown className="w-4 h-4 text-red-600" />
                                    {category.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="md:sr-only">
                            Detalhamento <span className="text-muted-foreground text-xs">(opcional)</span>
                          </Label>
                          <Input
                            className="h-11"
                            placeholder="Detalhes (opcional)…"
                            value={line.detalhamento}
                            onChange={(e) => updateCategoryLine(line.id, "detalhamento", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="md:sr-only">Valor</Label>
                          <Input
                            type="text"
                            className="h-11 text-right tabular-nums"
                            placeholder="0,00"
                            value={line.value}
                            onChange={(e) =>
                              updateCategoryLine(line.id, "value", formatCurrencyInput(e.target.value))
                            }
                          />
                        </div>

                        <div className="flex md:justify-end">
                          {categoryLines.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCategoryLine(line.id)}
                              className="h-11 w-11"
                              title="Remover linha"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div className="h-11 w-11" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCategoryLine}
                    className="h-10 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar categoria
                  </Button>
                </div>
              </div>
            </section>

            {/* Seção 3: Pagamento */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Pagamento</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Forma de pagamento e conta bancária.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Forma de pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="paymentMethod" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Conta bancária</Label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger id="bankAccount" className="h-11">
                        <SelectValue placeholder="Selecione uma conta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id.toString()}>
                            {bank.account_name} - {bank.bank_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 4: Preferências */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Opções</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configurações adicionais para este pagamento.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="valoresDetalhados" className="cursor-pointer font-normal">
                      Valores detalhados
                    </Label>
                    {valoresDetalhados && (
                      <Badge variant="secondary" className="text-xs">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <Switch
                    id="valoresDetalhados"
                    checked={valoresDetalhados}
                    onCheckedChange={setValoresDetalhados}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <Label htmlFor="recorrencia" className="cursor-pointer font-normal">
                    Recorrência ou Parcelamento
                  </Label>
                  <Switch
                    id="recorrencia"
                    checked={recorrencia}
                    onCheckedChange={setRecorrencia}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <Label htmlFor="reembolsavel" className="cursor-pointer font-normal">
                    Reembolsável
                  </Label>
                  <Switch
                    id="reembolsavel"
                    checked={reembolsavel}
                    onCheckedChange={setReembolsavel}
                  />
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer fixo */}
        <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
            <div className="flex items-baseline justify-between sm:justify-start gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold tabular-nums text-red-600">{formattedTotal}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-11"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className="h-11 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
