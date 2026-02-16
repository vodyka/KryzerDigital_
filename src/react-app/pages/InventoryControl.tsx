import { useState, useEffect } from "react";
import { useNotification } from "@/react-app/contexts/NotificationContext";
import { apiRequest } from "@/react-app/lib/apiClient";
import {
  Search,
  Package,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Card, CardContent, CardHeader } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/react-app/components/ui/dialog";
import { Label } from "@/react-app/components/ui/label";

interface InventoryItem {
  id: number;
  product_id: number;
  sku: string;
  product_name: string;
  cost_price: number;
  stock_quantity: number;
  created_at: string;
  updated_at: string;
}

export default function InventoryControl() {
  const notification = useNotification();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    cost_price: 0,
    stock_quantity: 0,
  });

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    filterInventory();
  }, [searchTerm, inventory]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ inventory: InventoryItem[] }>(
        "/api/inventory",
        {
          method: "GET",
          credentials: "include",
        }
      );
      setInventory(response.inventory);
    } catch (error) {
      console.error("Error loading inventory:", error);
      notification.showNotification("Erro ao carregar estoque", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ message: string; synced: number }>(
        "/api/inventory/sync",
        {
          method: "POST",
          credentials: "include",
        }
      );
      notification.showNotification(response.message, "success");
      loadInventory();
    } catch (error) {
      console.error("Error syncing inventory:", error);
      notification.showNotification("Erro ao sincronizar produtos", "error");
    } finally {
      setLoading(false);
    }
  };

  const filterInventory = () => {
    if (!searchTerm) {
      setFilteredInventory(inventory);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = inventory.filter(
      (item) =>
        item.sku.toLowerCase().includes(term) ||
        item.product_name.toLowerCase().includes(term)
    );
    setFilteredInventory(filtered);
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setEditFormData({
      cost_price: item.cost_price,
      stock_quantity: item.stock_quantity,
    });
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    try {
      await apiRequest(`/api/inventory/${editingItem.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      notification.showNotification("Estoque atualizado com sucesso", "success");
      setEditingItem(null);
      loadInventory();
    } catch (error) {
      console.error("Error updating inventory:", error);
      notification.showNotification("Erro ao atualizar estoque", "error");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalValue = filteredInventory.reduce(
    (sum, item) => sum + item.cost_price * item.stock_quantity,
    0
  );

  const totalItems = filteredInventory.reduce(
    (sum, item) => sum + item.stock_quantity,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando estoque...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Lista de Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie preços de custo e quantidades em estoque
          </p>
        </div>
        {filteredInventory.length === 0 && !loading && (
          <Button onClick={handleSync} variant="default">
            <Package className="h-4 w-4 mr-2" />
            Sincronizar Produtos
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total de Produtos
            </p>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInventory.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Total de Itens
            </p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <p className="text-sm font-medium text-muted-foreground">
              Valor Total em Estoque
            </p>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {filteredInventory.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Clique em "Sincronizar Produtos" para importar produtos existentes para o controle de estoque.
            </p>
            <Button onClick={handleSync} variant="default">
              <Package className="h-4 w-4 mr-2" />
              Sincronizar Produtos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {filteredInventory.length > 0 && (
        <>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU ou nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <Card>
        <CardContent className="p-0">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Nenhum produto encontrado"
                  : "Nenhum produto em estoque"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">SKU</th>
                    <th className="text-left p-4 font-medium">Produto</th>
                    <th className="text-right p-4 font-medium">Preço de Custo</th>
                    <th className="text-right p-4 font-medium">Estoque</th>
                    <th className="text-right p-4 font-medium">Valor Total</th>
                    <th className="text-center p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-mono text-sm">{item.sku}</td>
                      <td className="p-4">{item.product_name}</td>
                      <td className="p-4 text-right">
                        {formatCurrency(item.cost_price)}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={
                            item.stock_quantity === 0
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {item.stock_quantity}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(item.cost_price * item.stock_quantity)}
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estoque</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">SKU</p>
                <p className="font-mono font-medium">{editingItem.sku}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produto</p>
                <p className="font-medium">{editingItem.product_name}</p>
              </div>
              <div>
                <Label htmlFor="cost_price">Preço de Custo (R$)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  value={editFormData.cost_price}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      cost_price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="stock_quantity">Quantidade em Estoque</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  value={editFormData.stock_quantity}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      stock_quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
