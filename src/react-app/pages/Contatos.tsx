import { useState, useEffect } from "react";
import { Plus, Pencil, ChevronDown, Upload, Building2, User, Globe, Printer } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/react-app/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";

interface Contact {
  id: number;
  type: "cliente" | "funcionario" | "socio";
  name: string;
  person_type?: string;
  document?: string;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  inscricao_municipal?: string;
  inscricao_estadual?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  notes?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_digit?: string;
  pix_key?: string;
  em_aberto?: number;
  vencido?: number;
  movimentado?: number;
}

interface ContactDetails {
  contact: Contact;
  summary: {
    em_aberto: number;
    vencido: number;
    movimentado: number;
  };
  upcomingReceivables: any[];
  lastReceived: any[];
}

interface Supplier {
  id: number;
  person_type: string;
  name?: string;
  cpf?: string;
  cnpj?: string;
  company_name?: string;
  trade_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;
}

export default function Contatos() {
  const [activeTab, setActiveTab] = useState<"cliente" | "fornecedor" | "funcionario" | "socio">("cliente");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [detailTab, setDetailTab] = useState("info");
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    person_type: "juridica",
    document: "",
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    inscricao_municipal: "",
    inscricao_estadual: "",
    email: "",
    phone: "",
    contact_person: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipcode: "",
    notes: "",
    bank_name: "",
    bank_agency: "",
    bank_account: "",
    bank_account_digit: "",
    pix_key: "",
  });

  useEffect(() => {
    if (activeTab === "fornecedor") {
      fetchSuppliers();
    } else {
      fetchContacts();
    }
  }, [activeTab]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/contacts?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const data = await response.json();
      setContacts(data.contacts);
      // Auto-select first contact
      if (data.contacts.length > 0) {
        fetchContactDetails(data.contacts[0].id);
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactDetails = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch contact details");
      const data = await response.json();
      setSelectedContact(data);
    } catch (error) {
      console.error("Error loading contact details:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingContact ? `/api/contacts/${editingContact.id}` : "/api/contacts";
      const method = editingContact ? "PUT" : "POST";
      const token = localStorage.getItem("token");

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, type: activeTab }),
      });

      if (!response.ok) throw new Error("Failed to save contact");

      setIsDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      console.error("Error saving contact:", error);
      alert("Erro ao salvar contato");
    }
  };



  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      person_type: contact.person_type || "juridica",
      document: contact.document || "",
      cnpj: contact.cnpj || "",
      razao_social: contact.razao_social || "",
      nome_fantasia: contact.nome_fantasia || "",
      inscricao_municipal: contact.inscricao_municipal || "",
      inscricao_estadual: contact.inscricao_estadual || "",
      email: contact.email || "",
      phone: contact.phone || "",
      contact_person: contact.contact_person || "",
      website: contact.website || "",
      address: contact.address || "",
      city: contact.city || "",
      state: contact.state || "",
      zipcode: contact.zipcode || "",
      notes: contact.notes || "",
      bank_name: contact.bank_name || "",
      bank_agency: contact.bank_agency || "",
      bank_account: contact.bank_account || "",
      bank_account_digit: contact.bank_account_digit || "",
      pix_key: contact.pix_key || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      person_type: "juridica",
      document: "",
      cnpj: "",
      razao_social: "",
      nome_fantasia: "",
      inscricao_municipal: "",
      inscricao_estadual: "",
      email: "",
      phone: "",
      contact_person: "",
      website: "",
      address: "",
      city: "",
      state: "",
      zipcode: "",
      notes: "",
      bank_name: "",
      bank_agency: "",
      bank_account: "",
      bank_account_digit: "",
      pix_key: "",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.document && c.document.includes(searchTerm))
  );

  const filteredSuppliers = suppliers.filter((s) =>
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.company_name && s.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.cnpj && s.cnpj.includes(searchTerm))
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#f7f8fa]">
      {/* Tabs Header */}
      <div className="absolute top-0 left-0 right-0 bg-white border-b px-6 z-10">
        <div className="flex items-center justify-between py-3">
          <h1 className="text-lg font-semibold text-gray-600">Contatos</h1>
        </div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-transparent border-b-0 h-auto p-0 gap-1">
            <TabsTrigger 
              value="cliente" 
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4"
            >
              Clientes
            </TabsTrigger>
            <TabsTrigger 
              value="fornecedor"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4"
            >
              Fornecedores
            </TabsTrigger>
            <TabsTrigger 
              value="funcionario"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4"
            >
              Funcionários
            </TabsTrigger>
            <TabsTrigger 
              value="socio"
              className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-4"
            >
              Sócios
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 pt-[104px]">
        {/* Left Sidebar - Contact List */}
        <div className="w-[360px] bg-white border-r flex flex-col">
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {activeTab === "cliente" && "Clientes"}
                {activeTab === "fornecedor" && "Fornecedores"}
                {activeTab === "funcionario" && "Funcionários"}
                {activeTab === "socio" && "Sócios"}
              </h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Printer className="h-4 w-4" />
                </Button>
                {activeTab !== "fornecedor" && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => { resetForm(); setIsDialogOpen(true); }}
                      className="h-8"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Novo cliente
                    </Button>
                  </>
                )}
              </div>
            </div>
            <Input
              placeholder="Buscar pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Table Header */}
          <div className="px-4 py-2 border-b bg-gray-50 grid grid-cols-[2fr_1fr_1fr] gap-2 text-xs font-medium text-gray-600">
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900">
              <span>Nome</span>
              <ChevronDown className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900">
              <span>Em aberto</span>
              <ChevronDown className="h-3 w-3" />
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-900">
              <span>Vencido</span>
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === "fornecedor" ? (
              filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="px-4 py-3 border-b hover:bg-gray-50 cursor-pointer"
                >
                  <div className="font-medium text-sm text-blue-600">
                    {supplier.person_type === "Pessoa Jurídica" 
                      ? supplier.company_name || supplier.trade_name 
                      : supplier.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {supplier.person_type === "Pessoa Jurídica" ? supplier.cnpj : supplier.cpf}
                  </div>
                </div>
              ))
            ) : loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                Nenhum contato encontrado
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => fetchContactDetails(contact.id)}
                  className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer grid grid-cols-[2fr_1fr_1fr] gap-2 items-start ${
                    selectedContact?.contact.id === contact.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div>
                    <div className="font-medium text-sm text-blue-600 hover:underline truncate">
                      {contact.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {contact.document || contact.cnpj || "-"}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {formatCurrency(contact.em_aberto || 0)}
                  </div>
                  <div className="text-right text-sm text-red-600">
                    {formatCurrency(contact.vencido || 0)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Total */}
          <div className="px-4 py-3 border-t bg-gray-50 grid grid-cols-[2fr_1fr_1fr] gap-2 text-sm font-semibold">
            <div>Total</div>
            <div className="text-right">
              {formatCurrency(filteredContacts.reduce((sum, c) => sum + (c.em_aberto || 0), 0))}
            </div>
            <div className="text-right text-red-600">
              {formatCurrency(filteredContacts.reduce((sum, c) => sum + (c.vencido || 0), 0))}
            </div>
          </div>
        </div>

        {/* Right Panel - Contact Details */}
        <div className="flex-1 overflow-y-auto bg-[#f7f8fa]">
          {selectedContact ? (
            <div className="p-6 space-y-4">
              {/* Header Card */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold">{selectedContact.contact.name}</h2>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => openEditDialog(selectedContact.contact)}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedContact.contact.document || selectedContact.contact.cnpj}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-1">Em aberto</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(selectedContact.summary.em_aberto || 0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-gray-500 mb-1">E-mail</div>
                    <div className="font-medium">{selectedContact.contact.email || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Telefone</div>
                    <div className="font-medium">{selectedContact.contact.phone || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Contato</div>
                    <div className="font-medium">{selectedContact.contact.contact_person || "-"}</div>
                  </div>
                </div>

                <button 
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMoreInfo ? 'rotate-180' : ''}`} />
                  Mais informações
                </button>

                {showMoreInfo && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Website</div>
                      <div className="font-medium">{selectedContact.contact.website || "-"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Endereço</div>
                      <div className="font-medium">{selectedContact.contact.address || "-"}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Cidade/Estado</div>
                      <div className="font-medium">
                        {selectedContact.contact.city && selectedContact.contact.state 
                          ? `${selectedContact.contact.city}, ${selectedContact.contact.state}`
                          : "-"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-xs text-gray-500 mb-1">Vencido</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(selectedContact.summary.vencido || 0)}
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  <div className="text-xs text-gray-500 mb-1">Movimentado</div>
                  <div className="text-xs text-gray-400 mb-1">12 meses</div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(selectedContact.summary.movimentado || 0)}
                  </div>
                </div>
                <div className="bg-white rounded-lg border p-4">
                  {/* Empty card for balance/spacing */}
                </div>
              </div>

              {/* Tabs Section */}
              <div className="bg-white rounded-lg border">
                <Tabs value={detailTab} onValueChange={setDetailTab}>
                  <div className="border-b px-4">
                    <TabsList className="bg-transparent h-auto p-0 gap-4">
                      <TabsTrigger 
                        value="info" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent pb-3 pt-4"
                      >
                        Anotações
                      </TabsTrigger>
                      <TabsTrigger 
                        value="files" 
                        className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent pb-3 pt-4"
                      >
                        Arquivos
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="info" className="p-4 m-0">
                    <div className="text-sm text-gray-600">
                      {selectedContact.contact.notes || "Nenhuma anotação"}
                    </div>
                    <Button variant="link" className="mt-2 p-0 h-auto text-blue-600">
                      + Nova anotação
                    </Button>
                  </TabsContent>
                  <TabsContent value="files" className="p-4 m-0">
                    <div className="text-sm text-gray-600">Nenhum arquivo armazenado</div>
                    <Button variant="link" className="mt-2 p-0 h-auto text-blue-600">
                      + Novo arquivo
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Upcoming Receivables */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Próximas contas a receber</h3>
                  <Button variant="link" className="text-blue-600 p-0 h-auto text-sm">
                    + Agendar recebimento
                  </Button>
                </div>
                <div className="p-4">
                  {selectedContact.upcomingReceivables && selectedContact.upcomingReceivables.length > 0 ? (
                    <div className="space-y-2">
                      {selectedContact.upcomingReceivables.map((item: any) => (
                        <div key={item.id} className="text-sm">
                          {item.description} - {formatDate(item.receipt_date)} - {formatCurrency(item.amount)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Nenhum lançamento</div>
                  )}
                </div>
              </div>

              {/* Last Received */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold">Últimas contas recebidas</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10 text-xs">Descrição</TableHead>
                      <TableHead className="h-10 text-xs">Ref.</TableHead>
                      <TableHead className="h-10 text-xs">Vencimento</TableHead>
                      <TableHead className="h-10 text-xs">Pagamento</TableHead>
                      <TableHead className="h-10 text-xs text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedContact.lastReceived && selectedContact.lastReceived.length > 0 ? (
                      selectedContact.lastReceived.map((item: any) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell className="py-2 text-sm">{item.description}</TableCell>
                          <TableCell className="py-2 text-sm">-</TableCell>
                          <TableCell className="py-2 text-sm">{formatDate(item.receipt_date)}</TableCell>
                          <TableCell className="py-2 text-sm">{item.paid_date ? formatDate(item.paid_date) : "-"}</TableCell>
                          <TableCell className="py-2 text-sm text-right">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8 text-sm">
                          Nenhuma conta recebida
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              {activeTab === "fornecedor" 
                ? "Selecione um fornecedor para ver os detalhes"
                : "Selecione um contato para ver os detalhes"}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Editar" : "Novo"} cliente
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="contact" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="contact">Dados de contato</TabsTrigger>
                <TabsTrigger value="address">Endereço</TabsTrigger>
                <TabsTrigger value="bank">Dados bancários</TabsTrigger>
              </TabsList>

              <TabsContent value="contact" className="space-y-4 mt-4">
                <div>
                  <Label>Tipo de cliente</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    <Button
                      type="button"
                      variant={formData.person_type === "juridica" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, person_type: "juridica" })}
                      className="h-20 flex flex-col items-center gap-2"
                    >
                      <Building2 className="h-6 w-6" />
                      <span className="text-xs">Pessoa Jurídica</span>
                    </Button>
                    <Button
                      type="button"
                      variant={formData.person_type === "fisica" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, person_type: "fisica" })}
                      className="h-20 flex flex-col items-center gap-2"
                    >
                      <User className="h-6 w-6" />
                      <span className="text-xs">Pessoa Física</span>
                    </Button>
                    <Button
                      type="button"
                      variant={formData.person_type === "exterior" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, person_type: "exterior" })}
                      className="h-20 flex flex-col items-center gap-2"
                    >
                      <Globe className="h-6 w-6" />
                      <span className="text-xs">Exterior</span>
                    </Button>
                  </div>
                </div>

                {formData.person_type === "juridica" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="razao_social">Razão Social</Label>
                        <Input
                          id="razao_social"
                          value={formData.razao_social}
                          onChange={(e) => setFormData({ ...formData, razao_social: e.target.value, name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nome_fantasia">Nome fantasia</Label>
                        <Input
                          id="nome_fantasia"
                          value={formData.nome_fantasia}
                          onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="inscricao_municipal">Inscrição Municipal</Label>
                        <Input
                          id="inscricao_municipal"
                          value={formData.inscricao_municipal}
                          onChange={(e) => setFormData({ ...formData, inscricao_municipal: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="document">CPF</Label>
                      <Input
                        id="document"
                        value={formData.document}
                        onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="email">E-mail(s) para envio</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">Pessoa de contato</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      maxLength={2}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipcode">CEP</Label>
                    <Input
                      id="zipcode"
                      value={formData.zipcode}
                      onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_name">Banco</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_agency">Agência</Label>
                    <Input
                      id="bank_agency"
                      value={formData.bank_agency}
                      onChange={(e) => setFormData({ ...formData, bank_agency: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank_account">Conta</Label>
                    <Input
                      id="bank_account"
                      value={formData.bank_account}
                      onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank_account_digit">Dígito</Label>
                    <Input
                      id="bank_account_digit"
                      value={formData.bank_account_digit}
                      onChange={(e) => setFormData({ ...formData, bank_account_digit: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Cadastrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
