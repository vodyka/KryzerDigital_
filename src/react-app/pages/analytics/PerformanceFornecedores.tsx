import { Users, Award } from "lucide-react";

export default function PerformanceFornecedoresPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Performance de Fornecedores
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Avalie o desempenho dos seus fornecedores
        </p>
      </div>
      
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-6 rounded-full mb-6">
          <Users className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Em Desenvolvimento
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
        </p>
        <div className="mt-8 flex gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Ranking de fornecedores
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Métricas detalhadas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
