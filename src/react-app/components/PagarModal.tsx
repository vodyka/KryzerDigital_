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
import { RadioGroup, RadioGroupItem } from "@/react-app/components/ui/radio-group";
import { Loader2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrencyInput, parseCurrencyInput } from "@/react-app/utils/currency";

interface PagarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payableId?: number;
  onSaved?: () => void;
}

export default function PagarModal({ open, onOpenChange, payableId, onSaved }: PagarModalProps) {
  const [payableData, setPayableData] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [paymentType, setPaymentType] = useState<"total" | "parcial">("total");
  const [jurosValue, setJurosValue] = useState("");
  const [descontoValue, setDescontoValue] = useState("");
  const [valorPagar, setValorPagar] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (open && payableId) {
      loadData();
    }
  }, [open, payableId]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem("token");
      const [payableRes, banksRes] = await Promise.all([
        fetch(`/api/accounts-payable/${payableId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/bank-accounts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      ]);

      if (payableRes.ok) {
        const data = await payableRes.json();
        const account = data.account;
        setPayableData(account);
        // Convert amount to cents string before formatting
        const amountInCents = Math.round(Math.abs(parseFloat(account.amount)) * 100).toString();
        setValorPagar(formatCurrencyInput(amountInCents));
        setSelectedBankId(account.bank_account_id?.toString() || "");
        // Set payment date to due_date by default
        const dueDate = new Date(account.due_date);
        const dateStr = dueDate.toISOString().split('T')[0];
        setPaymentDate(dateStr);
      }

      if (banksRes.ok) {
        const banksData = await banksRes.json();
        setBankAccounts(banksData.accounts || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar dados");
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setPaymentType("total");
    setJurosValue("");
    setDescontoValue("");
    setValorPagar("");
    setPaymentDate("");
    setSelectedBankId("");
  };

  const calculateTotal = () => {
    if (!payableData) return 0;
    
    const valorOriginal = Math.abs(parseFloat(payableData.amount));
    const juros = parseCurrencyInput(jurosValue);
    const desconto = parseCurrencyInput(descontoValue);
    
    if (paymentType === "total") {
      return valorOriginal + juros - desconto;
    } else {
      return parseCurrencyInput(valorPagar);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSubmit = async () => {
    if (!paymentDate) {
      alert("Por favor, selecione a data do pagamento.");
      return;
    }

    if (!selectedBankId) {
      alert("Por favor, selecione uma conta bancária.");
      return;
    }

    const totalPago = calculateTotal();
    if (totalPago <= 0) {
      alert("O valor a pagar deve ser maior que zero.");
      return;
    }

    if (paymentType === "parcial" && totalPago >= Math.abs(parseFloat(payableData.amount))) {
      alert("Para pagamento parcial, o valor deve ser menor que o valor total.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        bank_account_id: parseInt(selectedBankId),
        payment_type: paymentType,
        juros: parseCurrencyInput(jurosValue),
        desconto: parseCurrencyInput(descontoValue),
        valor_pago: totalPago,
        payment_date: paymentDate,
      };

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/accounts-payable/${payableId}/make-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        if (onSaved) {
          onSaved();
        }
        onOpenChange(false);
        resetForm();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Erro ao realizar pagamento");
      }
    } catch (error) {
      console.error("Erro ao realizar pagamento:", error);
      alert("Erro ao realizar pagamento");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-600 dark:text-gray-400">Carregando dados...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!payableData) {
    return null;
  }

  const valorOriginal = Math.abs(parseFloat(payableData.amount));
  const totalCalculado = calculateTotal();
  const valorRestante = valorOriginal - totalCalculado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Realizar Pagamento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Fornecedor: <span className="font-medium">{payableData.company_name}</span>
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Valor Original */}
          <div className="rounded-xl border bg-gray-50/50 dark:bg-gray-800/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Original</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(valorOriginal)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Tipo de Pagamento */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Pagamento</Label>
            <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as "total" | "parcial")}>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="total" id="total" />
                <Label htmlFor="total" className="flex-1 cursor-pointer font-normal">
                  Pagar Total
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="parcial" id="parcial" />
                <Label htmlFor="parcial" className="flex-1 cursor-pointer font-normal">
                  Pagar Parcial
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Juros e Descontos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-red-600" />
                Juros
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0,00"
                  value={jurosValue}
                  onChange={(e) => setJurosValue(formatCurrencyInput(e.target.value))}
                  className="text-right pr-10"
                  disabled={paymentType === "parcial"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                Desconto
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0,00"
                  value={descontoValue}
                  onChange={(e) => setDescontoValue(formatCurrencyInput(e.target.value))}
                  className="text-right pr-10"
                  disabled={paymentType === "parcial"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
              </div>
            </div>
          </div>

          {/* Valor a Pagar (só aparece no modo parcial) */}
          {paymentType === "parcial" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Valor a Pagar Agora</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0,00"
                  value={valorPagar}
                  onChange={(e) => setValorPagar(formatCurrencyInput(e.target.value))}
                  className="text-right text-lg font-semibold pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
              </div>
            </div>
          )}

          {/* Data do Pagamento */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Data do Pagamento <span className="text-red-600">*</span>
            </Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              Data de vencimento: {new Date(payableData.due_date).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Conta Bancária */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Conta Bancária <span className="text-red-600">*</span>
            </Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta que fará o pagamento" />
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

          {/* Resumo */}
          <div className="rounded-xl border-2 border-red-600/20 bg-red-600/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor Original:</span>
              <span className="font-medium">{formatCurrency(valorOriginal)}</span>
            </div>
            {paymentType === "total" && (
              <>
                {parseCurrencyInput(jurosValue) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600">+ Juros:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(parseCurrencyInput(jurosValue))}
                    </span>
                  </div>
                )}
                {parseCurrencyInput(descontoValue) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">- Desconto:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(parseCurrencyInput(descontoValue))}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="font-semibold">Total a Pagar:</span>
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalCalculado)}
              </span>
            </div>
            {paymentType === "parcial" && valorRestante > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor Restante:</span>
                <span className="font-medium text-orange-600">
                  {formatCurrency(valorRestante)}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Pagamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
