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
import { Checkbox } from "@/react-app/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react-app/components/ui/popover";
import { Switch } from "@/react-app/components/ui/switch";
import { PAYMENT_METHODS } from "@/react-app/constants/payment-methods";

interface AgendarPagamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
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

interface Supplier {
  id: number;
  person_type: string;
  name?: string;
  company_name?: string;
  trade_name?: string;
}

interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  type: "cliente" | "funcionario" | "socio";
}

interface CategoryLine {
  id: string;
  category_id: string;
  detalhamento: string;
  value: string;
}

export default function AgendarPagamentoModal({
  open,
  onOpenChange,
  onSaved,
}: AgendarPagamentoModalProps) {
  const [vencimento, setVencimento] = useState("");
  const [previstaPara, setPrevistaPara] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [categoryLines, setCategoryLines] = useState<CategoryLine[]>([
    { id: "1", category_id: "", detalhamento: "", value: "" }
  ]);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [bankAccountId, setBankAccountId] = useState("");

  // Toggles
  const [valoresDetalhados, setValoresDetalhados] = useState(false);
  const [recorrencia, setRecorrencia] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState<"recorrencia" | "parcelamento">("recorrencia");
  
  // Recorrência fields
  const [recorrenciaIntervalo, setRecorrenciaIntervalo] = useState("1");
  const [recorrenciaUnidade, setRecorrenciaUnidade] = useState("mês(es)");
  const [recorrenciaTermino, setRecorrenciaTermino] = useState<"indefinido" | "apos" | "data">("indefinido");
  const [recorrenciaOcorrencias, setRecorrenciaOcorrencias] = useState("3");
  const [recorrenciaDataFim, setRecorrenciaDataFim] = useState("");
  
  // Parcelamento fields
  const [parcelamentoTipo, setParcelamentoTipo] = useState<"igual" | "dividido">("dividido");
  const [parcelamentoQuantidade, setParcelamentoQuantidade] = useState("2");
  
  interface Parcela {
    numero: number;
    valor: string;
    vencimento: string;
    descricao: string;
    referencia: string;
  }
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [hasBankAccounts, setHasBankAccounts] = useState(true);
  const [error, setError] = useState("");
  const [openSupplierPicker, setOpenSupplierPicker] = useState(false);
  const [continueScheduling, setContinueScheduling] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      resetForm();
    }
  }, [open]);

  // Generate parcelas when relevant fields change
  useEffect(() => {
    if (recorrencia && tipoRecorrencia === "parcelamento" && vencimento) {
      const totalValue = categoryLines.reduce(
        (sum, line) => sum + parseCurrencyInput(line.value),
        0
      );
      const numParcelas = parseInt(parcelamentoQuantidade);
      const valorParcela = parcelamentoTipo === "dividido" 
        ? totalValue / numParcelas 
        : totalValue;

      const novasParcelas: Parcela[] = [];
      for (let i = 0; i < numParcelas; i++) {
        const dataVencimento = new Date(vencimento);
        dataVencimento.setMonth(dataVencimento.getMonth() + i);
        
        novasParcelas.push({
          numero: i + 1,
          valor: valorParcela.toFixed(2),
          vencimento: dataVencimento.toISOString().split("T")[0],
          descricao: "",
          referencia: "",
        });
      }
      setParcelas(novasParcelas);
    }
  }, [vencimento, parcelamentoQuantidade, parcelamentoTipo, recorrencia, tipoRecorrencia, categoryLines]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");

      // Load categories (only expense)
      const categoriesRes = await fetch("/api/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const expenseCategories = (categoriesData.categories || []).filter(
          (cat: Category) => cat.type === "expense"
        );
        setCategories(expenseCategories);
      }

      // Load suppliers
      const suppliersRes = await fetch("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (suppliersRes.ok) {
        const suppliersData = await suppliersRes.json();
        setSuppliers(suppliersData.suppliers || []);
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

      // Load bank accounts
      const banksRes = await fetch("/api/bank-accounts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (banksRes.ok) {
        const banksData = await banksRes.json();
        const accounts = banksData.accounts || [];
        setBankAccounts(accounts);
        setHasBankAccounts(accounts.length > 0);

        const defaultBank = accounts.find((b: BankAccount) => b.account_name);
        if (defaultBank) setBankAccountId(defaultBank.id.toString());

        if (accounts.length === 0) {
          setError(
            "Você precisa cadastrar pelo menos uma conta bancária antes de agendar um pagamento."
          );
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const resetForm = () => {
    const today = new Date().toISOString().split("T")[0];
    setVencimento(today);
    setPrevistaPara(today);
    setSupplierId("");
    setSelectedSupplierName("");
    setDescription("");
    setReference("");
    setCategoryLines([{ id: "1", category_id: "", detalhamento: "", value: "" }]);
    setPaymentMethod("Pix");
    setValoresDetalhados(false);
    setRecorrencia(false);
    setContinueScheduling(false);
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

  const handleSupplierSelect = (id: string, name: string) => {
    setSupplierId(id);
    setSelectedSupplierName(name);
    setOpenSupplierPicker(false);
  };

  const updateParcela = (numero: number, field: keyof Parcela, value: string) => {
    setParcelas(parcelas.map(p => 
      p.numero === numero ? { ...p, [field]: value } : p
    ));
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

    // Validate parcelas if dividido
    if (recorrencia && tipoRecorrencia === "parcelamento" && parcelamentoTipo === "dividido") {
      const totalCategories = categoryLines.reduce((sum, line) => 
        sum + parseCurrencyInput(line.value), 0
      );
      const totalParcelas = parcelas.reduce((sum, p) => 
        sum + parseCurrencyInput(p.valor), 0
      );
      
      if (Math.abs(totalCategories - totalParcelas) > 0.01) {
        setError(`A soma das parcelas (${formatCurrencyInput(totalParcelas.toFixed(2))}) deve ser igual ao valor total (${formatCurrencyInput(totalCategories.toFixed(2))})`);
        return;
      }
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

      const payload: any = {
        supplier_id: supplierId ? parseInt(supplierId) : null,
        due_date: vencimento,
        competence_date: previstaPara || vencimento,
        description: description || "",
        reference: reference || "",
        amount: -Math.abs(totalAmount),
        category_id: validLines.length > 0 ? parseInt(validLines[0].category_id) : null,
        category_details: categoryDetails,
        cost_center: validLines[0]?.detalhamento || null,
        payment_method: paymentMethod,
        bank_account: bankAccountName,
        bank_account_id: bankAccountId ? parseInt(bankAccountId) : null,
        is_paid: 0
      };
      
      // Add installments if parcelamento is enabled
      if (recorrencia && tipoRecorrencia === "parcelamento" && parcelas.length > 0) {
        payload.installments = parcelas.map(p => ({
          numero: p.numero,
          valor: parseCurrencyInput(p.valor).toFixed(2),
          vencimento: p.vencimento,
          descricao: p.descricao || description || "",
          referencia: p.referencia || reference || "",
        }));
      }

      const token = localStorage.getItem("token");
      const response = await fetch("/api/accounts-payable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        onSaved?.();
        if (!continueScheduling) {
          onOpenChange(false);
        } else {
          resetForm();
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erro ao agendar pagamento");
      }
    } catch (err) {
      console.error("Error saving payable:", err);
      setError("Erro ao agendar pagamento");
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
                  Agendar pagamento
                </DialogTitle>
                <span className="text-xs text-muted-foreground">
                  Registre um pagamento futuro e organize seu fluxo de caixa
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
            {/* Seção 1: Datas + Fornecedor */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Dados principais</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Defina datas e selecione o fornecedor.
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

                {/* Fornecedor */}
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Popover open={openSupplierPicker} onOpenChange={setOpenSupplierPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between text-left font-normal h-11"
                      >
                        <span className="truncate">
                          {selectedSupplierName || "Selecione um fornecedor..."}
                        </span>
                        <span className="text-xs text-muted-foreground">▼</span>
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[520px] max-w-[90vw] p-0" align="start">
                      <div className="p-3 border-b">
                        <Input placeholder="Buscar pelo nome..." />
                      </div>

                      <div className="max-h-[320px] overflow-y-auto p-2 space-y-3">
                        {suppliers.length > 0 && (
                          <div>
                            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                              Fornecedores
                            </div>
                            <div className="space-y-1">
                              {suppliers.map((supplier) => {
                                const name =
                                  supplier.person_type === "juridica" || supplier.person_type === "Pessoa Jurídica"
                                    ? supplier.company_name || supplier.trade_name || ""
                                    : supplier.name || "";
                                return (
                                  <Button
                                    key={`fornecedor-${supplier.id}`}
                                    variant="ghost"
                                    className="w-full justify-start h-10"
                                    onClick={() => handleSupplierSelect(supplier.id.toString(), name)}
                                  >
                                    {name || "Sem nome"}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        )}

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
                                  onClick={() => handleSupplierSelect(contact.id.toString(), contact.name)}
                                >
                                  {contact.name}
                                </Button>
                              ))}
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
                                  onClick={() => handleSupplierSelect(contact.id.toString(), contact.name)}
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
                                  onClick={() => handleSupplierSelect(contact.id.toString(), contact.name)}
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
                      placeholder="Ex.: Compra, serviço..."
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
                  Configurações adicionais para este pagamento.
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
              </div>
            </section>

            {/* Seção de Recorrência/Parcelamento (condicional) */}
            {recorrencia && (
              <section className="rounded-2xl border bg-card">
                <div className="px-4 sm:px-5 py-4 border-b">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTipoRecorrencia("recorrencia")}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        tipoRecorrencia === "recorrencia"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Recorrência
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoRecorrencia("parcelamento")}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        tipoRecorrencia === "parcelamento"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Parcelamento
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  {tipoRecorrencia === "recorrencia" ? (
                    <>
                      <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
                        <div className="space-y-2">
                          <Label>Repetir a cada</Label>
                          <Input
                            type="number"
                            min="1"
                            value={recorrenciaIntervalo}
                            onChange={(e) => setRecorrenciaIntervalo(e.target.value)}
                            className="h-11 w-24"
                          />
                        </div>
                        <div className="space-y-2">
                          <Select value={recorrenciaUnidade} onValueChange={setRecorrenciaUnidade}>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mês(es)">mês(es)</SelectItem>
                              <SelectItem value="semana(s)">semana(s)</SelectItem>
                              <SelectItem value="dia(s)">dia(s)</SelectItem>
                              <SelectItem value="ano(s)">ano(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Término</Label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="termino"
                              checked={recorrenciaTermino === "indefinido"}
                              onChange={() => setRecorrenciaTermino("indefinido")}
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Indeterminado</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="termino"
                              checked={recorrenciaTermino === "apos"}
                              onChange={() => setRecorrenciaTermino("apos")}
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Após</span>
                            <Input
                              type="number"
                              min="1"
                              value={recorrenciaOcorrencias}
                              onChange={(e) => setRecorrenciaOcorrencias(e.target.value)}
                              disabled={recorrenciaTermino !== "apos"}
                              className="h-9 w-20"
                            />
                            <span className="text-sm">ocorrências</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="termino"
                              checked={recorrenciaTermino === "data"}
                              onChange={() => setRecorrenciaTermino("data")}
                              className="h-4 w-4"
                            />
                            <span className="text-sm">Após</span>
                            <Input
                              type="date"
                              value={recorrenciaDataFim}
                              onChange={(e) => setRecorrenciaDataFim(e.target.value)}
                              disabled={recorrenciaTermino !== "data"}
                              className="h-9 w-auto"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <span>
                            Provisão:{" "}
                            <span className="font-medium text-foreground">
                              {recorrenciaTermino === "apos" ? recorrenciaOcorrencias : "3"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
                          <input
                            type="radio"
                            name="parcelamentoTipo"
                            checked={parcelamentoTipo === "igual"}
                            onChange={() => setParcelamentoTipo("igual")}
                            className="h-4 w-4 mt-0.5 shrink-0"
                          />
                          <span className="text-sm">
                            As parcelas terão o mesmo valor do agendamento
                          </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border bg-background hover:bg-accent/50 transition-colors">
                          <input
                            type="radio"
                            name="parcelamentoTipo"
                            checked={parcelamentoTipo === "dividido"}
                            onChange={() => setParcelamentoTipo("dividido")}
                            className="h-4 w-4 mt-0.5 shrink-0"
                          />
                          <span className="text-sm">
                            O valor do agendamento será dividido entre as parcelas
                          </span>
                        </label>
                      </div>

                      {parcelamentoTipo === "dividido" && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                          <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            Serão criados agendamentos para cada parcela e seus valores divididos proporcionalmente entre as categorias.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Parcelas</Label>
                        <Select value={parcelamentoQuantidade} onValueChange={setParcelamentoQuantidade}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 2).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {vencimento && parcelas.length > 0 && (
                        <div className="space-y-2">
                          <div className="hidden md:grid grid-cols-[0.5fr_1fr_1.5fr_2fr_2fr] gap-3 px-3 pb-2 text-xs font-medium text-muted-foreground border-b">
                            <div></div>
                            <div>Valor</div>
                            <div>Vencimento</div>
                            <div>Descrição <span className="font-normal">(opcional)</span></div>
                            <div>Referência <span className="font-normal">(opcional)</span></div>
                          </div>

                          <div className="space-y-2">
                            {parcelas.map((parcela) => {
                              const isEditavel = parcelamentoTipo === "dividido";
                              
                              return (
                                <div
                                  key={parcela.numero}
                                  className="grid grid-cols-1 md:grid-cols-[0.5fr_1fr_1.5fr_2fr_2fr] gap-3 p-3 rounded-xl border bg-background"
                                >
                                  <div className="flex items-center">
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {parcela.numero}/{parcelas.length}
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <Input
                                      type="text"
                                      value={formatCurrencyInput(parcela.valor)}
                                      onChange={(e) => {
                                        const rawValue = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                                        updateParcela(parcela.numero, "valor", rawValue);
                                      }}
                                      disabled={!isEditavel}
                                      className={`h-10 text-right tabular-nums ${!isEditavel ? 'bg-muted' : ''}`}
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <Input
                                      type="date"
                                      value={parcela.vencimento}
                                      onChange={(e) => updateParcela(parcela.numero, "vencimento", e.target.value)}
                                      disabled={!isEditavel}
                                      className={`h-10 ${!isEditavel ? 'bg-muted' : ''}`}
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <Input
                                      type="text"
                                      placeholder="Descrição..."
                                      value={parcela.descricao}
                                      onChange={(e) => updateParcela(parcela.numero, "descricao", e.target.value)}
                                      className="h-10"
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <Input
                                      type="text"
                                      placeholder="Referência..."
                                      value={parcela.referencia}
                                      onChange={(e) => updateParcela(parcela.numero, "referencia", e.target.value)}
                                      className="h-10"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-2 px-3 border-t">
                            <span className="text-sm font-medium">
                              {parcelamentoTipo === "dividido" ? "Soma das parcelas:" : "Total:"}
                            </span>
                            <span className="text-lg font-semibold tabular-nums">
                              {formatCurrencyInput(
                                parcelas.reduce((sum, p) => sum + parseCurrencyInput(p.valor), 0).toFixed(2)
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            {/* Seção 4: Forma de pagamento e conta bancária */}
            <section className="rounded-2xl border bg-card">
              <div className="px-4 sm:px-5 py-4 border-b">
                <h3 className="text-sm font-semibold">Pagamento</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione a forma de pagamento e conta bancária.
                </p>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Forma de pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger id="paymentMethod" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
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
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer fixo */}
        <DialogFooter className="px-6 py-4 border-t bg-background sticky bottom-0 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4">
            <div className="flex items-baseline justify-between sm:justify-start gap-3">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Total a pagar</span>
                <span className="text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">{formattedTotal}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="continueScheduling"
                  checked={continueScheduling}
                  onCheckedChange={(checked) => setContinueScheduling(checked as boolean)}
                />
                <Label htmlFor="continueScheduling" className="text-sm font-normal cursor-pointer">
                  Continuar agendando
                </Label>
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
                  className="h-11 min-w-[140px] bg-red-600 hover:bg-red-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Agendar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
