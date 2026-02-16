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

interface ReceberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivableId?: number;
  onSaved?: () => void;
}

export default function ReceberModal({ open, onOpenChange, receivableId, onSaved }: ReceberModalProps) {
  const [receivableData, setReceivableData] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [receiptType, setReceiptType] = useState<"total" | "parcial">("total");
  const [jurosValue, setJurosValue] = useState("");
  const [descontoValue, setDescontoValue] = useState("");
  const [valorReceber, setValorReceber] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (open && receivableId) {
      loadData();
    }
  }, [open, receivableId]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem("token");
      const [receivableRes, banksRes] = await Promise.all([
        fetch(`/api/accounts-receivable/${receivableId}`, {
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

      if (receivableRes.ok) {
        const data = await receivableRes.json();
        setReceivableData(data);
        // Convert amount to cents string before formatting (1450.00 → 145000 → "145000")
        const amountInCents = Math.round(parseFloat(data.amount) * 100).toString();
        setValorReceber(formatCurrencyInput(amountInCents));
        setSelectedBankId(data.bank_account_id?.toString() || "");
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
    setReceiptType("total");
    setJurosValue("");
    setDescontoValue("");
    setValorReceber("");
    setSelectedBankId("");
  };

  const calculateTotal = () => {
    if (!receivableData) return 0;
    
    const valorOriginal = parseFloat(receivableData.amount);
    const juros = parseCurrencyInput(jurosValue);
    const desconto = parseCurrencyInput(descontoValue);
    
    if (receiptType === "total") {
      return valorOriginal + juros - desconto;
    } else {
      return parseCurrencyInput(valorReceber);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSubmit = async () => {
    if (!selectedBankId) {
      alert("Por favor, selecione uma conta bancária.");
      return;
    }

    const totalRecebido = calculateTotal();
    if (totalRecebido <= 0) {
      alert("O valor a receber deve ser maior que zero.");
      return;
    }

    if (receiptType === "parcial" && totalRecebido >= parseFloat(receivableData.amount)) {
      alert("Para recebimento parcial, o valor deve ser menor que o valor total.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        bank_account_id: parseInt(selectedBankId),
        receipt_type: receiptType,
        juros: parseCurrencyInput(jurosValue),
        desconto: parseCurrencyInput(descontoValue),
        valor_recebido: totalRecebido,
      };

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/accounts-receivable/${receivableId}/receive-payment`, {
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
        alert(errorData.error || "Erro ao receber pagamento");
      }
    } catch (error) {
      console.error("Erro ao receber pagamento:", error);
      alert("Erro ao receber pagamento");
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

  if (!receivableData) {
    return null;
  }

  const valorOriginal = parseFloat(receivableData.amount);
  const totalCalculado = calculateTotal();
  const valorRestante = valorOriginal - totalCalculado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Receber Pagamento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Cliente: <span className="font-medium">{receivableData.customer_name}</span>
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Valor Original */}
          <div className="rounded-xl border bg-gray-50/50 dark:bg-gray-800/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Original</p>
                <p className="text-2xl font-bold">{formatCurrency(valorOriginal)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </div>

          {/* Tipo de Recebimento */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de Recebimento</Label>
            <RadioGroup value={receiptType} onValueChange={(v) => setReceiptType(v as "total" | "parcial")}>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="total" id="total" />
                <Label htmlFor="total" className="flex-1 cursor-pointer font-normal">
                  Receber Total
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="parcial" id="parcial" />
                <Label htmlFor="parcial" className="flex-1 cursor-pointer font-normal">
                  Receber Parcial
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Juros e Descontos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Juros
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0,00"
                  value={jurosValue}
                  onChange={(e) => setJurosValue(formatCurrencyInput(e.target.value))}
                  className="text-right pr-10"
                  disabled={receiptType === "parcial"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Desconto
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0,00"
                  value={descontoValue}
                  onChange={(e) => setDescontoValue(formatCurrencyInput(e.target.value))}
                  className="text-right pr-10"
                  disabled={receiptType === "parcial"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
              </div>
            </div>
          </div>

          {/* Valor a Receber (só aparece no modo parcial) */}
          {receiptType === "parcial" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Valor a Receber Agora</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0,00"
                  value={valorReceber}
                  onChange={(e) => setValorReceber(formatCurrencyInput(e.target.value))}
                  className="text-right text-lg font-semibold pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
              </div>
            </div>
          )}

          {/* Conta Bancária */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Conta Bancária <span className="text-red-600">*</span>
            </Label>
            <Select value={selectedBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta que receberá" />
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
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor Original:</span>
              <span className="font-medium">{formatCurrency(valorOriginal)}</span>
            </div>
            {receiptType === "total" && (
              <>
                {parseCurrencyInput(jurosValue) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">+ Juros:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(parseCurrencyInput(jurosValue))}
                    </span>
                  </div>
                )}
                {parseCurrencyInput(descontoValue) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-red-600">- Desconto:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(parseCurrencyInput(descontoValue))}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="pt-2 border-t flex items-center justify-between">
              <span className="font-semibold">Total a Receber:</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(totalCalculado)}
              </span>
            </div>
            {receiptType === "parcial" && valorRestante > 0 && (
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
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Recebimento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
