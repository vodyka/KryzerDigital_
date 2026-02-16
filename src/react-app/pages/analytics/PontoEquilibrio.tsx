import PontoEquilibrioTab from "@/react-app/components/PontoEquilibrioTab";

export default function PontoEquilibrioPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ponto de Equilíbrio
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Calcule o ponto de equilíbrio para seus produtos
        </p>
      </div>
      <PontoEquilibrioTab />
    </div>
  );
}
