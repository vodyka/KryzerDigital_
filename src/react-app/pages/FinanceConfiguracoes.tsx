import { useState } from "react";
import { Card } from "@/react-app/components/ui/card";
import { Label } from "@/react-app/components/ui/label";
import { Switch } from "@/react-app/components/ui/switch";
import { Button } from "@/react-app/components/ui/button";
import { Settings, Save, Download, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/react-app/components/ui/alert";

export default function FinanceConfiguracoesPage() {
  const [settings, setSettings] = useState({
    countOverdueInBalance: true,
    showInstallments: true,
    enableNotifications: true,
    autoCalculateInterest: false,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real implementation, this would save to localStorage or backend
    localStorage.setItem("finance_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExport = () => {
    // Export finance data as JSON
    const data = {
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financas-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">Personalize o comportamento do sistema financeiro</p>
      </div>

      {saved && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Configurações salvas com sucesso!
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Cálculos e Exibição</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="overdue-balance" className="text-base">
                Incluir contas vencidas no saldo
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, contas a pagar vencidas são descontadas do saldo disponível
              </p>
            </div>
            <Switch
              id="overdue-balance"
              checked={settings.countOverdueInBalance}
              onCheckedChange={v => setSettings(s => ({ ...s, countOverdueInBalance: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="show-installments" className="text-base">
                Exibir informações de parcelamento
              </Label>
              <p className="text-sm text-muted-foreground">
                Mostra o número da parcela nas contas a pagar e receber
              </p>
            </div>
            <Switch
              id="show-installments"
              checked={settings.showInstallments}
              onCheckedChange={v => setSettings(s => ({ ...s, showInstallments: v }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-interest" className="text-base">
                Calcular juros automaticamente
              </Label>
              <p className="text-sm text-muted-foreground">
                Adiciona juros de mora em contas vencidas automaticamente
              </p>
            </div>
            <Switch
              id="auto-interest"
              checked={settings.autoCalculateInterest}
              onCheckedChange={v => setSettings(s => ({ ...s, autoCalculateInterest: v }))}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Notificações</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications" className="text-base">
                Habilitar notificações
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas sobre contas próximas do vencimento
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.enableNotifications}
              onCheckedChange={v => setSettings(s => ({ ...s, enableNotifications: v }))}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Importação e Exportação</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleExport} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Exportar Dados
          </Button>
          <Button variant="outline" className="flex-1" disabled>
            <Upload className="h-4 w-4 mr-2" />
            Importar Dados
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Faça backup dos seus dados financeiros ou importe de outro sistema
        </p>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setSettings({
          countOverdueInBalance: true,
          showInstallments: true,
          enableNotifications: true,
          autoCalculateInterest: false,
        })}>
          Restaurar Padrões
        </Button>
        <Button onClick={handleSave} className="bg-[#001429] hover:bg-[#001429]/90">
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
