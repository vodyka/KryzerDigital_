import { useState } from "react";
import {
  Target,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card, CardContent } from "@/react-app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";

interface CentroCusto {
  id: number;
  nome: string;
}

const centrosCustoIniciais: CentroCusto[] = [
  { id: 1, nome: "Administrativo" },
  { id: 2, nome: "Comercial" },
  { id: 3, nome: "Financeiro" },
  { id: 4, nome: "Marketing" },
  { id: 5, nome: "Operacional" },
  { id: 6, nome: "Produção" },
  { id: 7, nome: "RH" },
  { id: 8, nome: "TI" },
];

export default function CentroCustoPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>(centrosCustoIniciais);
  const [novoCentro, setNovoCentro] = useState("");
  const [editandoCentro, setEditandoCentro] = useState<CentroCusto | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (novoCentro.trim()) {
      if (editandoCentro) {
        setCentrosCusto(
          centrosCusto.map((c) =>
            c.id === editandoCentro.id ? { ...c, nome: novoCentro } : c
          )
        );
      } else {
        const novoId = Math.max(...centrosCusto.map((c) => c.id), 0) + 1;
        setCentrosCusto([...centrosCusto, { id: novoId, nome: novoCentro }]);
      }
      setNovoCentro("");
      setEditandoCentro(null);
      setDialogOpen(false);
    }
  };

  const handleEditar = (centro: CentroCusto) => {
    setEditandoCentro(centro);
    setNovoCentro(centro.nome);
    setDialogOpen(true);
  };

  const handleExcluir = (id: number) => {
    setCentrosCusto(centrosCusto.filter((c) => c.id !== id));
  };

  const handleNovoClick = () => {
    setEditandoCentro(null);
    setNovoCentro("");
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Centro de Custo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie os centros de custo da sua empresa
          </p>
        </div>
        <Button onClick={handleNovoClick}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Centro
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {centrosCusto.map((centro) => (
          <Card key={centro.id} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {centro.nome}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Centro de Custos
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditar(centro)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => handleExcluir(centro.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editandoCentro ? "Editar Centro de Custo" : "Novo Centro de Custo"}
            </DialogTitle>
            <DialogDescription>
              {editandoCentro
                ? "Atualize o nome do centro de custo"
                : "Cadastre um novo centro de custo para organização financeira"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Centro de Custo</Label>
              <Input
                id="nome"
                value={novoCentro}
                onChange={(e) => setNovoCentro(e.target.value)}
                placeholder="Ex.: Administrativo, Marketing, TI..."
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setNovoCentro("");
                  setEditandoCentro(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editandoCentro ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
