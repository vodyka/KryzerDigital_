import { useState, useEffect } from "react";
import { Loader2, Pencil, Trash2, ArrowDownLeft, ArrowUpRight, Calendar, Tag, Building, User, Landmark, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Label } from "@/react-app/components/ui/label";
import { Input } from "@/react-app/components/ui/input";
import { Textarea } from "@/react-app/components/ui/textarea";
import { Badge } from "@/react-app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Separator } from "@/react-app/components/ui/separator";
import { formatCurrencyInput, parseCurrencyInput } from "@/react-app/utils/currency";

interface Transaction {
  id: number;
  type: "income" | "expense";
  transaction_date: string;
  paid_date: string | null;
  created_date: string;
  description: string;
  category_id: number | null;
  category_name: string | null;
  cost_center: string | null;
  bank_account: string | null;
  bank_account_id: number | null;
  payment_method: string | null;
  amount: number;
  is_paid: number;
  person_name: string | null;
  origin: string;
  status: "received" | "paid" | "pending";
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

interface LancamentoDetailsDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export function LancamentoDetailsDialog({ 
  transaction, 
  open, 
  onOpenChange,
  onUpdate,
  onDelete
}: LancamentoDetailsDialogProps) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    if (open && transaction) {
      loadFormData();
      populateForm();
    }
    setEditMode(false);
  }, [open, transaction]);

  const loadFormData = async () => {
    try {
      setLoading(true);

      const [catResponse, bankResponse, suppResponse] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/bank-accounts"),
        fetch("/api/suppliers"),
      ]);

      if (catResponse.ok) {
        const catData = await catResponse.json();
        setCategories(catData.categories || []);
      }

      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        setBankAccounts(bankData.accounts || []);
      }

      if (suppResponse.ok) {
        const suppData = await suppResponse.json();
        setSuppliers(suppData.suppliers || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = () => {
    if (!transaction) return;

    setDescription(transaction.description);
    setAmount(formatCurrencyInput((Math.abs(transaction.amount) * 100).toString()));
    setDate(transaction.transaction_date);
    setIsPaid(transaction.is_paid === 1);
    setPaidDate(transaction.paid_date || "");
    setCategoryId(transaction.category_id?.toString() || "");
    setCostCenter(transaction.cost_center || "");
    setPersonName(transaction.person_name || "");
    setBankAccountId(transaction.bank_account_id?.toString() || "");
    setPaymentMethod(transaction.payment_method || "");
    setSupplierId("");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setAmount(formatted);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  };

  const handleSave = async () => {
    if (!transaction || !description || !amount || !date) return;

    try {
      setSaving(true);

      const numericAmount = parseCurrencyInput(amount);
      const bankAccount = bankAccounts.find(ba => ba.id.toString() === bankAccountId);
      const bankAccountName = bankAccount 
        ? `${bankAccount.account_name} - ${bankAccount.bank_name}`
        : null;

      if (transaction.type === "income") {
        const response = await fetch(`/api/accounts-receivable/${transaction.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receipt_date: date,
            customer_name: personName || "Cliente",
            description,
            category_id: categoryId || null,
            cost_center: costCenter || null,
            bank_account: bankAccountName,
            amount: numericAmount,
          }),
        });

        if (!response.ok) throw new Error("Erro ao atualizar");
      } else {
        const response = await fetch(`/api/accounts-payable/${transaction.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: supplierId || null,
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

        if (!response.ok) throw new Error("Erro ao atualizar");

        // Update payment status if needed
        if (isPaid !== (transaction.is_paid === 1)) {
          const endpoint = isPaid ? "pay" : "unpay";
          await fetch(`/api/accounts-payable/${transaction.id}/${endpoint}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bank_account_id: bankAccountId || null }),
          });
        }
      }

      setEditMode(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    const confirmMsg = `Confirma a exclusão do lançamento "${transaction.description}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      setDeleting(true);

      const endpoint = transaction.type === "income" 
        ? `/api/accounts-receivable/${transaction.id}`
        : `/api/accounts-payable/${transaction.id}`;

      const response = await fetch(endpoint, { method: "DELETE" });

      if (!response.ok) throw new Error("Erro ao excluir");

      onOpenChange(false);
      if (onDelete) onDelete();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                transaction.type === "income" 
                  ? "bg-success/10 text-success" 
                  : "bg-primary/10 text-primary"
              }`}>
                {transaction.type === "income" ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </div>
              <DialogTitle>
                {editMode ? "Editar lançamento" : "Detalhes do lançamento"}
              </DialogTitle>
            </div>
            {!editMode && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditMode(true)}
                  disabled={transaction.origin === "import"}
                  title={transaction.origin === "import" ? "Lançamentos importados não podem ser editados" : "Editar"}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogDescription>
            {transaction.type === "income" ? "Entrada financeira" : "Saída financeira"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {editMode ? (
            <>
              {/* Edit Mode */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição *</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Valor *</Label>
                  <Input
                    id="edit-amount"
                    value={amount}
                    onChange={handleAmountChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Data *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {transaction.type === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Fornecedor</Label>
                  <Select value={supplierId} onValueChange={setSupplierId} disabled={loading}>
                    <SelectTrigger id="edit-supplier">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não alterar</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.trade_name || supplier.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {transaction.type === "income" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-customer">Cliente</Label>
                  <Input
                    id="edit-customer"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId} disabled={loading}>
                    <SelectTrigger id="edit-category">
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

                <div className="space-y-2">
                  <Label htmlFor="edit-cost-center">Centro de custos</Label>
                  <Input
                    id="edit-cost-center"
                    value={costCenter}
                    onChange={(e) => setCostCenter(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bank">Conta bancária</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={loading}>
                  <SelectTrigger id="edit-bank">
                    <SelectValue placeholder="Selecione..." />
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

              {transaction.type === "expense" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-payment-method">Forma de pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="edit-payment-method">
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

              {transaction.type === "expense" && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-is-paid" className="cursor-pointer">
                      Marcar como pago?
                    </Label>
                    <input
                      type="checkbox"
                      id="edit-is-paid"
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
                      <Label htmlFor="edit-paid-date">Data do pagamento</Label>
                      <Input
                        id="edit-paid-date"
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className="space-y-4">
                {/* Description and Amount */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                    <p className="text-base font-medium">{transaction.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valor</p>
                    <p className={`text-2xl font-bold ${
                      transaction.type === "income" ? "text-success" : "text-foreground"
                    }`}>
                      {transaction.type === "income" ? "+" : ""}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                    </div>
                    <p className="text-sm font-medium">{formatDate(transaction.transaction_date)}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Pagamento</p>
                    </div>
                    <p className="text-sm font-medium">
                      {transaction.paid_date ? formatDate(transaction.paid_date) : "-"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Criação</p>
                    </div>
                    <p className="text-sm font-medium">{formatDate(transaction.created_date)}</p>
                  </div>
                </div>

                <Separator />

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  {transaction.category_name && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Categoria</p>
                      </div>
                      <p className="text-sm font-medium">{transaction.category_name}</p>
                    </div>
                  )}
                  
                  {transaction.cost_center && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Centro de custos</p>
                      </div>
                      <p className="text-sm font-medium">{transaction.cost_center}</p>
                    </div>
                  )}

                  {transaction.person_name && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {transaction.type === "income" ? "Cliente" : "Fornecedor"}
                        </p>
                      </div>
                      <p className="text-sm font-medium">{transaction.person_name}</p>
                    </div>
                  )}

                  {transaction.bank_account && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Conta bancária</p>
                      </div>
                      <p className="text-sm font-medium">{transaction.bank_account}</p>
                    </div>
                  )}

                  {transaction.payment_method && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                      </div>
                      <p className="text-sm font-medium">{transaction.payment_method}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Status and Origin */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge className={
                      transaction.status === "received" || transaction.status === "paid"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted text-muted-foreground border-muted-foreground/20"
                    }>
                      {transaction.status === "received" ? "Recebido" : 
                       transaction.status === "paid" ? "Pago" : "Previsto"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Origem</p>
                    <Badge variant="outline">
                      {transaction.origin === "import" ? "Importado" : "Manual"}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {editMode ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditMode(false);
                  populateForm();
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !description || !amount || !date}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
