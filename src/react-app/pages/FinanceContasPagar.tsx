import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { Payable } from "@/react-app/lib/finance-types";
import { formatCurrency, formatDate, generateId } from "@/react-app/lib/finance-utils";
import { CurrencyInput } from "@/react-app/components/CurrencyInput";
import { Card } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/react-app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Badge } from "@/react-app/components/ui/badge";
import { Plus, Pencil, Trash2, Check, Clock, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";

export default function FinanceContasPagarPage() {
  const { 
    payables, 
    addPayable, 
    updatePayable, 
    deletePayable,
    categories,
    banks,
    activeCompanyId,
  } = useFinanceData();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payable | null>(null);
  const [form, setForm] = useState<{
    description: string;
    amount: string;
    dueDate: string;
    categoryId: string;
    bankId: string;
    paymentMethod: string;
    status: "pago" | "pendente" | "vencido";
  }>({
    description: "",
    amount: "",
    dueDate: "",
    categoryId: "",
    bankId: "",
    paymentMethod: "pix",
    status: "pendente",
  });

  const resetForm = () => {
    const defaultBank = banks.find(b => b.companyId === activeCompanyId && b.isDefault);
    const defaultCategory = categories.find(c => c.type === "despesa" && !c.isDefault);
    
    setForm({
      description: "",
      amount: "",
      dueDate: "",
      categoryId: defaultCategory?.id || "",
      bankId: defaultBank?.id || "",
      paymentMethod: "pix",
      status: "pendente",
    });
  };

  const openNew = () => {
    resetForm();
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (p: Payable) => {
    setForm({
      description: p.description,
      amount: String(p.amount * 100),
      dueDate: p.dueDate,
      categoryId: p.categoryId,
      bankId: p.bankId,
      paymentMethod: p.paymentMethod,
      status: p.status,
    });
    setEditing(p);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.dueDate) return;

    const entry: Payable = {
      id: editing?.id || generateId(),
      companyId: editing?.companyId || activeCompanyId,
      description: form.description,
      amount: parseFloat(form.amount) / 100,
      dueDate: form.dueDate,
      categoryId: form.categoryId,
      bankId: form.bankId,
      paymentMethod: form.paymentMethod,
      status: form.status,
    };

    if (editing) {
      await updatePayable(entry);
    } else {
      await addPayable(entry);
    }

    setOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta conta?")) {
      await deletePayable(id);
    }
  };

  const companyPayables = payables.filter(p => p.companyId === activeCompanyId);
  const pendingPayables = companyPayables.filter(p => p.status === "pendente");
  const paidPayables = companyPayables.filter(p => p.status === "pago");
  const overduePayables = pendingPayables.filter(p => new Date(p.dueDate) < new Date());

  const totalPending = pendingPayables.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = paidPayables.reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = overduePayables.reduce((sum, p) => sum + p.amount, 0);

  const paymentMethods = [
    { value: "pix", label: "Pix" },
    { value: "credito", label: "Cartão de Crédito" },
    { value: "boleto", label: "Boleto" },
    { value: "transferencia", label: "Transferência" },
    { value: "dinheiro", label: "Dinheiro" },
  ];

  const getStatusBadge = (payable: Payable) => {
    if (payable.status === "pago") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
          <Check className="h-3 w-3" />
          Pago
        </Badge>
      );
    }
    if (new Date(payable.dueDate) < new Date()) {
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
          <AlertCircle className="h-3 w-3" />
          Vencido
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>
    );
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas despesas e pagamentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90">
              <Plus className="h-4 w-4 mr-1" />Nova conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Descrição</Label>
                <Input 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  placeholder="Ex: Aluguel escritório"
                />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <CurrencyInput 
                  value={form.amount} 
                  onValueChange={v => setForm(f => ({ ...f, amount: v }))} 
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
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === "despesa").map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Conta Bancária</Label>
                <Select value={form.bankId} onValueChange={v => setForm(f => ({ ...f, bankId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {banks.filter(b => b.companyId === activeCompanyId).map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "pago" | "pendente" | "vencido") => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
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
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <Badge variant="secondary">{pendingPayables.length}</Badge>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Vencidas</p>
            <Badge variant="secondary">{overduePayables.length}</Badge>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalOverdue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pagas</p>
            <Badge variant="secondary">{paidPayables.length}</Badge>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalPaid)}</p>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pendingPayables.length})</TabsTrigger>
          <TabsTrigger value="paid">Pagas ({paidPayables.length})</TabsTrigger>
          <TabsTrigger value="all">Todas ({companyPayables.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma de Pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta pendente
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPayables.map(p => {
                    const category = categories.find(c => c.id === p.categoryId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{category?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.paymentMethod}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{getStatusBadge(p)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
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
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma de Pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta paga
                    </TableCell>
                  </TableRow>
                ) : (
                  paidPayables.map(p => {
                    const category = categories.find(c => c.id === p.categoryId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{category?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.paymentMethod}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{getStatusBadge(p)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
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
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma de Pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyPayables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  companyPayables.map(p => {
                    const category = categories.find(c => c.id === p.categoryId);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(p.dueDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{category?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.paymentMethod}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                        <TableCell>{getStatusBadge(p)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(p.id)}>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
