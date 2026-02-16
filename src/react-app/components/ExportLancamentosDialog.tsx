import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/react-app/components/ui/dialog";
import { Button } from "@/react-app/components/ui/button";
import { Label } from "@/react-app/components/ui/label";
import { RadioGroup } from "@/react-app/components/ui/radio-group";

interface Transaction {
  id: number;
  type: "income" | "expense";
  transaction_date: string;
  paid_date: string | null;
  created_date: string;
  description: string;
  category_name: string | null;
  cost_center: string | null;
  bank_account: string | null;
  payment_method: string | null;
  amount: number;
  person_name: string | null;
  status: "received" | "paid" | "pending";
  origin: string;
}

interface ExportLancamentosDialogProps {
  transactions: Transaction[];
  trigger?: React.ReactNode;
}

export function ExportLancamentosDialog({ transactions, trigger }: ExportLancamentosDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"csv" | "excel">("excel");
  const [exporting, setExporting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  };

  const getStatusText = (transaction: Transaction) => {
    if (transaction.status === "received") return "Recebido";
    if (transaction.status === "paid") return "Pago";
    return "Previsto";
  };

  const getTypeText = (type: string) => {
    return type === "income" ? "Entrada" : "Saída";
  };

  const getOriginText = (origin: string) => {
    return origin === "import" ? "Importado" : "Manual";
  };

  const exportToCSV = () => {
    // CSV Header
    const headers = [
      "Tipo",
      "Descrição",
      "Data de Vencimento",
      "Data de Pagamento",
      "Data de Criação",
      "Categoria",
      "Centro de Custos",
      "Pessoa",
      "Conta Bancária",
      "Forma de Pagamento",
      "Valor",
      "Status",
      "Origem",
    ];

    // CSV Rows
    const rows = transactions.map((t) => [
      getTypeText(t.type),
      `"${t.description.replace(/"/g, '""')}"`,
      formatDate(t.transaction_date),
      formatDate(t.paid_date),
      formatDate(t.created_date),
      t.category_name || "",
      t.cost_center || "",
      t.person_name || "",
      t.bank_account || "",
      t.payment_method || "",
      formatCurrency(t.amount),
      getStatusText(t),
      getOriginText(t.origin),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lancamentos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    // Create HTML table for Excel
    const headers = [
      "Tipo",
      "Descrição",
      "Data de Vencimento",
      "Data de Pagamento",
      "Data de Criação",
      "Categoria",
      "Centro de Custos",
      "Pessoa",
      "Conta Bancária",
      "Forma de Pagamento",
      "Valor",
      "Status",
      "Origem",
    ];

    const rows = transactions.map((t) => [
      getTypeText(t.type),
      t.description,
      formatDate(t.transaction_date),
      formatDate(t.paid_date),
      formatDate(t.created_date),
      t.category_name || "",
      t.cost_center || "",
      t.person_name || "",
      t.bank_account || "",
      t.payment_method || "",
      formatCurrency(t.amount),
      getStatusText(t),
      getOriginText(t.origin),
    ]);

    // Build HTML table
    let html = '<table border="1"><thead><tr>';
    headers.forEach(h => {
      html += `<th style="background-color: #f3f4f6; font-weight: bold; padding: 8px;">${h}</th>`;
    });
    html += '</tr></thead><tbody>';

    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => {
        html += `<td style="padding: 6px;">${cell}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';

    // Create and download file
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lancamentos_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));

      if (format === "csv") {
        exportToCSV();
      } else {
        exportToExcel();
      }

      // Close dialog after successful export
      setTimeout(() => {
        setOpen(false);
      }, 500);
    } catch (error) {
      console.error("Erro ao exportar:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Exportar lançamentos</DialogTitle>
          <DialogDescription>
            Exporte {transactions.length} {transactions.length === 1 ? "lançamento" : "lançamentos"} para planilha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Formato do arquivo</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "csv" | "excel")}>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="excel"
                  value="excel"
                  checked={format === "excel"}
                  onChange={() => setFormat("excel")}
                  className="h-4 w-4"
                />
                <label
                  htmlFor="excel"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10 text-success">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Excel (.xls)</p>
                    <p className="text-xs text-muted-foreground">Compatível com Excel e Google Sheets</p>
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="csv"
                  value="csv"
                  checked={format === "csv"}
                  onChange={() => setFormat("csv")}
                  className="h-4 w-4"
                />
                <label
                  htmlFor="csv"
                  className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">CSV (.csv)</p>
                    <p className="text-xs text-muted-foreground">Texto separado por vírgulas</p>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>O arquivo incluirá:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Tipo, descrição e datas</li>
              <li>Categoria e centro de custos</li>
              <li>Pessoa e conta bancária</li>
              <li>Valores e status</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
