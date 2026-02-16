import { useState, useRef } from "react";
import { Upload, FileText, X, Check, AlertCircle, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
interface BankAccount {
  id: number;
  account_name: string;
  bank_name: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
  };
}

interface ImportOFXDialogProps {
  onImportComplete?: () => void;
  trigger?: React.ReactNode;
}

export function ImportOFXDialog({ onImportComplete, trigger }: ImportOFXDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Load all bank accounts
      const accountsResponse = await fetch("/api/bank-accounts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setBankAccounts(accountsData.accounts || []);
        
        // Load default account
        const defaultResponse = await fetch("/api/bank-accounts/default", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (defaultResponse.ok) {
          const defaultData = await defaultResponse.json();
          if (defaultData.account) {
            setBankAccountId(defaultData.account.id.toString());
          } else if (accountsData.accounts && accountsData.accounts.length > 0) {
            // If no default, select first account
            setBankAccountId(accountsData.accounts[0].id.toString());
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar contas bancárias:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadBankAccounts();
      setResult(null);
      setSelectedFile(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.name.toLowerCase().endsWith('.ofx')) {
      setSelectedFile(file);
      setResult(null);
    } else {
      setResult({
        success: false,
        message: "Por favor, selecione um arquivo .OFX válido",
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !bankAccountId) return;

    try {
      setImporting(true);
      setResult(null);

      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("bankAccountId", bankAccountId);

      const response = await fetch("/api/ofx-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Importação concluída com sucesso!",
          results: data.results,
        });

        setTimeout(() => {
          setOpen(false);
          if (onImportComplete) {
            onImportComplete();
          }
        }, 2000);
      } else {
        setResult({
          success: false,
          message: data.error || "Erro ao importar arquivo OFX",
        });
      }
    } catch (error) {
      console.error("Erro ao processar OFX:", error);
      setResult({
        success: false,
        message: "Erro ao processar arquivo. Verifique o formato do arquivo.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar OFX
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar arquivo OFX</DialogTitle>
          <DialogDescription>
            Faça upload de um extrato bancário no formato OFX para importar lançamentos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Bank Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank-account">
              Conta bancária <span className="text-destructive">*</span>
            </Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={loading}>
              <SelectTrigger id="bank-account">
                <SelectValue placeholder="Selecione uma conta..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.account_name} - {account.bank_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Selecione a conta bancária correspondente ao extrato OFX
            </p>
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Arquivo OFX</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 transition-colors
                ${dragActive ? "border-primary bg-primary/5" : "border-border"}
                ${selectedFile ? "bg-muted/30" : ""}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                    disabled={importing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-1">
                    Arraste o arquivo OFX aqui
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    ou clique para selecionar
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    Selecionar arquivo
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Import Result */}
          {result && (
            <div className={`rounded-lg border p-4 ${result.success ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
              <div className="flex gap-2">
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${result.success ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {result.success ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className={`text-sm font-medium ${result.success ? 'text-success' : 'text-destructive'}`}>
                    {result.message}
                  </p>
                  {result.results && (
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Total de transações:</span>
                        <span className="font-medium">{result.results.total}</span>
                      </div>
                      <div className="flex justify-between text-success">
                        <span>Importadas:</span>
                        <span className="font-medium">{result.results.imported}</span>
                      </div>
                      {result.results.duplicates > 0 && (
                        <div className="flex justify-between">
                          <span>Duplicadas (ignoradas):</span>
                          <span className="font-medium">{result.results.duplicates}</span>
                        </div>
                      )}
                      {result.results.errors > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>Erros:</span>
                          <span className="font-medium">{result.results.errors}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={importing}
          >
            {result?.success ? "Fechar" : "Cancelar"}
          </Button>
          {!result?.success && (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || !bankAccountId || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
