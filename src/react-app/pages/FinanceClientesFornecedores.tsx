import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { SupplierClient } from "@/react-app/lib/finance-types";
import { generateId } from "@/react-app/lib/finance-utils";
import { CnpjInput } from "@/react-app/components/CnpjInput";
import { Card } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/react-app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Badge } from "@/react-app/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Building2, User, Users, Briefcase } from "lucide-react";
import { Textarea } from "@/react-app/components/ui/textarea";
import { Checkbox } from "@/react-app/components/ui/checkbox";

export default function FinanceClientesFornecedoresPage() {
  const { suppliersClients, addSupplierClient, updateSupplierClient, deleteSupplierClient, activeCompanyId } = useFinanceData();
  
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierClient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  const [form, setForm] = useState<{
    name: string;
    documentType: "cnpj" | "cpf";
    documentNumber: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    contactTypes: ("fornecedor" | "cliente" | "socio" | "funcionario")[];
    notes: string;
  }>({
    name: "",
    documentType: "cnpj",
    documentNumber: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    contactTypes: [],
    notes: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      documentType: "cnpj",
      documentNumber: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      contactTypes: [],
      notes: "",
    });
  };

  const openNew = () => {
    resetForm();
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (contact: SupplierClient) => {
    setForm({
      name: contact.name,
      documentType: contact.documentType,
      documentNumber: contact.documentNumber || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address || "",
      city: contact.city || "",
      state: contact.state || "",
      postalCode: contact.postalCode || "",
      contactTypes: contact.contactTypes,
      notes: contact.notes || "",
    });
    setEditing(contact);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || form.contactTypes.length === 0) return;

    const contact: SupplierClient = {
      id: editing?.id || generateId(),
      companyId: editing?.companyId || activeCompanyId,
      name: form.name,
      documentType: form.documentType,
      documentNumber: form.documentNumber || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      postalCode: form.postalCode || undefined,
      contactTypes: form.contactTypes,
      notes: form.notes || undefined,
    };

    if (editing) {
      await updateSupplierClient(contact);
    } else {
      await addSupplierClient(contact);
    }

    setOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este contato?")) {
      await deleteSupplierClient(id);
    }
  };

  const toggleContactType = (type: "fornecedor" | "cliente" | "socio" | "funcionario") => {
    setForm(f => ({
      ...f,
      contactTypes: f.contactTypes.includes(type)
        ? f.contactTypes.filter(t => t !== type)
        : [...f.contactTypes, type],
    }));
  };

  const companyContacts = suppliersClients.filter(c => c.companyId === activeCompanyId);
  
  const filteredContacts = companyContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.documentNumber?.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || contact.contactTypes.includes(typeFilter as any);
    
    return matchesSearch && matchesType;
  });

  const getContactTypeIcon = (type: string) => {
    switch (type) {
      case "fornecedor": return <Building2 className="h-3 w-3" />;
      case "cliente": return <User className="h-3 w-3" />;
      case "socio": return <Users className="h-3 w-3" />;
      case "funcionario": return <Briefcase className="h-3 w-3" />;
      default: return null;
    }
  };

  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case "fornecedor": return "Fornecedor";
      case "cliente": return "Cliente";
      case "socio": return "Sócio";
      case "funcionario": return "Funcionário";
      default: return type;
    }
  };

  const stats = {
    fornecedores: companyContacts.filter(c => c.contactTypes.includes("fornecedor")).length,
    clientes: companyContacts.filter(c => c.contactTypes.includes("cliente")).length,
    socios: companyContacts.filter(c => c.contactTypes.includes("socio")).length,
    funcionarios: companyContacts.filter(c => c.contactTypes.includes("funcionario")).length,
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Clientes e Fornecedores</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus contatos comerciais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90">
              <Plus className="h-4 w-4 mr-1" />Novo contato
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Contato" : "Novo Contato"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome / Razão Social *</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  placeholder="Nome completo ou razão social"
                />
              </div>

              <div>
                <Label>Tipo de Contato *</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {(["fornecedor", "cliente", "socio", "funcionario"] as const).map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox 
                        id={type}
                        checked={form.contactTypes.includes(type)}
                        onCheckedChange={() => toggleContactType(type)}
                      />
                      <label htmlFor={type} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        {getContactTypeIcon(type)}
                        {getContactTypeLabel(type)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de Documento</Label>
                  <Select value={form.documentType} onValueChange={(v: "cnpj" | "cpf") => setForm(f => ({ ...f, documentType: v, documentNumber: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{form.documentType === "cnpj" ? "CNPJ" : "CPF"}</Label>
                  {form.documentType === "cnpj" ? (
                    <CnpjInput 
                      value={form.documentNumber}
                      onChange={v => setForm(f => ({ ...f, documentNumber: v }))}
                    />
                  ) : (
                    <Input 
                      value={form.documentNumber}
                      onChange={e => setForm(f => ({ ...f, documentNumber: e.target.value }))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input 
                    value={form.phone} 
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <Label>Endereço</Label>
                <Input 
                  value={form.address} 
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} 
                  placeholder="Rua, número, complemento"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input 
                    value={form.city} 
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))} 
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input 
                    value={form.state} 
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))} 
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input 
                    value={form.postalCode} 
                    onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))} 
                    placeholder="00000-000"
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea 
                  value={form.notes} 
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
                  placeholder="Informações adicionais sobre o contato"
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Building2 className="h-4 w-4" />
            <p className="text-sm">Fornecedores</p>
          </div>
          <p className="text-2xl font-bold">{stats.fornecedores}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <User className="h-4 w-4" />
            <p className="text-sm">Clientes</p>
          </div>
          <p className="text-2xl font-bold">{stats.clientes}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Users className="h-4 w-4" />
            <p className="text-sm">Sócios</p>
          </div>
          <p className="text-2xl font-bold">{stats.socios}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Briefcase className="h-4 w-4" />
            <p className="text-sm">Funcionários</p>
          </div>
          <p className="text-2xl font-bold">{stats.funcionarios}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, documento ou email"
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="fornecedor">Fornecedores</SelectItem>
              <SelectItem value="cliente">Clientes</SelectItem>
              <SelectItem value="socio">Sócios</SelectItem>
              <SelectItem value="funcionario">Funcionários</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Tipos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchTerm || typeFilter !== "all" 
                    ? "Nenhum contato encontrado com os filtros aplicados"
                    : "Nenhum contato cadastrado"}
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map(contact => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{contact.name}</p>
                      {contact.city && contact.state && (
                        <p className="text-xs text-muted-foreground">{contact.city}/{contact.state}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {contact.documentNumber ? (
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">{contact.documentType}</p>
                        <p>{contact.documentNumber}</p>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="space-y-1">
                      {contact.email && <p>{contact.email}</p>}
                      {contact.phone && <p>{contact.phone}</p>}
                      {!contact.email && !contact.phone && "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.contactTypes.map(type => (
                        <Badge key={type} variant="outline" className="text-xs gap-1">
                          {getContactTypeIcon(type)}
                          {getContactTypeLabel(type)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(contact)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contact.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
