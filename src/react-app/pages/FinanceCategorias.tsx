import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { useNotification } from "@/react-app/contexts/NotificationContext";
import { Category, CATEGORY_GROUPS } from "@/react-app/lib/finance-types";
import { generateId } from "@/react-app/lib/finance-utils";
import { Card, CardContent } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Badge } from "@/react-app/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/react-app/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/react-app/components/ui/collapsible";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Lock, ChevronDown, BarChart3, RotateCcw } from "lucide-react";

export default function FinanceCategoriasPage() {
  const { categories, addCategory, updateCategory, deleteCategory, restoreCategories } = useFinanceData();
  const notification = useNotification();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", type: "despesa" as "receita" | "despesa", groupId: "Receitas Operacionais" });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const resetForm = () => setForm({ name: "", type: "despesa", groupId: "Receitas Operacionais" });
  const openNew = () => { resetForm(); setEditing(null); setOpen(true); };
  const openEdit = (c: Category) => {
    if (c.isDefault) return;
    setForm({ name: c.name, type: c.type, groupId: c.groupId });
    setEditing(c);
    setOpen(true);
  };

  // Group categories by groupId
  const groupedCategories = categories.reduce((acc, cat) => {
    const groupId = cat.groupId;
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  // Get unique group names
  const uniqueGroups = Object.keys(groupedCategories).sort();

  const handleSave = async () => {
    if (!form.name) return;
    const entry: Category = {
      id: editing?.id || generateId(),
      name: form.name,
      type: form.type,
      groupId: form.groupId,
      isDefault: false,
    };
    if (editing) {
      await updateCategory(entry);
    } else {
      await addCategory(entry);
    }
    setOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat?.isDefault) return;
    await deleteCategory(id);
  };

  const handleRestore = async () => {
    if (!confirm("Tem certeza que deseja restaurar as categorias padrão? Todas as categorias personalizadas serão excluídas.")) {
      return;
    }
    try {
      await restoreCategories();
      notification.success("Categorias restauradas com sucesso!");
    } catch (error) {
      notification.error("Erro ao restaurar categorias");
    }
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isGroupOpen = (groupId: string) => {
    if (openGroups[groupId] !== undefined) return openGroups[groupId];
    return true; // Default to open
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas categorias financeiras</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRestore} variant="outline">
            <RotateCcw className="h-4 w-4 mr-1" />Restaurar
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90">
                <Plus className="h-4 w-4 mr-1" />Nova categoria
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v: "receita" | "despesa") => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita (Entrada)</SelectItem>
                    <SelectItem value="despesa">Despesa (Saída)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grupo</Label>
                <Select value={form.groupId} onValueChange={v => setForm(f => ({ ...f, groupId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {uniqueGroups.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-[#001429] hover:bg-[#001429]/90" onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        {uniqueGroups.map(groupId => {
          const groupCategories = groupedCategories[groupId] || [];
          if (groupCategories.length === 0) return null;

          return (
            <Card key={groupId}>
              <Collapsible open={isGroupOpen(groupId)} onOpenChange={() => toggleGroup(groupId)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm uppercase tracking-wide">{groupId}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">{groupCategories.length}</Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isGroupOpen(groupId) ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0 pb-2">
                    <div className="divide-y">
                      {groupCategories.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            {c.type === "receita" ? (
                              <ArrowUp className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-red-600 shrink-0" />
                            )}
                            <span className="text-sm font-medium truncate">{c.name}</span>
                            {c.isDefault && (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!c.isDefault && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
