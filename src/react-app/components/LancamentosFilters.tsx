import { useState, useEffect } from "react";
import {
  Calendar,
  Tag,
  Building2,
  UserIcon,
  Landmark,
  Wallet,
  ArrowLeftRight,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Badge } from "@/react-app/components/ui/badge";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react-app/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";

export interface LancamentosFilters {
  startDate: string;
  endDate: string;
  categoryId: string;
  costCenter: string;
  person: string;
  bankAccountId: string;
  paymentMethod: string;
  status: string;
  origin: string;
  type: string;
}

interface Category {
  id: number;
  name: string;
  type: "income" | "expense";
}

interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
}

interface FiltersProps {
  filters: LancamentosFilters;
  onFiltersChange: (filters: LancamentosFilters) => void;
  onClearAll: () => void;
}

export function LancamentosFiltersBar({ filters, onFiltersChange, onClearAll }: FiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [costCenters, setCostCenters] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Load categories
      const categoriesRes = await fetch("/api/categories");
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      // Load bank accounts
      const bankAccountsRes = await fetch("/api/bank-accounts");
      if (bankAccountsRes.ok) {
        const data = await bankAccountsRes.json();
        setBankAccounts(data.accounts || []);
      }

      // Load transactions to get unique values
      const transactionsRes = await fetch("/api/lancamentos");
      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        const transactions = data.transactions || [];

        // Extract unique cost centers
        const uniqueCostCenters = Array.from(
          new Set(
            transactions
              .map((t: any) => t.cost_center)
              .filter((cc: any) => cc && cc !== "-")
          )
        ) as string[];
        setCostCenters(uniqueCostCenters);

        // Extract unique people
        const uniquePeople = Array.from(
          new Set(
            transactions
              .map((t: any) => t.person_name)
              .filter((p: any) => p && p !== "-")
          )
        ) as string[];
        setPeople(uniquePeople);

        // Extract unique payment methods
        const uniqueMethods = Array.from(
          new Set(
            transactions
              .map((t: any) => t.payment_method)
              .filter((pm: any) => pm && pm !== "-")
          )
        ) as string[];
        setPaymentMethods(uniqueMethods);
      }
    } catch (error) {
      console.error("Erro ao carregar opções de filtro:", error);
    }
  };

  const updateFilter = (key: keyof LancamentosFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Period Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />
              Período
              {(filters.startDate || filters.endDate) && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por período</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data inicial</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => updateFilter("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Data final</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => updateFilter("endDate", e.target.value)}
                  />
                </div>
              </div>
              {(filters.startDate || filters.endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    updateFilter("startDate", "");
                    updateFilter("endDate", "");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar período
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Category Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              Categoria
              {filters.categoryId && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por categoria</h4>
              <Select
                value={filters.categoryId}
                onValueChange={(value) => updateFilter("categoryId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.categoryId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("categoryId", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar categoria
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Cost Center Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Centro de custos
              {filters.costCenter && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por centro de custos</h4>
              <Select
                value={filters.costCenter}
                onValueChange={(value) => updateFilter("costCenter", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc} value={cc}>
                      {cc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.costCenter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("costCenter", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar centro de custos
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Person Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <UserIcon className="h-3.5 w-3.5" />
              Pessoa
              {filters.person && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por pessoa</h4>
              <Select
                value={filters.person}
                onValueChange={(value) => updateFilter("person", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {people.map((person) => (
                    <SelectItem key={person} value={person}>
                      {person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.person && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("person", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar pessoa
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Bank Account Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" />
              Conta
              {filters.bankAccountId && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por conta</h4>
              <Select
                value={filters.bankAccountId}
                onValueChange={(value) => updateFilter("bankAccountId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.account_name} - {account.bank_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.bankAccountId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("bankAccountId", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar conta
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Payment Method Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Wallet className="h-3.5 w-3.5" />
              Forma pgto.
              {filters.paymentMethod && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por forma de pagamento</h4>
              <Select
                value={filters.paymentMethod}
                onValueChange={(value) => updateFilter("paymentMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.paymentMethod && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("paymentMethod", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar forma de pagamento
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              Status
              {filters.status && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por status</h4>
              <Select
                value={filters.status}
                onValueChange={(value) => updateFilter("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="received">Recebido</SelectItem>
                  <SelectItem value="pending">Previsto</SelectItem>
                </SelectContent>
              </Select>
              {filters.status && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("status", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar status
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Origin Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              Origem
              {filters.origin && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por origem</h4>
              <Select
                value={filters.origin}
                onValueChange={(value) => updateFilter("origin", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="import">Importado</SelectItem>
                </SelectContent>
              </Select>
              {filters.origin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("origin", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar origem
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Tipo
              {filters.type && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  1
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Filtrar por tipo</h4>
              <Select
                value={filters.type}
                onValueChange={(value) => updateFilter("type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
              {filters.type && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => updateFilter("type", "")}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar tipo
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearAll}
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}
