import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/react-app/components/ui/card";

export default function CartoesCreditoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cartões de Crédito</h1>
        <p className="text-gray-600 dark:text-gray-400">Gerencie seus cartões de crédito</p>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Página em desenvolvimento
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                A funcionalidade de cartões de crédito será implementada em breve.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
