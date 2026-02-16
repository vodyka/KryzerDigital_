import { useState } from "react";
import { Alert, AlertDescription } from "@/react-app/components/ui/alert";
import { Button } from "@/react-app/components/ui/button";
import { CloudUpload, X } from "lucide-react";
import { MigrationDialog } from "@/react-app/components/MigrationDialog";

interface MigrationBannerProps {
  hasLocalData: boolean;
}

export function MigrationBanner({ hasLocalData }: MigrationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!hasLocalData || dismissed) {
    return null;
  }

  return (
    <>
      <Alert className="border-blue-600 bg-blue-50 text-blue-900 mb-4">
        <CloudUpload className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <strong className="font-semibold">Importante:</strong> Seus dados estão salvos apenas neste navegador. 
            Clique em "Migrar para Nuvem" para salvá-los no servidor e acessá-los de qualquer dispositivo.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              size="sm" 
              onClick={() => setDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CloudUpload className="h-4 w-4 mr-2" />
              Migrar Agora
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(true)}
              className="text-blue-700 hover:text-blue-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      <MigrationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
