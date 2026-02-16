import { useState } from "react";
import { Button } from "@/react-app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Alert, AlertDescription } from "@/react-app/components/ui/alert";
import { CloudUpload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MigrationDialog({ open, onOpenChange }: MigrationDialogProps) {
  const [status, setStatus] = useState<"idle" | "migrating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  const {
    companies,
    banks,
    categories,
    payables,
    payments,
    receivables,
    receipts,
    suppliersClients,
    activeCompanyId,
  } = useFinanceData();

  const handleMigrate = async () => {
    setStatus("migrating");
    setErrorMessage("");

    try {
      // Sanitize data - convert all undefined values to null
      const sanitize = (obj: any): any => {
        if (obj === undefined) return null;
        if (obj === null) return null;
        if (Array.isArray(obj)) return obj.map(sanitize);
        if (typeof obj === 'object') {
          const sanitized: any = {};
          for (const key in obj) {
            sanitized[key] = sanitize(obj[key]);
          }
          return sanitized;
        }
        return obj;
      };

      const token = localStorage.getItem("token");
      const response = await fetch("/api/migrate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          companies: sanitize(companies),
          banks: sanitize(banks),
          categories: sanitize(categories),
          payables: sanitize(payables),
          payments: sanitize(payments),
          receivables: sanitize(receivables),
          receipts: sanitize(receipts),
          suppliersClients: sanitize(suppliersClients),
          activeCompanyId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao migrar dados");
      }

      setStatus("success");
      
      // Aguardar 2 segundos e recarregar para buscar dados do banco
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Migration error:", error);
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido");
    }
  };

  const totalItems = companies.length + banks.length + categories.length + 
                     payables.length + payments.length + receivables.length + 
                     receipts.length + suppliersClients.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" />
            Migrar Dados para a Nuvem
          </DialogTitle>
          <DialogDescription>
            Seus dados serão salvos no banco de dados e você poderá acessá-los de qualquer dispositivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {status === "idle" && (
            <>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="font-medium mb-2">Dados encontrados neste dispositivo:</h4>
                <ul className="space-y-1 text-sm">
                  <li>✓ {companies.length} empresa(s)</li>
                  <li>✓ {banks.length} conta(s) bancária(s)</li>
                  <li>✓ {categories.length} categoria(s)</li>
                  <li>✓ {payables.length} conta(s) a pagar</li>
                  <li>✓ {receivables.length} conta(s) a receber</li>
                  <li>✓ {suppliersClients.length} fornecedor(es)/cliente(s)</li>
                  <li className="font-semibold pt-1 border-t mt-2">
                    Total: {totalItems} itens
                  </li>
                </ul>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Importante:</strong> Esta ação irá substituir qualquer dado existente no servidor 
                  pelos dados deste dispositivo. Certifique-se de que estes são os dados mais atualizados.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleMigrate}
                  className="flex-1"
                  disabled={totalItems === 0}
                >
                  Migrar para a Nuvem
                </Button>
              </div>
            </>
          )}

          {status === "migrating" && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <h4 className="font-medium mb-2">Migrando dados...</h4>
              <p className="text-sm text-muted-foreground">
                Enviando {totalItems} itens para o servidor
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h4 className="font-medium mb-2">Migração concluída!</h4>
              <p className="text-sm text-muted-foreground">
                Seus dados foram salvos com sucesso. Recarregando página...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
                <h4 className="font-medium mb-2">Erro na migração</h4>
                <p className="text-sm text-muted-foreground">
                  {errorMessage}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus("idle");
                    setErrorMessage("");
                  }}
                  className="flex-1"
                >
                  Tentar Novamente
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
