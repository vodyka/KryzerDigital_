import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { formatCurrency, formatDate, generateId } from "@/react-app/lib/finance-utils";
import { CurrencyInput } from "@/react-app/components/CurrencyInput";
import { Card } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/react-app/components/ui/dialog";
import { Badge } from "@/react-app/components/ui/badge";
import { Plus, Pencil, Trash2, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { Textarea } from "@/react-app/components/ui/textarea";

interface Debt {
  id: string;
  companyId: string;
  creditor: string;
  description: string;
  totalAmount: number;
  remainingAmount: number;
  interestRate?: number;
  startDate: string;
  dueDate: string;
  installments?: number;
  paymentDay?: number;
  notes?: string;
}

export default function FinanceDividasPage() {
  const { activeCompanyId } = useFinanceData();
  
  // Mock data - in a real implementation, this would come from the finance data hook
  const [debts, setDebts] = useState<Debt[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState<{
    creditor: string;
    description: string;
    totalAmount: string;
    remainingAmount: string;
    interestRate: string;
    startDate: string;
    dueDate: string;
    installments: string;
    paymentDay: string;
    notes: string;
  }>({
    creditor: "",
    description: "",
    totalAmount: "",
    remainingAmount: "",
    interestRate: "",
    startDate: "",
    dueDate: "",
    installments: "",
    paymentDay: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      creditor: "",
      description: "",
      totalAmount: "",
      remainingAmount: "",
      interestRate: "",
      startDate: "",
      dueDate: "",
      installments: "",
      paymentDay: "",
      notes: "",
    });
  };

  const openNew = () => {
    resetForm();
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (debt: Debt) => {
    setForm({
      creditor: debt.creditor,
      description: debt.description,
      totalAmount: String(debt.totalAmount * 100),
      remainingAmount: String(debt.remainingAmount * 100),
      interestRate: debt.interestRate ? String(debt.interestRate) : "",
      startDate: debt.startDate,
      dueDate: debt.dueDate,
      installments: debt.installments ? String(debt.installments) : "",
      paymentDay: debt.paymentDay ? String(debt.paymentDay) : "",
      notes: debt.notes || "",
    });
    setEditing(debt);
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.creditor || !form.description || !form.totalAmount || !form.remainingAmount) return;

    const debt: Debt = {
      id: editing?.id || generateId(),
      companyId: editing?.companyId || activeCompanyId,
      creditor: form.creditor,
      description: form.description,
      totalAmount: parseFloat(form.totalAmount) / 100,
      remainingAmount: parseFloat(form.remainingAmount) / 100,
      interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
      startDate: form.startDate,
      dueDate: form.dueDate,
      installments: form.installments ? parseInt(form.installments) : undefined,
      paymentDay: form.paymentDay ? parseInt(form.paymentDay) : undefined,
      notes: form.notes || undefined,
    };

    if (editing) {
      setDebts(prev => prev.map(d => d.id === editing.id ? debt : d));
    } else {
      setDebts(prev => [...prev, debt]);
    }

    setOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta dívida?")) {
      setDebts(prev => prev.filter(d => d.id !== id));
    }
  };

  const companyDebts = debts.filter(d => d.companyId === activeCompanyId);
  const totalDebt = companyDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
  const totalPaid = companyDebts.reduce((sum, d) => sum + (d.totalAmount - d.remainingAmount), 0);
  const averageInterest = companyDebts.length > 0
    ? companyDebts.reduce((sum, d) => sum + (d.interestRate || 0), 0) / companyDebts.length
    : 0;

  const getDebtProgress = (debt: Debt) => {
    const paid = debt.totalAmount - debt.remainingAmount;
    const percentage = (paid / debt.totalAmount) * 100;
    return Math.round(percentage);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dívidas</h1>
          <p className="text-sm text-muted-foreground">Gerencie empréstimos e financiamentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90">
              <Plus className="h-4 w-4 mr-1" />Nova dívida
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Dívida" : "Nova Dívida"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Credor</Label>
                <Input 
                  value={form.creditor} 
                  onChange={e => setForm(f => ({ ...f, creditor: e.target.value }))} 
                  placeholder="Nome do banco ou instituição"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  placeholder="Ex: Empréstimo para capital de giro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor Total (R$)</Label>
                  <CurrencyInput 
                    value={form.totalAmount} 
                    onValueChange={v => setForm(f => ({ ...f, totalAmount: v }))} 
                  />
                </div>
                <div>
                  <Label>Saldo Devedor (R$)</Label>
                  <CurrencyInput 
                    value={form.remainingAmount} 
                    onValueChange={v => setForm(f => ({ ...f, remainingAmount: v }))} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Início</Label>
                  <Input 
                    type="date" 
                    value={form.startDate} 
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} 
                  />
                </div>
                <div>
                  <Label>Data de Vencimento</Label>
                  <Input 
                    type="date" 
                    value={form.dueDate} 
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Taxa de Juros (%)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={form.interestRate} 
                    onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <Input 
                    type="number" 
                    value={form.installments} 
                    onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} 
                    placeholder="12"
                  />
                </div>
                <div>
                  <Label>Dia de Pagamento</Label>
                  <Input 
                    type="number" 
                    min="1"
                    max="31"
                    value={form.paymentDay} 
                    onChange={e => setForm(f => ({ ...f, paymentDay: e.target.value }))} 
                    placeholder="10"
                  />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea 
                  value={form.notes} 
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
                  placeholder="Informações adicionais sobre a dívida"
                  rows={3}
                />
              </div>
              <Button className="w-full bg-[#001429] hover:bg-[#001429]/90" onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total em Dívidas</p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalDebt)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Pago</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Juros Médio</p>
            <Badge variant="outline">{companyDebts.length} dívidas</Badge>
          </div>
          <p className="text-2xl font-bold mt-2">{averageInterest.toFixed(2)}%</p>
        </Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Credor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Saldo Devedor</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companyDebts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma dívida cadastrada
                </TableCell>
              </TableRow>
            ) : (
              companyDebts.map(debt => {
                const progress = getDebtProgress(debt);
                const overdue = isOverdue(debt.dueDate);
                
                return (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium">{debt.creditor}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{debt.description}</p>
                        {debt.interestRate && (
                          <p className="text-xs text-muted-foreground">
                            Juros: {debt.interestRate}% {debt.installments && `• ${debt.installments}x`}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatCurrency(debt.totalAmount)}
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      {formatCurrency(debt.remainingAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10 text-right">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {overdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                        <span className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {formatDate(debt.dueDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(debt)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(debt.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
