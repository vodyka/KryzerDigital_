import { Package, Activity } from "lucide-react";

export default function SaudeEstoquePage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Saúde do Estoque
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitore a saúde geral do seu estoque
        </p>
      </div>
      
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-6 rounded-full mb-6">
          <Package className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Em Desenvolvimento
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
        </p>
        <div className="mt-8 flex gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <Activity className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Score de saúde
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <Package className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Alertas inteligentes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
