import { useState } from "react";
import { X, Building2, User } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";

interface QuickSupplierFormProps {
  onClose: () => void;
  onSupplierCreated: (supplierId: number) => void;
}

export default function QuickSupplierForm({ onClose, onSupplierCreated }: QuickSupplierFormProps) {
  const [personType, setPersonType] = useState<"fisica" | "juridica">("juridica");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Pessoa Física
    cpf: "",
    name: "",
    // Pessoa Jurídica
    cnpj: "",
    company_name: "",
    trade_name: "",
    // Comum
    contact_email: "",
    contact_phone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_type: personType,
          ...formData,
          status: "Ativo",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao cadastrar fornecedor");
        return;
      }

      onSupplierCreated(data.supplier.id);
      onClose();
    } catch (error) {
      console.error("Error creating supplier:", error);
      alert("Erro ao cadastrar fornecedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Cadastro Rápido de Fornecedor
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Person Type */}
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Pessoa
            </Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="fisica"
                  checked={personType === "fisica"}
                  onChange={() => setPersonType("fisica")}
                  className="w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Pessoa Física</span>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="juridica"
                  checked={personType === "juridica"}
                  onChange={() => setPersonType("juridica")}
                  className="w-4 h-4"
                />
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Pessoa Jurídica</span>
                </div>
              </label>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {personType === "fisica" ? (
              <>
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Razão Social *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Razão social da empresa"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trade_name">Nome Fantasia</Label>
                  <Input
                    id="trade_name"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    placeholder="Nome fantasia (opcional)"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="contact_email">E-mail de Contato</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="contact_phone">Telefone de Contato</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Cadastrando..." : "Cadastrar Fornecedor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
