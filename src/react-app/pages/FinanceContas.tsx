import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { useGlobalBanks } from "@/react-app/hooks/use-global-banks";
import { BankAccount } from "@/react-app/lib/finance-types";
import { formatCurrency, generateId, todayStr } from "@/react-app/lib/finance-utils";
import { CurrencyInput } from "@/react-app/components/CurrencyInput";
import { Card, CardContent } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/react-app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { Badge } from "@/react-app/components/ui/badge";
import { Switch } from "@/react-app/components/ui/switch";

export default function FinanceContasPage() {
  const { banks, setBanks, getBankBalance, getBankLogo, activeCompanyId, addBank, updateBank, deleteBank } = useFinanceData();
  const { globalBanks, getBankByCode } = useGlobalBanks();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState({ 
    bankCode: "", 
    accountName: "", 
    initialBalance: "", 
    balanceStartDate: "", 
    overdraftLimit: "",
    isDefault: false,
  });

  const resetForm = () => setForm({ 
    bankCode: "", 
    accountName: "", 
    initialBalance: "", 
    balanceStartDate: "", 
    overdraftLimit: "",
    isDefault: false,
  });

  const openNew = () => { resetForm(); setEditing(null); setOpen(true); };
  
  const openEdit = (b: BankAccount) => {
    setForm({
      bankCode: b.bankCode,
      accountName: b.accountName,
      initialBalance: String(b.initialBalance * 100),
      balanceStartDate: b.balanceStartDate || "",
      overdraftLimit: String((b.overdraftLimit || 0) * 100),
      isDefault: b.isDefault || false,
    });
    setEditing(b);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.bankCode || !form.accountName) return;
    
    const entry: BankAccount = {
      id: editing?.id || generateId(),
      companyId: editing?.companyId || activeCompanyId,
      bankCode: form.bankCode,
      accountName: form.accountName,
      initialBalance: parseFloat(form.initialBalance) / 100 || 0,
      balanceStartDate: form.balanceStartDate || todayStr(),
      overdraftLimit: parseFloat(form.overdraftLimit) / 100 || 0,
      isDefault: form.isDefault,
    };

    if (editing) {
      await updateBank(entry);
    } else {
      await addBank(entry);
    }
    setOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const companyBanks = banks.filter(b => b.companyId === activeCompanyId);
    const bank = banks.find(b => b.id === id);
    
    // Prevent deletion if it's the last bank for this company
    if (companyBanks.length <= 1) {
      alert("Você não pode excluir a última conta. Cada empresa precisa ter pelo menos uma conta.");
      return;
    }

    // If deleting the default bank, make another bank default first
    if (bank?.isDefault) {
      const otherBanks = companyBanks.filter(b => b.id !== id);
      if (otherBanks.length > 0) {
        setBanks(prev => prev.map(b => 
          b.id === otherBanks[0].id 
            ? { ...b, isDefault: true }
            : b
        ));
      }
    }

    await deleteBank(id);
  };

  const toggleDefault = async (id: string) => {
    const bank = banks.find(b => b.id === id);
    if (bank) {
      await updateBank({ ...bank, isDefault: true });
    }
  };

  const companyBanks = banks.filter(b => b.companyId === activeCompanyId);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Contas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas contas bancárias</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova conta</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Editar Conta" : "Nova Conta"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome do Banco</Label>
                <Select value={form.bankCode} onValueChange={v => setForm(f => ({ ...f, bankCode: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {globalBanks.map(bank => (
                      <SelectItem key={bank.codigo} value={bank.codigo}>
                        {bank.codigo} - {bank.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nome da Conta</Label><Input value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} placeholder="Ex: Conta Corrente PJ" /></div>
              <div><Label>Saldo Inicial (R$)</Label><CurrencyInput value={form.initialBalance} onValueChange={v => setForm(f => ({ ...f, initialBalance: v }))} /></div>
              <div><Label>Data do Saldo Inicial</Label><Input type="date" value={form.balanceStartDate} onChange={e => setForm(f => ({ ...f, balanceStartDate: e.target.value }))} /></div>
              <div><Label>Limite Cheque Especial (R$)</Label><CurrencyInput value={form.overdraftLimit} onValueChange={v => setForm(f => ({ ...f, overdraftLimit: v }))} /></div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Conta Padrão</Label>
                  <p className="text-xs text-muted-foreground">Esta será a conta padrão para transações</p>
                </div>
                <Switch 
                  checked={form.isDefault} 
                  onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))}
                />
              </div>
              <Button className="w-full" onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Saldo Disponível</TableHead>
                <TableHead>Cheque Especial</TableHead>
                <TableHead>Saldo + Limite</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companyBanks.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma conta cadastrada</TableCell></TableRow>
              ) : companyBanks.map(b => {
                const balance = getBankBalance(b.id);
                const overdraft = b.overdraftLimit || 0;
                const totalAvailable = balance + overdraft;
                const globalBank = getBankByCode(b.bankCode);
                const logo = getBankLogo(b.id);
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {logo && (
                          <img 
                            src={logo} 
                            alt={globalBank?.nome || ''} 
                            className="h-8 w-auto object-contain"
                          />
                        )}
                        <div className="flex items-center gap-2">
                          {globalBank?.nome || b.accountName}
                          {b.isDefault && (
                            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5">
                              <Star className="h-3 w-3 fill-current" />
                              Padrão
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{b.accountName}</TableCell>
                    <TableCell className={`font-semibold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(balance)}
                    </TableCell>
                    <TableCell>{formatCurrency(overdraft)}</TableCell>
                    <TableCell className={`font-semibold ${totalAvailable >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(totalAvailable)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!b.isDefault && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => toggleDefault(b.id)}
                            title="Tornar padrão"
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
