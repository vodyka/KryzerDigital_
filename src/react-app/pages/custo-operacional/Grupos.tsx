import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Textarea } from "@/react-app/components/ui/textarea";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Package,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react";

interface ProductGroup {
  id: number;
  group_name: string;
  description: string;
  spu: string | null;
  product_count: number;
  created_at: string;
  group_type: "variacao" | "composicao";
}

interface GroupItem {
  id: number;
  sku: string;
  product_name: string;
  image_url: string | null;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  image_url: string | null;
  product_type: string;
}

export default function GruposPage() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [groupItems, setGroupItems] = useState<GroupItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Product search state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allGroupItems, setAllGroupItems] = useState<string[]>([]); // SKUs in ANY group
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [showProductList, setShowProductList] = useState(false);

  // Form fields
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [spu, setSpu] = useState("");
  const [groupType, setGroupType] = useState<"variacao" | "composicao">("variacao");

  useEffect(() => {
    fetchGroups();
    fetchAllProducts();
    fetchAllGroupItems();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupItems(selectedGroup);
    } else {
      setGroupItems([]);
      setSelectedSkus(new Set());
      setSearchQuery("");
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch("/api/operational-cost/groups", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchGroupItems = async (groupId: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`/api/operational-cost/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setGroupItems(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching group items:", error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAllProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchAllGroupItems = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch("/api/operational-cost/groups/all-items", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAllGroupItems(data.skus || []);
      }
    } catch (error) {
      console.error("Error fetching all group items:", error);
    }
  };

  const resetForm = () => {
    setGroupName("");
    setDescription("");
    setSpu("");
    setGroupType("variacao");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (group: ProductGroup) => {
    setEditingId(group.id);
    setGroupName(group.group_name);
    setDescription(group.description || "");
    setSpu(group.spu || "");
    setGroupType(group.group_type || "variacao");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const body = {
        group_name: groupName,
        description: description || null,
        spu: spu || null,
        group_type: groupType,
      };

      let response;
      if (editingId) {
        response = await fetch(`/api/operational-cost/groups/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch("/api/operational-cost/groups", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      }

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: editingId ? "Grupo atualizado com sucesso!" : "Grupo criado com sucesso!",
        });
        await fetchGroups();
        resetForm();
      } else {
        setMessage({ type: "error", text: data.error || "Erro ao salvar grupo" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este grupo? Todos os produtos vinculados serão removidos.")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/operational-cost/groups/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Grupo excluído com sucesso!" });
        await fetchGroups();
        if (selectedGroup === id) {
          setSelectedGroup(null);
          setGroupItems([]);
        }
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir grupo" });
    }
  };

  const handleToggleProduct = (sku: string) => {
    const newSelected = new Set(selectedSkus);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedSkus(newSelected);
  };

  const handleAddSelectedProducts = async () => {
    if (!selectedGroup || selectedSkus.size === 0) return;

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage({ type: "error", text: "Não autorizado. Faça login novamente." });
        setLoading(false);
        return;
      }

      // Get current group to check type
      const currentGroup = groups.find(g => g.id === selectedGroup);
      if (!currentGroup) {
        setMessage({ type: "error", text: "Grupo não encontrado" });
        setLoading(false);
        return;
      }

      // Validate product types match group type
      const invalidProducts: string[] = [];
      for (const sku of selectedSkus) {
        const product = allProducts.find(p => p.sku === sku);
        if (product) {
          const isKit = product.product_type === "kit";
          const isCompositionGroup = currentGroup.group_type === "composicao";
          
          if (isCompositionGroup && !isKit) {
            invalidProducts.push(`${sku} (não é kit)`);
          } else if (!isCompositionGroup && isKit) {
            invalidProducts.push(`${sku} (é kit)`);
          }
        }
      }

      if (invalidProducts.length > 0) {
        const groupTypeName = currentGroup.group_type === "composicao" ? "composição (kits)" : "variação (produtos simples)";
        setMessage({ 
          type: "error", 
          text: `Este grupo é do tipo ${groupTypeName}. Produtos incompatíveis: ${invalidProducts.join(", ")}` 
        });
        setLoading(false);
        return;
      }

      // Add each selected SKU
      const promises = Array.from(selectedSkus).map((sku) =>
        fetch(`/api/operational-cost/groups/${selectedGroup}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sku }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every((r) => r.ok);

      if (allSuccessful) {
        setMessage({
          type: "success",
          text: `${selectedSkus.size} produto(s) adicionado(s) com sucesso!`,
        });
        setSelectedSkus(new Set());
        setSearchQuery("");
        setShowProductList(false);
        await fetchGroupItems(selectedGroup);
        await fetchGroups();
        await fetchAllGroupItems();
      } else {
        setMessage({ type: "error", text: "Alguns produtos não puderam ser adicionados" });
      }
    } catch (error) {
      console.error("Error adding products:", error);
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSku = async (sku: string) => {
    if (!selectedGroup) return;
    if (!confirm(`Tem certeza que deseja remover o SKU ${sku} deste grupo?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/operational-cost/groups/${selectedGroup}/items/${sku}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setMessage({ type: "success", text: "SKU removido com sucesso!" });
        await fetchGroupItems(selectedGroup);
        await fetchGroups();
        await fetchAllGroupItems();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao remover SKU" });
    }
  };

  // Filter products based on search query and exclude products in ANY group
  const usedSkus = new Set(allGroupItems);
  const filteredProducts = allProducts.filter((product) => {
    if (usedSkus.has(product.sku)) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.sku.toLowerCase().includes(query) ||
      product.name.toLowerCase().includes(query)
    );
  });

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grupos de Produtos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Agrupe produtos da mesma família para cálculo de custo médio ponderado
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancelar" : "Novo Grupo"}
        </Button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              {editingId ? "Editar Grupo" : "Novo Grupo"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="group_name">Nome do Grupo *</Label>
                  <Input
                    id="group_name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ex: Família 504"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group_type">Tipo de Grupo *</Label>
                  <select
                    id="group_type"
                    value={groupType}
                    onChange={(e) => setGroupType(e.target.value as "variacao" | "composicao")}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!!editingId}
                  >
                    <option value="variacao">Variação (produtos simples)</option>
                    <option value="composicao">Composição (kits)</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {groupType === "variacao" 
                      ? "Para agrupar variações do mesmo produto (cores, tamanhos, etc.)"
                      : "Para agrupar kits e controlar desmembramento nas análises"}
                  </p>
                  {editingId && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      O tipo não pode ser alterado após a criação
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spu">SPU (Código do Grupo)</Label>
                  <Input
                    id="spu"
                    value={spu}
                    onChange={(e) => setSpu(e.target.value)}
                    placeholder="Ex: 504gb"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Este código aparecerá na coluna SKU quando visualizar em modo agrupado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva este grupo de produtos..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Groups List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Grupos Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500 font-medium">Nenhum grupo cadastrado</p>
                <p className="text-sm text-gray-400 mt-1">Clique em "Novo Grupo" para começar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedGroup === group.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    onClick={() => setSelectedGroup(group.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {group.group_name}
                        </h3>
                        {group.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {group.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            group.group_type === "composicao" 
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          }`}>
                            {group.group_type === "composicao" ? "Composição" : "Variação"}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {group.product_count} produto(s) vinculado(s)
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(group);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(group.id);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {selectedGroup ? `Produtos do Grupo` : "Selecione um grupo"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedGroup ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Layers className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-gray-500 font-medium">Selecione um grupo</p>
                <p className="text-sm text-gray-400 mt-1">
                  Clique em um grupo para gerenciar seus produtos
                </p>
              </div>
            ) : (
              <>
                {/* Add Products Section */}
                <div className="mb-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowProductList(true);
                        }}
                        onFocus={() => setShowProductList(true)}
                        placeholder="Buscar produtos por nome ou SKU..."
                        className="pl-10"
                      />
                    </div>
                    {selectedSkus.size > 0 && (
                      <Button
                        onClick={handleAddSelectedProducts}
                        disabled={loading}
                        className="whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar ({selectedSkus.size})
                      </Button>
                    )}
                  </div>

                  {/* Product Selection List */}
                  {showProductList && filteredProducts.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <label
                          key={product.sku}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <Checkbox
                            checked={selectedSkus.has(product.sku)}
                            onCheckedChange={() => handleToggleProduct(product.sku)}
                            className="mt-1 flex-shrink-0"
                          />
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                {product.sku}
                              </code>
                            </div>
                            <p className="text-sm text-gray-900 dark:text-white mt-1 font-medium truncate">
                              {product.name}
                            </p>
                            {product.category && (
                              <p className="text-xs text-gray-500 mt-0.5">{product.category}</p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {showProductList && searchQuery && filteredProducts.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg">
                      Nenhum produto encontrado
                    </div>
                  )}
                </div>

                {/* Items List */}
                {groupItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 border-t">
                    <Package className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-gray-500 font-medium">Nenhum produto vinculado</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Busque e selecione produtos para adicionar ao grupo
                    </p>
                  </div>
                ) : (
                  <div className="border-t">
                    <div className="space-y-2 mt-4">
                      {groupItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name || item.sku}
                              className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <code className="text-sm font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {item.sku}
                            </code>
                            {item.product_name && (
                              <p className="text-sm text-gray-900 dark:text-white mt-1 font-medium">
                                {item.product_name}
                              </p>
                            )}
                            {!item.product_name && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Produto não encontrado
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSku(item.sku)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 ml-2 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
