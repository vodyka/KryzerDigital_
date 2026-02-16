import { useState, useEffect } from "react";
import { Plus, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Label } from "@/react-app/components/ui/label";
import { Input } from "@/react-app/components/ui/input";
import { Textarea } from "@/react-app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import { formatCurrencyInput, parseCurrencyInput } from "@/react-app/utils/currency";

interface NovoLancamentoDialogProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface Category {
  id: number;
  name: string;
}

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
}

interface Supplier {
  id: number;
  company_name: string;
  trade_name: string;
}

export function NovoLancamentoDialog({ onSuccess, trigger }: NovoLancamentoDialogProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [paidDate, setPaidDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [personName, setPersonName] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  // Data lists
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [costCenters, setCostCenters] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadFormData();
      resetForm();
    }
  }, [open]);

  const loadFormData = async () => {
    try {
      setLoading(true);

      // Load categories
      const catResponse = await fetch("/api/categories");
      if (catResponse.ok) {
        const catData = await catResponse.json();
        setCategories(catData.categories || []);
      }

      // Load bank accounts
      const bankResponse = await fetch("/api/bank-accounts");
      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        setBankAccounts(bankData.accounts || []);
        
        const defaultAccount = bankData.accounts?.find((acc: BankAccount) => acc.id);
        if (defaultAccount) {
          setBankAccountId(defaultAccount.id.toString());
        }
      }

      // Load suppliers (for expenses)
      const suppResponse = await fetch("/api/suppliers");
      if (suppResponse.ok) {
        const suppData = await suppResponse.json();
        setSuppliers(suppData.suppliers || []);
      }

      // Load cost centers from existing transactions
      const lancResponse = await fetch("/api/lancamentos");
      if (lancResponse.ok) {
        const lancData = await lancResponse.json();
        const centers = new Set<string>();
        lancData.transactions?.forEach((t: any) => {
          if (t.cost_center) centers.add(t.cost_center);
        });
        setCostCenters(Array.from(centers).sort());
      }
    } catch (error) {
      console.error("Erro ao carregar dados do formulário:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split('T')[0]);
    setIsPaid(false);
    setPaidDate("");
    setCategoryId("");
    setCostCenter("");
    setPersonName("");
    setSupplierId("");
    setPaymentMethod("");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setAmount(formatted);
  };

  const handleSubmit = async () => {
    if (!description || !amount || !date) {
      return;
    }

    try {
      setSubmitting(true);

      const numericAmount = parseCurrencyInput(amount);
      const bankAccount = bankAccounts.find(ba => ba.id.toString() === bankAccountId);
      const bankAccountName = bankAccount 
        ? `${bankAccount.account_name} - ${bankAccount.bank_name}`
        : null;

      if (type === "income") {
        // Create accounts receivable
        const response = await fetch("/api/accounts-receivable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receipt_date: isPaid ? (paidDate || date) : date,
            customer_name: personName || "Cliente",
            description,
            category_id: categoryId || null,
            cost_center: costCenter || null,
            bank_account: bankAccountName,
            amount: numericAmount,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao criar recebimento");
        }
      } else {
        // Create accounts payable - need a supplier
        let finalSupplierId = supplierId;
        
        if (!finalSupplierId) {
          // Create a generic supplier if none selected
          const genericSupplier = suppliers.find(s => s.company_name === "Fornecedor (geral)");
          if (genericSupplier) {
            finalSupplierId = genericSupplier.id.toString();
          } else {
            const createResponse = await fetch("/api/suppliers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                person_type: "PJ",
                company_name: "Fornecedor (geral)",
                trade_name: "Fornecedor (geral)",
                status: "Ativo",
              }),
            });
            
            if (createResponse.ok) {
              const newSupp = await createResponse.json();
              finalSupplierId = newSupp.id.toString();
            }
          }
        }

        const response = await fetch("/api/accounts-payable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: finalSupplierId,
            due_date: date,
            competence_date: date,
            description,
            amount: numericAmount,
            category_id: categoryId || null,
            cost_center: costCenter || null,
            payment_method: paymentMethod || null,
            bank_account: bankAccountName,
            bank_account_id: bankAccountId || null,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao criar pagamento");
        }

        // If marked as paid, update it
        if (isPaid) {
          const data = await response.json();
          await fetch(`/api/accounts-payable/${data.id}/pay`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bank_account_id: bankAccountId || null }),
          });
        }
      }

      setOpen(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Erro ao criar lançamento:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo lançamento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>
            Crie uma nova entrada ou saída financeira
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type Selection */}
          <Tabs value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income" className="gap-2">
                <ArrowDownLeft className="h-4 w-4" />
                Entrada
              </TabsTrigger>
              <TabsTrigger value="expense" className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Saída
              </TabsTrigger>
            </TabsList>

            <TabsContent value={type} className="space-y-4 mt-4">
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o lançamento..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <Input
                    id="amount"
                    placeholder="0,00"
                    value={amount}
                    onChange={handleAmountChange}
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">
                    {type === "income" ? "Data de recebimento *" : "Data de vencimento *"}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Person/Supplier */}
              {type === "expense" ? (
                <div className="space-y-2">
                  <Label htmlFor="supplier">Fornecedor</Label>
                  <Select value={supplierId} onValueChange={setSupplierId} disabled={loading}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Selecione um fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Fornecedor (geral)</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.trade_name || supplier.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="customer">Cliente</Label>
                  <Input
                    id="customer"
                    placeholder="Nome do cliente..."
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} disabled={loading}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem categoria</SelectItem>
                      {categories
                        .filter(cat => cat.name !== "Todas")
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cost Center */}
                <div className="space-y-2">
                  <Label htmlFor="cost-center">Centro de custos</Label>
                  <Input
                    id="cost-center"
                    placeholder="Ex: Administrativo"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                    list="cost-centers-list"
                  />
                  <datalist id="cost-centers-list">
                    {costCenters.map((center) => (
                      <option key={center} value={center} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Bank Account */}
              <div className="space-y-2">
                <Label htmlFor="bank-account">Conta bancária</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={loading}>
                  <SelectTrigger id="bank-account">
                    <SelectValue placeholder="Selecione uma conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem conta específica</SelectItem>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.account_name} - {account.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method (only for expenses) */}
              {type === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="payment-method">Forma de pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="payment-method">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não especificado</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                      <SelectItem value="Cartão de débito">Cartão de débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Payment Status */}
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-paid" className="cursor-pointer">
                    {type === "income" ? "Já foi recebido?" : "Já foi pago?"}
                  </Label>
                  <input
                    type="checkbox"
                    id="is-paid"
                    checked={isPaid}
                    onChange={(e) => {
                      setIsPaid(e.target.checked);
                      if (!e.target.checked) {
                        setPaidDate("");
                      } else {
                        setPaidDate(date);
                      }
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                </div>
                {isPaid && (
                  <div className="space-y-2">
                    <Label htmlFor="paid-date">
                      {type === "income" ? "Data do recebimento" : "Data do pagamento"}
                    </Label>
                    <Input
                      id="paid-date"
                      type="date"
                      value={paidDate}
                      onChange={(e) => setPaidDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!description || !amount || !date || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Criar lançamento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
