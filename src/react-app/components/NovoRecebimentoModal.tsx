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
import { Badge } from "@/react-app/components/ui/badge";
import { AlertCircle, Loader2, X, Plus, Star, Paperclip, FileText } from "lucide-react";
import { formatCurrencyInput, parseCurrencyInput } from "@/react-app/utils/currency";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react-app/components/ui/popover";
import { Switch } from "@/react-app/components/ui/switch";

interface NovoRecebimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receivableId?: number;
  onSaved?: () => void;
  mode?: "create" | "edit";
}

interface Category {
  id: number;
  name: string;
  type: string;
}

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
}

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  type: "cliente" | "funcionario" | "socio";
}

interface Supplier {
  id: number;
  person_type: string;
  name?: string;
  company_name?: string;
  trade_name?: string;
}

interface CategoryLine {
  id: string;
  category_id: string;
  detalhamento: string;
  value: string;
}

export default function NovoRecebimentoModal({
  open,
  onOpenChange,
  receivableId,
  onSaved,
}: NovoRecebimentoModalProps) {
  const [vencimento, setVencimento] = useState("");
  const [previstaPara, setPrevistaPara] = useState("");
  const [contactId, setContactId] = useState("");
  const [selectedContactName, setSelectedContactName] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [categoryLines, setCategoryLines] = useState<CategoryLine[]>([
    { id: "1", category_id: "", detalhamento: "", value: "" }
  ]);
  const [bankAccountId, setBankAccountId] = useState("");

  // Toggles
  const [valoresDetalhados, setValoresDetalhados] = useState(false);
  const [recorrencia, setRecorrencia] = useState(false);
  const [automatizarCobranca, setAutomatizarCobranca] = useState(false);
  const [automatizarNFSe, setAutomatizarNFSe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [hasBankAccounts, setHasBankAccounts] = useState(true);
  const [error, setError] = useState("");
  const [openContactPicker, setOpenContactPicker] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      if (receivableId) {
        loadReceivableData();
      } else {
        resetForm();
      }
    }
  }, [open, receivableId]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Load categories (only income)
      const categoriesRes = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const incomeCategories = (categoriesData.categories || []).filter(
          (cat: Category) => cat.type === "income"
        );
        setCategories(incomeCategories);
      }

      // Load all contacts (clientes, funcionarios, socios)
      const contactTypes = ["cliente", "funcionario", "socio"];
      const allContacts: Contact[] = [];

      for (const type of contactTypes) {
        const contactsRes = await fetch(`/api/contacts?type=${type}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          const typedContacts = (contactsData.contacts || []).map((c: any) => ({
            ...c,
            type: type as "cliente" | "funcionario" | "socio"
          }));
          allContacts.push(...typedContacts);
        }
      }
      setContacts(allContacts);

      // Load suppliers
      const suppliersRes = await fetch("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData.suppliers || []);
      }

      // Load bank accounts
      const banksRes = await fetch("/api/bank-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        const accounts = banksData.accounts || [];
        setBankAccounts(accounts);
        setHasBankAccounts(accounts.length > 0);

        if (accounts.length === 0) {
          setError(
            "Você precisa cadastrar pelo menos uma conta bancária antes de editar um recebimento."
          );
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const loadReceivableData = async () => {
    if (!receivableId) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/accounts-receivable/${receivableId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVencimento(data.receipt_date?.split("T")[0] || "");
        setPrevistaPara(data.competence_date?.split("T")[0] || data.receipt_date?.split("T")[0] || "");
        setSelectedContactName(data.customer_name || "");
        setContactId(data.contact_id?.toString() || "");
        setDescription(data.description || "");
        setReference(data.reference || "");
        setBankAccountId(data.bank_account_id?.toString() || "");

        // Load category data from category_details or fallback to single category
        if (data.category_details) {
          try {
            const details = JSON.parse(data.category_details);
            if (Array.isArray(details) && details.length > 0) {
              setCategoryLines(details.map((item: any, index: number) => {
                const amountInCents = Math.round(parseFloat(item.value || 0) * 100).toString();
                return {
                  id: (index + 1).toString(),
                  category_id: item.category_id?.toString() || "",
                  detalhamento: item.detalhamento || "",
                  value: formatCurrencyInput(amountInCents)
                };
              }));
            }
          } catch (e) {
            console.error("Error parsing category_details:", e);
            // Fallback to single category
            if (data.category_id) {
              const amountInCents = Math.round(parseFloat(data.amount) * 100).toString();
              setCategoryLines([{
                id: "1",
                category_id: data.category_id.toString(),
                detalhamento: data.cost_center || "",
                value: formatCurrencyInput(amountInCents)
              }]);
            }
          }
        } else if (data.category_id) {
          // Fallback for old data without category_details
          const amountInCents = Math.round(parseFloat(data.amount) * 100).toString();
          setCategoryLines([{
            id: "1",
            category_id: data.category_id.toString(),
            detalhamento: data.cost_center || "",
            value: formatCurrencyInput(amountInCents)
          }]);
        }
      }
    } catch (err) {
      console.error("Error loading receivable data:", err);
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setVencimento(today);
    setPrevistaPara(today);
    setContactId("");
    setSelectedContactName("");
    setDescription("");
    setReference("");
    setCategoryLines([{ id: "1", category_id: "", detalhamento: "", value: "" }]);
    setValoresDetalhados(false);
    setRecorrencia(false);
    setAutomatizarCobranca(false);
    setAutomatizarNFSe(false);
    setError("");
  };

  const addCategoryLine = () => {
    const newId = (categoryLines.length + 1).toString();
    setCategoryLines([...categoryLines, { id: newId, category_id: "", detalhamento: "", value: "" }]);
  };

  const removeCategoryLine = (id: string) => {
    if (categoryLines.length === 1) return;
    setCategoryLines(categoryLines.filter(line => line.id !== id));
  };

  const updateCategoryLine = (id: string, field: keyof CategoryLine, value: string) => {
    setCategoryLines(categoryLines.map(line =>
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const handleContactSelect = (id: string, name: string) => {
    setContactId(id);
    setSelectedContactName(name);
    setOpenContactPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasBankAccounts) return;

    if (!vencimento) {
      setError("Preencha a data de vencimento");
      return;
    }

    // Validate at least one category with value
    const validLines = categoryLines.filter(line => line.category_id && line.value);
    if (validLines.length === 0) {
      setError("Adicione pelo menos uma categoria com valor");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Calculate total amount
      const totalAmount = categoryLines.reduce((sum, line) => {
        const lineValue = parseCurrencyInput(line.value);
        return sum + (isNaN(lineValue) ? 0 : lineValue);
      }, 0);

      if (totalAmount <= 0) {
        setError("O valor total deve ser maior que zero");
        setLoading(false);
        return;
      }

      const selectedBank = bankAccounts.find(b => b.id.toString() === bankAccountId);
      const bankAccountName =
        selectedBank
          ? `${selectedBank.account_name} - ${selectedBank.bank_name}`
          : "";

      // Prepare category details as JSON string
      const categoryDetails = JSON.stringify(
        validLines.map(line => ({
          category_id: parseInt(line.category_id),
          detalhamento: line.detalhamento || null,
          value: parseCurrencyInput(line.value)
        }))
      );

      const payload = {
        receipt_date: vencimento,
        customer_name: selectedContactName || "Cliente não especificado",
        contact_id: contactId ? parseInt(contactId) : null,
        description: description || "",
        reference: reference || "",
        amount: totalAmount,
        category_id: validLines.length > 0 ? parseInt(validLines[0].category_id) : null,
        category_details: categoryDetails,
        cost_center: validLines[0]?.detalhamento || null,
        payment_method: "A receber",
        bank_account: bankAccountName,
        bank_account_id: bankAccountId ? parseInt(bankAccountId) : null,
        is_paid: 0
      };

      const token = localStorage.getItem("token");
      const url = receivableId ? `/api/accounts-receivable/${receivableId}` : "/api/accounts-receivable";
      const method = receivableId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSaved?.();
        onOpenChange(false);
        resetForm();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erro ao salvar recebimento");
      }
    } catch (err) {
      console.error("Error saving receivable:", err);
      setError("Erro ao salvar recebimento");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = categoryLines.reduce((sum, line) => {
    const lineValue = parseCurrencyInput(line.value);
    return sum + (isNaN(lineValue) ? 0 : lineValue);
  }, 0);

  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalAmount);

  // Group contacts by type
  const clientesList = contacts.filter(c => c.type === "cliente");
  const funcionariosList = contacts.filter(c => c.type === "funcionario");
  const sociosList = contacts.filter(c => c.type === "socio");

  if (!hasBankAccounts) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Atenção</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={() => (window.location.href = "/financeiro/bancos")}>
              Ir para Bancos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          w-[96vw]
          max-w-[1200px]
          lg:max-w-[1280px]
          xl:max-w-[1400px]
          2xl:max-w-[1520px]
          p-0
          overflow-hidden
        "
      >
        {/* Header fixo */}
        <DialogHeader className="px-6 py-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <DialogTitle className="text-lg sm:text-xl leading-tight">
                  Editar Recebimento
                </DialogTitle>
                <span className="text-xs text-muted-foreground">
                  Atualize as informações deste recebimento
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Star className="h-4 w-4" />
              </Button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Paperclip className="h-4 w-4" />
                Anotações
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <FileText className="h-4 w-4" />
                Arquivos
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com scroll */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Não foi possível salvar
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Seção 1: Datas + Contato */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Dados principais</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Defina datas e selecione quem vai pagar.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                {/* Datas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vencimento">Vencimento</Label>
                    <Input
                      id="vencimento"
                      type="date"
                      value={vencimento}
                      onChange={(e) => setVencimento(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="previstaPara">Prevista para</Label>
                    <Input
                      id="previstaPara"
                      type="date"
                      value={previstaPara}
                      onChange={(e) => setPrevistaPara(e.target.value)}
                    />
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Popover open={openContactPicker} onOpenChange={setOpenContactPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between text-left font-normal h-11"
                      >
                        <span className="truncate">
                          {selectedContactName || "Selecione um contato..."}
                        </span>
                        <span className="text-xs text-muted-foreground">▼</span>
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[520px] max-w-[90vw] p-0" align="start">
                      <div className="p-3 border-b">
                        <Input placeholder="Buscar pelo nome..." />
                      </div>

                      <div className="max-h-[320px] overflow-y-auto p-2 space-y-3">
                        {clientesList.length > 0 && (
                          <div>
                            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                              Clientes
                            </div>
                            <div className="space-y-1">
                              {clientesList.map((contact) => (
                                <Button
                                  key={`cliente-${contact.id}`}
                                  variant="ghost"
                                  className="w-full justify-start h-10"
                                  onClick={() => handleContactSelect(contact.id.toString(), contact.name)}
                                >
                                  {contact.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {suppliers.length > 0 && (
                          <div>
                            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                              Fornecedores
                            </div>
                            <div className="space-y-1">
                              {suppliers.map((supplier) => {
                                const name =
                                  supplier.person_type === "Pessoa Jurídica"
                                    ? supplier.company_name || supplier.trade_name || ""
                                    : supplier.name || "";
                                return (
                                  <Button
                                    key={`fornecedor-${supplier.id}`}
                                    variant="ghost"
                                    className="w-full justify-start h-10"
                                    onClick={() => handleContactSelect(supplier.id.toString(), name)}
                                  >
                                    {name || "Sem nome"}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {sociosList.length > 0 && (
                          <div>
                            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                              Sócios
                            </div>
                            <div className="space-y-1">
                              {sociosList.map((contact) => (
                                <Button
                                  key={`socio-${contact.id}`}
                                  variant="ghost"
                                  className="w-full justify-start h-10"
                                  onClick={() => handleContactSelect(contact.id.toString(), contact.name)}
                                >
                                  {contact.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}

                        {funcionariosList.length > 0 && (
                          <div>
                            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                              Funcionários
                            </div>
                            <div className="space-y-1">
                              {funcionariosList.map((contact) => (
                                <Button
                                  key={`funcionario-${contact.id}`}
                                  variant="ghost"
                                  className="w-full justify-start h-10"
                                  onClick={() => handleContactSelect(contact.id.toString(), contact.name)}
                                >
                                  {contact.name}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Descrição e Referência */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">
                      Descrição <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="description"
                      placeholder="Ex.: Serviço prestado"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">
                      Referência <span className="text-muted-foreground text-xs">(opcional)</span>
                    </Label>
                    <Input
                      id="reference"
                      placeholder="NF, código..."
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 2: Categorias */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Categorias e valores</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Distribua o total por categoria (uma ou mais linhas).
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                <div className="hidden md:grid grid-cols-[1.7fr_1.7fr_1fr_auto] gap-3 text-xs text-muted-foreground px-1">
                  <span>Categoria</span>
                  <span>Detalhamento</span>
                  <span className="text-right">Valor</span>
                  <span />
                </div>

                <div className="space-y-3">
                  {categoryLines.map((line) => (
                    <div
                      key={line.id}
                      className="rounded-xl border p-3 md:p-0 md:border-0"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[1.7fr_1.7fr_1fr_auto] gap-3 items-end">
                        <div className="space-y-2">
                          <Label className="md:sr-only">Categoria</Label>
                          <Select
                            value={line.category_id}
                            onValueChange={(value) => updateCategoryLine(line.id, "category_id", value)}
                          >
                            <SelectTrigger className="h-11 rounded-xl border-muted bg background">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="md:sr-only">
                            Detalhamento <span className="text-muted-foreground text-xs">(opcional)</span>
                          </Label>
                          <Input
                            className="h-11"
                            placeholder="Detalhes (opcional)…"
                            value={line.detalhamento}
                            onChange={(e) => updateCategoryLine(line.id, "detalhamento", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="md:sr-only">Valor</Label>
                          <Input
                            type="text"
                            className="h-11 text-right tabular-nums"
                            placeholder="0,00"
                            value={line.value}
                            onChange={(e) =>
                              updateCategoryLine(line.id, "value", formatCurrencyInput(e.target.value))
                            }
                          />
                        </div>

                        <div className="flex md:justify-end">
                          {categoryLines.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCategoryLine(line.id)}
                              className="h-11 w-11"
                              title="Remover linha"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div className="h-11 w-11" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCategoryLine}
                    className="h-10 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar categoria
                  </Button>
                </div>
              </div>
            </section>

            {/* Seção 3: Preferências */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Opções</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configurações adicionais para este recebimento.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="valoresDetalhados" className="cursor-pointer font-normal">
                      Valores detalhados
                    </Label>
                    {valoresDetalhados && (
                      <Badge variant="secondary" className="text-xs">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <Switch
                    id="valoresDetalhados"
                    checked={valoresDetalhados}
                    onCheckedChange={setValoresDetalhados}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <Label htmlFor="recorrencia" className="cursor-pointer font-normal">
                    Recorrência ou Parcelamento
                  </Label>
                  <Switch
                    id="recorrencia"
                    checked={recorrencia}
                    onCheckedChange={setRecorrencia}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <Label htmlFor="automatizarCobranca" className="cursor-pointer font-normal">
                    Automatizar cobrança
                  </Label>
                  <Switch
                    id="automatizarCobranca"
                    checked={automatizarCobranca}
                    onCheckedChange={setAutomatizarCobranca}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label htmlFor="automatizarNFSe" className="cursor-pointer font-normal">
                      Automatizar emissão de NFS-e
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      Disponível no seu plano
                    </Badge>
                  </div>
                  <Switch
                    id="automatizarNFSe"
                    checked={automatizarNFSe}
                    onCheckedChange={setAutomatizarNFSe}
                  />
                </div>
              </div>
            </section>

            {/* Seção 4: Conta bancária */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Conta bancária</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione onde este recebimento será conciliado.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-2">
                <Label htmlFor="bankAccount">Conta</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger id="bankAccount" className="h-11">
                    <SelectValue placeholder="Selecione uma conta..." />
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
            </section>
          </form>
        </div>

        {/* Footer fixo */}
        <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
            <div className="flex items-baseline justify-between sm:justify-start gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-2xl font-semibold tabular-nums">{formattedTotal}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-11"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className="h-11 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
