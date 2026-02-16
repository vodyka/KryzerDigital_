import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Textarea } from "@/react-app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import {
  Plus,
  Trash2,
  Calendar,
  Building2,
  Receipt,
  Wallet,
  X,
  CheckCircle2,
} from "lucide-react";

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  created_at: string;
  total_items: number;
}

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  bank_account: string;
  notes: string;
  created_at: string;
}

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
}

interface AccountPayableDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number | null;
  onUpdated?: () => void;
}

export default function AccountPayableDetailsModal({
  open,
  onOpenChange,
  accountId,
  onUpdated,
}: AccountPayableDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Payment form fields
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (open && accountId) {
      loadAccountDetails();
      loadBankAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accountId]);

  const loadBankAccounts = async () => {
    try {
      const response = await fetch("/api/bank-accounts");
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.accounts || []);

        const defaultBank = (data.accounts || []).find((b: any) => b.is_default);
        if (defaultBank) setBankAccountId(defaultBank.id.toString());
      }
    } catch (error) {
      console.error("Error loading bank accounts:", error);
    }
  };

  const loadAccountDetails = async () => {
    if (!accountId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/accounts-payable/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setAccount(data.account);
        setOrders(data.orders || []);
        setPayments(data.payments || []);

        if (data.account?.bank_account_id) {
          setBankAccountId(data.account.bank_account_id.toString());
        }
      }
    } catch (error) {
      console.error("Error loading account details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!accountId || !paymentAmount || !paymentDate) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const selectedBank = bankAccounts.find(
        (b) => b.id.toString() === bankAccountId
      );
      const bankAccountName = selectedBank
        ? `${selectedBank.account_name} - ${selectedBank.bank_name}`
        : "";

      const response = await fetch("/api/payment-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_payable_id: accountId,
          amount: parseFloat(paymentAmount.replace(",", ".")),
          payment_date: paymentDate,
          payment_method: paymentMethod,
          bank_account: bankAccountName,
          bank_account_id: bankAccountId ? parseInt(bankAccountId) : null,
          notes: paymentNotes,
        }),
      });

      if (response.ok) {
        setShowPaymentForm(false);
        setPaymentAmount("");
        setPaymentNotes("");
        await loadAccountDetails();
        onUpdated?.();
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao registrar pagamento");
      }
    } catch (error) {
      console.error("Error registering payment:", error);
      alert("Erro ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm("Tem certeza que deseja excluir este pagamento?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/payment-records/${paymentId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await loadAccountDetails();
        onUpdated?.();
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("pt-BR");

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("pt-BR");

  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
    [payments]
  );

  const totalValue = account ? Math.abs(parseFloat(account.amount)) : 0;
  const outstandingRaw = account ? parseFloat(account.amount) - totalPaid : 0;
  const outstanding = Math.max(0, Math.abs(outstandingRaw)); // saldo a pagar (positivo)
  const isSettled = outstanding <= 0.000001;

  const headerSubtitle = account
    ? `${account.company_name || "Fornecedor"} • Venc. ${formatDate(account.due_date)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-none sm:max-w-[1200px] max-h-[92vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 sm:px-8 py-5 border-b bg-white dark:bg-gray-900">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-semibold">
                Detalhes da Conta a Pagar
              </DialogTitle>
              {headerSubtitle && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {headerSubtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && !account ? (
            <div className="py-12 text-center text-gray-500">Carregando...</div>
          ) : account ? (
            <div className="p-6 sm:p-8 space-y-6">
              {/* Summary cards (fintech style) */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    Fornecedor
                  </div>
                  <div className="mt-2 font-semibold text-base sm:text-lg truncate">
                    {account.company_name}
                  </div>
                </div>

                <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Vencimento
                  </div>
                  <div className="mt-2 font-semibold text-base sm:text-lg">
                    {formatDate(account.due_date)}
                  </div>
                </div>

                <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Receipt className="w-4 h-4" />
                    Valor total
                  </div>
                  <div className="mt-2 font-semibold text-base sm:text-lg">
                    {formatCurrency(totalValue)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Pago: {formatCurrency(Math.abs(totalPaid))}
                  </div>
                </div>

                <div className="rounded-xl border bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="w-4 h-4" />
                    Saldo devedor
                  </div>
                  <div
                    className={`mt-2 font-bold text-xl ${
                      isSettled
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(outstanding)}
                  </div>
                  {isSettled && (
                    <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Quitado
                    </div>
                  )}
                </div>
              </div>

              {/* Linked orders */}
              {account.is_grouped === 1 && orders.length > 0 && (
                <section className="rounded-xl border bg-white dark:bg-gray-900 overflow-hidden">
                  <div className="px-5 py-4 border-b">
                    <h3 className="font-semibold">
                      Pedidos vinculados{" "}
                      <span className="text-muted-foreground font-normal">
                        ({orders.length})
                      </span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/70 dark:bg-gray-800/40">
                          <TableHead>Número do Pedido</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Itens</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                            <TableCell className="font-medium">
                              {order.order_number}
                            </TableCell>
                            <TableCell>{formatDate(order.created_at)}</TableCell>
                            <TableCell className="text-right">
                              {order.total_items || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(order.total_amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              )}

              {/* Payment history */}
              <section className="rounded-xl border bg-white dark:bg-gray-900 overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      Histórico de pagamentos{" "}
                      <span className="text-muted-foreground font-normal">
                        ({payments.length})
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Registre pagamentos parciais e mantenha o saldo atualizado.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {outstanding > 0 && !showPaymentForm && (
                      <Button
                        onClick={() => setShowPaymentForm(true)}
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Registrar pagamento
                      </Button>
                    )}
                  </div>
                </div>

                {/* Payment form */}
                {showPaymentForm && (
                  <div className="px-5 py-5 border-b bg-gray-50/60 dark:bg-gray-800/25">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-base font-semibold">Novo pagamento</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Disponível para quitar:{" "}
                          <span className="font-medium">
                            {formatCurrency(outstanding)}
                          </span>
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPaymentForm(false)}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Valor *</Label>
                        <Input
                          type="text"
                          placeholder="0,00"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="text-right"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data *</Label>
                        <Input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Forma</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pix">Pix</SelectItem>
                            <SelectItem value="Transferência">Transferência</SelectItem>
                            <SelectItem value="Boleto">Boleto</SelectItem>
                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Conta bancária</Label>
                        <Select value={bankAccountId} onValueChange={setBankAccountId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
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

                      <div className="space-y-2 md:col-span-2 xl:col-span-4">
                        <Label>Observações</Label>
                        <Textarea
                          placeholder="Ex.: pagamento parcial, desconto negociado, etc."
                          value={paymentNotes}
                          onChange={(e) => setPaymentNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        onClick={handleRegisterPayment}
                        disabled={loading}
                        className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm min-w-[160px]"
                      >
                        {loading ? "Salvando..." : "Salvar pagamento"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Payments table */}
                <div className="overflow-x-auto">
                  {payments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/70 dark:bg-gray-800/40">
                          <TableHead>Valor</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Forma</TableHead>
                          <TableHead>Conta</TableHead>
                          <TableHead>Registrado em</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                            <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>{formatDate(payment.payment_date)}</TableCell>
                            <TableCell>{payment.payment_method || "-"}</TableCell>
                            <TableCell className="max-w-[320px] truncate">
                              {payment.bank_account || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(payment.created_at)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePayment(payment.id)}
                                title="Excluir pagamento"
                                className="hover:bg-rose-50 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="py-10 text-center text-muted-foreground">
                      Nenhum pagamento registrado
                    </div>
                  )}
                </div>
              </section>

              {/* Footer */}
              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
