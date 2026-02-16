import { useState, useEffect } from "react";
import { Button } from "@/react-app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Label } from "@/react-app/components/ui/label";
import { Input } from "@/react-app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { formatCurrencyInput, parseCurrencyInput } from "@/react-app/utils/currency";

interface NovaRecorrenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NovaRecorrenciaDialog({ open, onOpenChange, onSuccess }: NovaRecorrenciaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [recurrenceType, setRecurrenceType] = useState<"monthly" | "installment">("monthly");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [dayOfMonth, setDayOfMonth] = useState("5");

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchCategories();
      fetchBankAccounts();
    }
  }, [open]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?type=expense");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch("/api/bank-accounts");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setBankAccounts(data.accounts || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !amount) {
      alert("Preencha descrição e valor.");
      return;
    }
    
    try {
      setLoading(true);
      
      const payload = {
        type,
        recurrence_type: recurrenceType,
        description,
        amount: parseCurrencyInput(amount),
        person_name: personName || null,
        person_id: personId ? parseInt(personId) : null,
        category_id: categoryId ? parseInt(categoryId) : null,
        cost_center: costCenter || null,
        bank_account: bankAccount || null,
        bank_account_id: bankAccountId ? parseInt(bankAccountId) : null,
        payment_method: paymentMethod || null,
        start_date: startDate,
        end_date: endDate || null,
        total_installments: recurrenceType === "installment" ? parseInt(totalInstallments) : null,
        day_of_month: recurrenceType === "monthly" ? parseInt(dayOfMonth) : null,
      };
      
      const response = await fetch("/api/recurring-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error("Failed to create");
      
      // Reset form
      setDescription("");
      setAmount("");
      setPersonName("");
      setPersonId("");
      setCategoryId("");
      setCostCenter("");
      setBankAccount("");
      setBankAccountId("");
      setPaymentMethod("");
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      setTotalInstallments("12");
      setDayOfMonth("5");
      
      onSuccess();
    } catch (error) {
      alert("Erro ao criar recorrência.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova recorrência</DialogTitle>
          <DialogDescription>
            Configure um lançamento que se repete mensalmente ou parcelado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="income">Recebimento</TabsTrigger>
              <TabsTrigger value="expense">Pagamento</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as "monthly" | "installment")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="installment">Parcelado</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Aluguel do escritório"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                {recurrenceType === "installment" ? "Valor total" : "Valor mensal"}
              </Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(formatCurrencyInput(e.target.value))}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          {type === "expense" ? (
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor (opcional)</Label>
              <Select value={personId} onValueChange={setPersonId}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.company_name || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente (opcional)</Label>
              <Input
                id="customer"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria (opcional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank">Conta bancária (opcional)</Label>
              <Select
                value={bankAccountId}
                onValueChange={(value) => {
                  setBankAccountId(value);
                  const account = bankAccounts.find(b => String(b.id) === value);
                  if (account) {
                    setBankAccount(`${account.account_name} - ${account.bank_name}`);
                  } else {
                    setBankAccount("");
                  }
                }}
              >
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.account_name} - {b.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de início</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            {recurrenceType === "monthly" ? (
              <div className="space-y-2">
                <Label htmlFor="day_of_month">Dia do mês</Label>
                <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                  <SelectTrigger id="day_of_month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="installments">Número de parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="2"
                  max="60"
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {recurrenceType === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="end_date">Data de término (opcional)</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para recorrência indefinida
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar recorrência
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
