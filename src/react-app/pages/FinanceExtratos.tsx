import { useState, useMemo } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { formatCurrency, formatDate } from "@/react-app/lib/finance-utils";
import { Card } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Badge } from "@/react-app/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: "receita" | "despesa";
  amount: number;
  categoryName: string;
  balance: number;
}

export default function FinanceExtratosPage() {
  const { banks, payables, receivables, categories, activeCompanyId } = useFinanceData();
  
  const [selectedBankId, setSelectedBankId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const companyBanks = banks.filter(b => b.companyId === activeCompanyId);
  const defaultBank = companyBanks.find(b => b.isDefault) || companyBanks[0];
  const currentBankId = selectedBankId || defaultBank?.id || "";
  const currentBank = banks.find(b => b.id === currentBankId);

  // Generate transactions from payables and receivables
  const transactions = useMemo<Transaction[]>(() => {
    if (!currentBankId) return [];

    const txns: Omit<Transaction, 'balance'>[] = [];

    // Add payables (despesas)
    payables
      .filter(p => p.bankId === currentBankId && p.status === "pago")
      .forEach(p => {
        const category = categories.find(c => c.id === p.categoryId);
        txns.push({
          id: `pay-${p.id}`,
          date: p.dueDate,
          description: p.description,
          type: "despesa",
          amount: p.amount,
          categoryName: category?.name || "Sem categoria",
        });
      });

    // Add receivables (receitas)
    receivables
      .filter(r => r.bankId === currentBankId && r.status === "recebido")
      .forEach(r => {
        const category = categories.find(c => c.id === r.categoryId);
        txns.push({
          id: `rec-${r.id}`,
          date: r.receiptDate,
          description: r.description,
          type: "receita",
          amount: r.amount,
          categoryName: category?.name || "Sem categoria",
        });
      });

    // Sort by date (oldest first)
    txns.sort((a, b) => a.date.localeCompare(b.date));

    // Apply date filters
    let filteredTxns = txns;
    if (startDate) {
      filteredTxns = filteredTxns.filter(t => t.date >= startDate);
    }
    if (endDate) {
      filteredTxns = filteredTxns.filter(t => t.date <= endDate);
    }

    // Calculate running balance
    let balance = currentBank?.initialBalance || 0;
    
    // If there's a start date filter, we need to calculate the balance up to that date
    if (startDate && currentBank) {
      balance = currentBank.initialBalance;
      const txnsBeforeStart = txns.filter(t => t.date < startDate);
      txnsBeforeStart.forEach(t => {
        if (t.type === "receita") {
          balance += t.amount;
        } else {
          balance -= t.amount;
        }
      });
    }

    const result: Transaction[] = filteredTxns.map(t => {
      if (t.type === "receita") {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
      return { ...t, balance };
    });

    // Reverse to show newest first
    return result.reverse();
  }, [currentBankId, payables, receivables, categories, currentBank, startDate, endDate]);

  const initialBalance = currentBank?.initialBalance || 0;
  const currentBalance = transactions.length > 0 ? transactions[0].balance : initialBalance;

  const periodStats = useMemo(() => {
    const receitas = transactions
      .filter(t => t.type === "receita")
      .reduce((sum, t) => sum + t.amount, 0);
    const despesas = transactions
      .filter(t => t.type === "despesa")
      .reduce((sum, t) => sum + t.amount, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [transactions]);

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Extratos</h1>
        <p className="text-sm text-muted-foreground">Visualize o histórico de transações</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label>Conta Bancária</Label>
            <Select value={currentBankId} onValueChange={setSelectedBankId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {companyBanks.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.accountName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data Inicial</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Data Final</Label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="h-4 w-4" />
            <p className="text-sm">Saldo Atual</p>
          </div>
          <p className={`text-2xl font-bold ${currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(currentBalance)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUp className="h-4 w-4" />
            <p className="text-sm">Entradas no Período</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(periodStats.receitas)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingDown className="h-4 w-4" />
            <p className="text-sm">Saídas no Período</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(periodStats.despesas)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Wallet className="h-4 w-4" />
            <p className="text-sm">Saldo do Período</p>
          </div>
          <p className={`text-2xl font-bold ${periodStats.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(periodStats.saldo)}
          </p>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Saída</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!currentBankId ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Selecione uma conta bancária para visualizar o extrato
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada no período selecionado
                </TableCell>
              </TableRow>
            ) : (
              transactions.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-md ${
                        t.type === "receita"
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600"
                      }`}
                    >
                      {t.type === "receita" ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(t.date)}
                  </TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {t.categoryName}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {t.type === "receita" ? formatCurrency(t.amount) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {t.type === "despesa" ? formatCurrency(t.amount) : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold whitespace-nowrap ${
                      t.balance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(t.balance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {currentBank && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Saldo Inicial:</span>
              <span className="font-semibold">{formatCurrency(initialBalance)}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Data:</span>
              <span className="font-semibold">{formatDate(currentBank.balanceStartDate)}</span>
            </div>
            {currentBank.overdraftLimit && currentBank.overdraftLimit > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Cheque Especial:</span>
                <span className="font-semibold">{formatCurrency(currentBank.overdraftLimit)}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
