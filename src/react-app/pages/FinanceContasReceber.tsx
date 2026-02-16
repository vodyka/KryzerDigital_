import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { Receivable } from "@/react-app/lib/finance-types";
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

export default function FinanceContasReceberPage() {
  const { 
    receivables, 
    addReceivable, 
    updateReceivable, 
    deleteReceivable,
    categories,
    banks,
    activeCompanyId,
  } = useFinanceData();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [form, setForm] = useState<{
    description: string;
    amount: string;
    receiptDate: string;
    categoryId: string;
    bankId: string;
    status: "pendente" | "recebido" | "vencido";
  }>({
    description: "",
    amount: "",
    receiptDate: "",
    categoryId: "",
    bankId: "",
    status: "pendente",
  });

  const resetForm = () => {
    const defaultBank = banks.find(b => b.companyId === activeCompanyId && b.isDefault);
    const defaultCategory = categories.find(c => c.type === "receita" && !c.isDefault);
    
    setForm({
      description: "",
      amount: "",
      receiptDate: "",
      categoryId: defaultCategory?.id || "",
      bankId: defaultBank?.id || "",
      status: "pendente",
    });
  };

  const openNew = () => {
    resetForm();
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (r: Receivable) => {
    setForm({
      description: r.description,
      amount: String(r.amount * 100),
      receiptDate: r.receiptDate,
      categoryId: r.categoryId,
      bankId: r.bankId,
      status: r.status,
    });
    setEditing(r);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.receiptDate) return;

    const entry: Receivable = {
      id: editing?.id || generateId(),
      companyId: editing?.companyId || activeCompanyId,
      description: form.description,
      amount: parseFloat(form.amount) / 100,
      receiptDate: form.receiptDate,
      categoryId: form.categoryId,
      bankId: form.bankId,
      status: form.status,
    };

    if (editing) {
      await updateReceivable(entry);
    } else {
      await addReceivable(entry);
    }

    setOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta conta?")) {
      await deleteReceivable(id);
    }
  };

  const companyReceivables = receivables.filter(r => r.companyId === activeCompanyId);
  const pendingReceivables = companyReceivables.filter(r => r.status === "pendente");
  const receivedReceivables = companyReceivables.filter(r => r.status === "recebido");
  const overdueReceivables = pendingReceivables.filter(r => new Date(r.receiptDate) < new Date());

  const totalPending = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);
  const totalReceived = receivedReceivables.reduce((sum, r) => sum + r.amount, 0);
  const totalOverdue = overdueReceivables.reduce((sum, r) => sum + r.amount, 0);

  const getStatusBadge = (receivable: Receivable) => {
    if (receivable.status === "recebido") {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
          <Check className="h-3 w-3" />
          Recebido
        </Badge>
      );
    }
    if (new Date(receivable.receiptDate) < new Date()) {
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
          <h1 className="text-xl sm:text-2xl font-bold">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas receitas e recebimentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90">
              <Plus className="h-4 w-4 mr-1" />Nova conta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Conta" : "Nova Conta a Receber"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Descrição</Label>
                <Input 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  placeholder="Ex: Venda de produto"
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
                <Label>Data de Recebimento</Label>
                <Input 
                  type="date" 
                  value={form.receiptDate} 
                  onChange={e => setForm(f => ({ ...f, receiptDate: e.target.value }))} 
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === "receita").map(c => (
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: "pendente" | "recebido" | "vencido") => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="recebido">Recebido</SelectItem>
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
            <Badge variant="secondary">{pendingReceivables.length}</Badge>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Vencidas</p>
            <Badge variant="secondary">{overdueReceivables.length}</Badge>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(totalOverdue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Recebidas</p>
            <Badge variant="secondary">{receivedReceivables.length}</Badge>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(totalReceived)}</p>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({pendingReceivables.length})</TabsTrigger>
          <TabsTrigger value="received">Recebidas ({receivedReceivables.length})</TabsTrigger>
          <TabsTrigger value="all">Todas ({companyReceivables.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReceivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta pendente
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingReceivables.map(r => {
                    const category = categories.find(c => c.id === r.categoryId);
                    const bank = banks.find(b => b.id === r.bankId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(r.receiptDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{category?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{bank?.accountName || "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(r.amount)}</TableCell>
                        <TableCell>{getStatusBadge(r)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
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

        <TabsContent value="received" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivedReceivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta recebida
                    </TableCell>
                  </TableRow>
                ) : (
                  receivedReceivables.map(r => {
                    const category = categories.find(c => c.id === r.categoryId);
                    const bank = banks.find(b => b.id === r.bankId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(r.receiptDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{category?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{bank?.accountName || "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(r.amount)}</TableCell>
                        <TableCell>{getStatusBadge(r)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
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
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyReceivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma conta cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  companyReceivables.map(r => {
                    const category = categories.find(c => c.id === r.categoryId);
                    const bank = banks.find(b => b.id === r.bankId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.description}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(r.receiptDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{category?.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{bank?.accountName || "—"}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{formatCurrency(r.amount)}</TableCell>
                        <TableCell>{getStatusBadge(r)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
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
