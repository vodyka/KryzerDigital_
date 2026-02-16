import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Package,
  Calculator,
  DollarSign,
  Save,
  Trash2,
  Edit,
  Plus,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface Expense {
  id: number;
  reference_month: string;
  cost_packaging: number;
  cost_accountant: number;
  cost_prolabore: number;
  cost_employee_salary: number;
  cost_shipping: number;
  cost_rent: number;
  cost_water: number;
  cost_electricity: number;
  cost_internet: number;
  total_expenses: number;
  created_at: string;
}

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form fields
  const [referenceMonth, setReferenceMonth] = useState("");
  const [costPackaging, setCostPackaging] = useState("");
  const [costAccountant, setCostAccountant] = useState("");
  const [costProlabore, setCostProlabore] = useState("");
  const [costEmployeeSalary, setCostEmployeeSalary] = useState("");
  const [costShipping, setCostShipping] = useState("");
  const [costRent, setCostRent] = useState("");
  const [costWater, setCostWater] = useState("");
  const [costElectricity, setCostElectricity] = useState("");
  const [costInternet, setCostInternet] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/operational-cost/expenses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const resetForm = () => {
    setReferenceMonth("");
    setCostPackaging("");
    setCostAccountant("");
    setCostProlabore("");
    setCostEmployeeSalary("");
    setCostShipping("");
    setCostRent("");
    setCostWater("");
    setCostElectricity("");
    setCostInternet("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setReferenceMonth(expense.reference_month);
    setCostPackaging(
      expense.cost_packaging.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostAccountant(
      expense.cost_accountant.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostProlabore(
      expense.cost_prolabore.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostEmployeeSalary(
      expense.cost_employee_salary.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostShipping(
      expense.cost_shipping.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostRent(
      expense.cost_rent.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostWater(
      expense.cost_water.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostElectricity(
      expense.cost_electricity.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setCostInternet(
      expense.cost_internet.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const body = {
        reference_month: referenceMonth,
        cost_packaging: parseCurrency(costPackaging),
        cost_accountant: parseCurrency(costAccountant),
        cost_prolabore: parseCurrency(costProlabore),
        cost_employee_salary: parseCurrency(costEmployeeSalary),
        cost_shipping: parseCurrency(costShipping),
        cost_rent: parseCurrency(costRent),
        cost_water: parseCurrency(costWater),
        cost_electricity: parseCurrency(costElectricity),
        cost_internet: parseCurrency(costInternet),
      };

      let response;
      if (editingId) {
        response = await fetch(`/api/operational-cost/expenses/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch("/api/operational-cost/expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      }

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: editingId ? "Despesa atualizada com sucesso!" : "Despesa cadastrada com sucesso!",
        });
        await fetchExpenses();
        resetForm();
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao salvar despesa" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/operational-cost/expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Despesa excluída com sucesso!" });
        await fetchExpenses();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir despesa" });
    }
  };

  // Helper to parse currency string to number
  const parseCurrency = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
  };

  // Helper to format number as currency
  const formatCurrency = (value: string): string => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const numberValue = parseFloat(numbers) / 100;
    return numberValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Handle currency input change
  const handleCurrencyChange = (
    value: string,
    setter: (value: string) => void
  ) => {
    const formatted = formatCurrency(value);
    setter(formatted);
  };

  // Format month without timezone conversion
  const formatMonthLabel = (monthString: string): string => {
    // monthString format: "YYYY-MM"
    const [year, month] = monthString.split("-");
    const monthNames = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]}/${year}`;
  };

  const totalExpenses =
    parseCurrency(costPackaging) +
    parseCurrency(costAccountant) +
    parseCurrency(costProlabore) +
    parseCurrency(costEmployeeSalary) +
    parseCurrency(costShipping) +
    parseCurrency(costRent) +
    parseCurrency(costWater) +
    parseCurrency(costElectricity) +
    parseCurrency(costInternet);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Despesas Operacionais</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie os custos operacionais mensais</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancelar" : "Nova Despesa"}
        </Button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              {editingId ? "Editar Despesa" : "Nova Despesa"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="reference_month">Mês de Referência *</Label>
                  <Input
                    id="reference_month"
                    type="month"
                    value={referenceMonth}
                    onChange={(e) => setReferenceMonth(e.target.value)}
                    required
                    disabled={!!editingId}
                  />
                  <p className="text-xs text-gray-500">
                    Formato: YYYY-MM (ex: 2024-01 para Janeiro/2024)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_packaging">Embalagem</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_packaging"
                      type="text"
                      value={costPackaging}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostPackaging)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_accountant">Contador</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_accountant"
                      type="text"
                      value={costAccountant}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostAccountant)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_prolabore">Pró-labore</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_prolabore"
                      type="text"
                      value={costProlabore}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostProlabore)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_employee_salary">Salário Funcionários</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_employee_salary"
                      type="text"
                      value={costEmployeeSalary}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostEmployeeSalary)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_shipping">Frete</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_shipping"
                      type="text"
                      value={costShipping}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostShipping)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_rent">Aluguel</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_rent"
                      type="text"
                      value={costRent}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostRent)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_water">Água</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_water"
                      type="text"
                      value={costWater}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostWater)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_electricity">Luz</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_electricity"
                      type="text"
                      value={costElectricity}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostElectricity)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_internet">Internet</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      R$
                    </span>
                    <Input
                      id="cost_internet"
                      type="text"
                      value={costInternet}
                      onChange={(e) => handleCurrencyChange(e.target.value, setCostInternet)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Histórico de Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma despesa cadastrada</p>
              <p className="text-sm text-gray-400 mt-1">
                Clique em "Nova Despesa" para começar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Mês
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatMonthLabel(expense.reference_month)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          R${" "}
                          {expense.total_expenses.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
