import { useState } from "react";
import { X, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import ConfirmDialog from "@/react-app/components/ConfirmDialog";

interface CreatePayablesModalProps {
  orderId: number;
  orderTotal: number;
  orderDate: string;
  isGrouped: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Installment {
  number: number;
  amount: number;
  due_date: string;
}

interface DialogState {
  open: boolean;
  type: "confirm" | "alert" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
}

export default function CreatePayablesModal({
  orderId,
  orderTotal,
  orderDate,
  isGrouped,
  onClose,
  onSuccess,
}: CreatePayablesModalProps) {
  const [paymentType, setPaymentType] = useState<"vista" | "parcelado">("vista");
  const [installmentInput, setInstallmentInput] = useState("");
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    type: "alert",
    title: "",
    message: "",
  });

  const showDialog = (
    type: "confirm" | "alert" | "success" | "error",
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setDialog({ open: true, type, title, message, onConfirm });
  };

  const closeDialog = () => {
    setDialog({ ...dialog, open: false });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDateBR = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

  const parseInstallmentInput = (input: string) => {
    const trimmed = input.trim();
    
    // Check for format like "5x" or "3x"
    const timesMatch = trimmed.match(/^(\d+)x$/i);
    if (timesMatch) {
      const count = parseInt(timesMatch[1]);
      if (count > 0 && count <= 12) {
        return generateInstallmentsByCount(count);
      }
    }

    // For grouped orders, only accept "Nx" format
    if (isGrouped) {
      return null;
    }

    // Check for format like "30/60/90" or "30,60,90"
    const daysMatch = trimmed.match(/^(\d+)[/,](\d+)([/,](\d+))*$/);
    if (daysMatch) {
      const daysParts = trimmed.split(/[/,]/).map(d => parseInt(d.trim()));
      if (daysParts.length > 0 && daysParts.length <= 12) {
        return generateInstallmentsByDays(daysParts);
      }
    }

    return null;
  };

  const generateInstallmentsByCount = (count: number): Installment[] => {
    const baseDate = new Date(orderDate + "T00:00:00");
    const amountPerInstallment = orderTotal / count;
    const result: Installment[] = [];

    if (isGrouped) {
      // For grouped orders, calculate weekly periods
      const dayOfWeek = baseDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const firstMonday = new Date(baseDate);
      firstMonday.setDate(baseDate.getDate() + mondayOffset);
      firstMonday.setHours(0, 0, 0, 0);

      for (let i = 0; i < count; i++) {
        const weekStart = new Date(firstMonday);
        weekStart.setDate(firstMonday.getDate() + (i * 7));
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Monday + 6 = Sunday
        
        // Due date is 5 days after Sunday (Friday of next week)
        const dueDate = new Date(weekEnd);
        dueDate.setDate(weekEnd.getDate() + 5);
        
        result.push({
          number: i + 1,
          amount: parseFloat(amountPerInstallment.toFixed(2)),
          due_date: dueDate.toISOString().split('T')[0],
        });
      }
    } else {
      // For regular orders, calculate monthly
      for (let i = 0; i < count; i++) {
        const dueDate = new Date(baseDate);
        dueDate.setDate(baseDate.getDate() + (30 * (i + 1)));
        
        result.push({
          number: i + 1,
          amount: parseFloat(amountPerInstallment.toFixed(2)),
          due_date: dueDate.toISOString().split('T')[0],
        });
      }
    }

    // Adjust last installment to match exact total (handle rounding)
    const totalCalculated = result.reduce((sum, inst) => sum + inst.amount, 0);
    const diff = orderTotal - totalCalculated;
    if (Math.abs(diff) > 0.01) {
      result[result.length - 1].amount += diff;
      result[result.length - 1].amount = parseFloat(result[result.length - 1].amount.toFixed(2));
    }

    return result;
  };

  const generateInstallmentsByDays = (days: number[]): Installment[] => {
    const baseDate = new Date(orderDate + "T00:00:00");
    const amountPerInstallment = orderTotal / days.length;
    const result: Installment[] = [];

    days.forEach((dayOffset, index) => {
      const dueDate = new Date(baseDate);
      dueDate.setDate(baseDate.getDate() + dayOffset);
      
      result.push({
        number: index + 1,
        amount: parseFloat(amountPerInstallment.toFixed(2)),
        due_date: dueDate.toISOString().split('T')[0],
      });
    });

    // Adjust last installment to match exact total (handle rounding)
    const totalCalculated = result.reduce((sum, inst) => sum + inst.amount, 0);
    const diff = orderTotal - totalCalculated;
    if (Math.abs(diff) > 0.01) {
      result[result.length - 1].amount += diff;
      result[result.length - 1].amount = parseFloat(result[result.length - 1].amount.toFixed(2));
    }

    return result;
  };

  const handleProcessInput = () => {
    const parsed = parseInstallmentInput(installmentInput);
    if (parsed) {
      setInstallments(parsed);
    } else {
      const message = isGrouped
        ? 'Para pedidos agrupados, use apenas o formato "Nx":\n- "2x" para 2 parcelas\n- "3x" para 3 parcelas\n- etc.'
        : 'Use um dos formatos:\n- "3x" para 3 parcelas\n- "30/60/90" para parcelas em dias específicos\n- "30,60,90" também funciona';
      
      showDialog("error", "Formato inválido", message);
    }
  };

  const updateInstallmentAmount = (index: number, value: string) => {
    const newAmount = parseFloat(value) || 0;
    const newInstallments = [...installments];
    newInstallments[index].amount = newAmount;
    setInstallments(newInstallments);
  };

  const updateInstallmentDate = (index: number, value: string) => {
    const newInstallments = [...installments];
    newInstallments[index].due_date = value;
    setInstallments(newInstallments);
  };

  const validateAndSubmit = async () => {
    if (paymentType === "vista") {
      // Simple à vista payment
      showDialog(
        "confirm",
        "Confirmar lançamento",
        `Lançar conta a pagar de ${formatCurrency(orderTotal)} com vencimento na data do pedido?`,
        async () => {
          await createPayables([]);
        }
      );
      return;
    }

    // Validate installments
    if (installments.length === 0) {
      showDialog("error", "Erro", "Configure as parcelas antes de continuar");
      return;
    }

    const totalInstallments = installments.reduce((sum, inst) => sum + inst.amount, 0);
    const diff = Math.abs(totalInstallments - orderTotal);

    if (diff > 0.01) {
      showDialog(
        "error",
        "Erro de validação",
        `O total das parcelas (${formatCurrency(totalInstallments)}) não corresponde ao total do pedido (${formatCurrency(orderTotal)}).\n\nDiferença: ${formatCurrency(diff)}`
      );
      return;
    }

    // Check for invalid dates
    const invalidDates = installments.some(inst => !inst.due_date || inst.due_date === "");
    if (invalidDates) {
      showDialog("error", "Erro", "Todas as parcelas devem ter uma data de vencimento");
      return;
    }

    // Check for invalid amounts
    const invalidAmounts = installments.some(inst => inst.amount <= 0);
    if (invalidAmounts) {
      showDialog("error", "Erro", "Todas as parcelas devem ter valor maior que zero");
      return;
    }

    showDialog(
      "confirm",
      "Confirmar lançamento",
      `Lançar ${installments.length} parcela(s) totalizando ${formatCurrency(orderTotal)}?`,
      async () => {
        await createPayables(installments);
      }
    );
  };

  const createPayables = async (installmentSchedule: Installment[]) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        showDialog("error", "Erro", "Sessão expirada. Por favor, faça login novamente.");
        return;
      }

      const response = await fetch(`/api/orders/${orderId}/create-payables-advanced`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          payment_type: paymentType === "vista" ? "À Vista" : "Parcelado",
          installments: installmentSchedule,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        showDialog("error", "Erro", data.error || "Erro ao criar contas a pagar");
      }
    } catch (error) {
      console.error("Error creating payables:", error);
      showDialog("error", "Erro", "Erro ao criar contas a pagar");
    } finally {
      setLoading(false);
    }
  };

  const totalInstallments = installments.reduce((sum, inst) => sum + inst.amount, 0);
  const difference = totalInstallments - orderTotal;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Lançar Contas a Pagar</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Total do pedido: {formatCurrency(orderTotal)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              disabled={loading}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Payment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Tipo de Pagamento
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPaymentType("vista");
                      setInstallments([]);
                      setInstallmentInput("");
                    }}
                    className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                      paymentType === "vista"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    <div className="font-medium text-gray-900 dark:text-white">À Vista</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Pagamento único na data do pedido
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentType("parcelado")}
                    className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                      paymentType === "parcelado"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                    <div className="font-medium text-gray-900 dark:text-white">Parcelado</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Dividir em múltiplas parcelas
                    </div>
                  </button>
                </div>
              </div>

              {/* Installment Configuration */}
              {paymentType === "parcelado" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Configurar Parcelas
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={installmentInput}
                        onChange={(e) => setInstallmentInput(e.target.value)}
                        placeholder={isGrouped ? 'Ex: "2x" ou "3x"' : 'Ex: "3x" ou "30/60/90" ou "30,60,90"'}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleProcessInput();
                          }
                        }}
                      />
                      <Button onClick={handleProcessInput} variant="outline">
                        Calcular
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {isGrouped 
                        ? 'Para pedidos agrupados, digite "2x" para 2 parcelas, "3x" para 3 parcelas, etc.'
                        : 'Digite "3x" para 3 parcelas ou "30/60/90" para vencimentos em dias específicos'
                      }
                    </p>
                  </div>

                  {/* Installments List */}
                  {installments.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Parcelas ({installments.length})
                        </h3>
                        {Math.abs(difference) > 0.01 && (
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Diferença: {formatCurrency(Math.abs(difference))}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                        {installments.map((inst, index) => (
                          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                  {inst.number}
                                </span>
                              </div>
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    Valor
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inst.amount}
                                    onChange={(e) => updateInstallmentAmount(index, e.target.value)}
                                    className="h-9"
                                    disabled={isGrouped}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    Vencimento
                                  </label>
                                  <Input
                                    type="date"
                                    value={inst.due_date}
                                    onChange={(e) => updateInstallmentDate(index, e.target.value)}
                                    className="h-9"
                                    disabled={isGrouped}
                                  />
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                                {formatDateBR(inst.due_date)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Total das Parcelas:
                          </span>
                          <span className={`text-lg font-semibold ${
                            Math.abs(difference) > 0.01
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}>
                            {formatCurrency(totalInstallments)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Total do Pedido:
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(orderTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={validateAndSubmit} disabled={loading}>
              {loading ? "Processando..." : "Lançar Contas"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={dialog.open}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={closeDialog}
      />
    </>
  );
}
