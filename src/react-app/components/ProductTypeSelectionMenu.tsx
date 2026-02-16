import { Package, Layers, Box, Shuffle } from "lucide-react";
import { Card, CardContent } from "@/react-app/components/ui/card";

interface ProductTypeSelectionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: "simple" | "variation" | "kit" | "dynamic") => void;
}

export default function ProductTypeSelectionMenu({
  isOpen,
  onClose,
  onSelectType,
}: ProductTypeSelectionMenuProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Criar Novo Produto
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Selecione o tipo de produto que deseja criar
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Simple Product */}
            <button
              type="button"
              onClick={() => onSelectType("simple")}
              className="w-full text-left"
            >
              <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all">
                <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      Produto Simples
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Um produto único com SKU, preço, estoque e todas as informações básicas.
                      Ideal para itens individuais sem variações.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>

            {/* Variation Product */}
            <button
              type="button"
              onClick={() => onSelectType("variation")}
              className="w-full text-left"
            >
              <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all">
                <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      Produto com Variação
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Produto com múltiplas variantes (cores, tamanhos, etc). Cada combinação
                      gera um SKU único automaticamente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>

            {/* Kit/Composition */}
            <button
              type="button"
              onClick={() => onSelectType("kit")}
              className="w-full text-left"
            >
              <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all">
                <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Box className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      Composição (Kit)
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Kit formado por produtos simples cadastrados. O estoque do kit é calculado
                      automaticamente baseado nos componentes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>

            {/* Dynamic Product */}
            <button
              type="button"
              onClick={() => onSelectType("dynamic")}
              className="w-full text-left"
            >
              <Card className="cursor-pointer hover:border-primary hover:shadow-md transition-all">
                <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shuffle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                      Produto Dinâmico
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Conjunto de produtos similares. Ao vender, o sistema escolhe aleatoriamente
                      um item do conjunto baseado no estoque disponível.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </button>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
