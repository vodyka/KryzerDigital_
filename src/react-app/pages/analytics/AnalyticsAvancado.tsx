import AnalyticsTab from "@/react-app/components/AnalyticsTab";

export default function AnalyticsAvancadoPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Analytics Avançado
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Análises avançadas de produtos e vendas
        </p>
      </div>
      <AnalyticsTab />
    </div>
  );
}
