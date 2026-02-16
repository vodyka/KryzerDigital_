import { useState } from "react";
import { X, Package } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import ProductLinkModal from "@/react-app/components/ProductLinkModal";
import { apiPost, apiPut } from "@/react-app/lib/api";

interface SupplierFormProps {
  onClose: () => void;
  onSuccess: () => void;
  supplier?: any;
}

const brazilianStates = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function SupplierForm({ onClose, onSuccess, supplier }: SupplierFormProps) {
  const [loading, setLoading] = useState(false);
  const [showProductLink, setShowProductLink] = useState(false);
  const [personType, setPersonType] = useState<"fisica" | "juridica">(
    supplier?.person_type || "juridica"
  );
  
  // Form fields
  const [cpf, setCpf] = useState(supplier?.cpf || "");
  const [name, setName] = useState(supplier?.name || "");
  const [cnpj, setCnpj] = useState(supplier?.cnpj || "");
  const [companyName, setCompanyName] = useState(supplier?.company_name || "");
  const [tradeName, setTradeName] = useState(supplier?.trade_name || "");
  const [municipalRegistration, setMunicipalRegistration] = useState(supplier?.municipal_registration || "");
  const [stateRegistration, setStateRegistration] = useState(supplier?.state_registration || "");
  
  const [contactEmail, setContactEmail] = useState(supplier?.contact_email || "");
  const [contactPhone, setContactPhone] = useState(supplier?.contact_phone || "");
  const [contactName, setContactName] = useState(supplier?.contact_name || "");
  
  const [addressCep, setAddressCep] = useState(supplier?.address_cep || "");
  const [addressStreet, setAddressStreet] = useState(supplier?.address_street || "");
  const [addressNumber, setAddressNumber] = useState(supplier?.address_number || "");
  const [addressComplement, setAddressComplement] = useState(supplier?.address_complement || "");
  const [addressNeighborhood, setAddressNeighborhood] = useState(supplier?.address_neighborhood || "");
  const [addressState, setAddressState] = useState(supplier?.address_state || "");
  const [addressCity, setAddressCity] = useState(supplier?.address_city || "");
  
  const [portalPassword, setPortalPassword] = useState(supplier?.portal_password || "");
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sanitize text: remove accents, special chars, and convert to uppercase
  const sanitizeText = (value: string) => {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^A-Z0-9\s]/gi, "") // Remove special characters except spaces and alphanumeric
      .toUpperCase();
  };

  // Format CPF: 000.000.000-00
  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  // Format CNPJ: 00.000.000/0000-00
  const formatCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  // Format CEP: 00.000-000
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}-${numbers.slice(5, 8)}`;
  };

  // Format phone: (00) 00000-0000
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (personType === "fisica") {
      if (!cpf.trim()) newErrors.cpf = "CPF é obrigatório";
      if (!name.trim()) newErrors.name = "Nome é obrigatório";
    } else {
      if (!cnpj.trim()) newErrors.cnpj = "CNPJ é obrigatório";
      if (!companyName.trim()) newErrors.companyName = "Razão Social é obrigatória";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    
    try {
      const body = {
        person_type: personType,
        cpf: cpf.replace(/\D/g, ""),
        name,
        cnpj: cnpj.replace(/\D/g, ""),
        company_name: companyName,
        trade_name: tradeName,
        municipal_registration: municipalRegistration,
        state_registration: stateRegistration,
        contact_email: contactEmail,
        contact_phone: contactPhone.replace(/\D/g, ""),
        contact_name: contactName,
        address_cep: addressCep.replace(/\D/g, ""),
        address_street: addressStreet,
        address_number: addressNumber,
        address_complement: addressComplement,
        address_neighborhood: addressNeighborhood,
        address_state: addressState,
        address_city: addressCity,
        portal_password: portalPassword,
      };
      
      if (supplier) {
        await apiPut(`/api/suppliers/${supplier.id}`, body);
      } else {
        await apiPost("/api/suppliers", body);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert("Erro ao salvar fornecedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showProductLink && supplier?.id && (
        <ProductLinkModal
          supplierId={supplier.id}
          onClose={() => setShowProductLink(false)}
        />
      )}
      
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {supplier ? "Editar Fornecedor" : "Novo Fornecedor"}
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
          <div className="space-y-6">
            {/* Person Type */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipo de Pessoa *
              </Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="juridica"
                    checked={personType === "juridica"}
                    onChange={(e) => setPersonType(e.target.value as "juridica")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Pessoa Jurídica</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="fisica"
                    checked={personType === "fisica"}
                    onChange={(e) => setPersonType(e.target.value as "fisica")}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Pessoa Física</span>
                </label>
              </div>
            </div>

            {/* Person Type Fields */}
            {personType === "fisica" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cpf" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    CPF *
                  </Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className={errors.cpf ? "border-red-500" : ""}
                  />
                  {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
                </div>
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(sanitizeText(e.target.value))}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cnpj" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      CNPJ *
                    </Label>
                    <Input
                      id="cnpj"
                      value={cnpj}
                      onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      className={errors.cnpj ? "border-red-500" : ""}
                    />
                    {errors.cnpj && <p className="text-xs text-red-500 mt-1">{errors.cnpj}</p>}
                  </div>
                  <div>
                    <Label htmlFor="companyName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Razão Social *
                    </Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(sanitizeText(e.target.value))}
                      className={errors.companyName ? "border-red-500" : ""}
                    />
                    {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tradeName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome Fantasia
                    </Label>
                    <Input
                      id="tradeName"
                      value={tradeName}
                      onChange={(e) => setTradeName(sanitizeText(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="municipalRegistration" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Inscrição Municipal
                    </Label>
                    <Input
                      id="municipalRegistration"
                      value={municipalRegistration}
                      onChange={(e) => setMunicipalRegistration(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stateRegistration" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Inscrição Estadual
                    </Label>
                    <Input
                      id="stateRegistration"
                      value={stateRegistration}
                      onChange={(e) => setStateRegistration(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Contact Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Dados de Contato
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="contactEmail" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefone
                  </Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label htmlFor="contactName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Contato
                  </Label>
                  <Input
                    id="contactName"
                    value={contactName}
                    onChange={(e) => setContactName(sanitizeText(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Endereço
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="addressCep" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      CEP
                    </Label>
                    <Input
                      id="addressCep"
                      value={addressCep}
                      onChange={(e) => setAddressCep(formatCep(e.target.value))}
                      placeholder="00.000-000"
                      maxLength={10}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="addressStreet" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Endereço
                    </Label>
                    <Input
                      id="addressStreet"
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(sanitizeText(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="addressNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Número
                    </Label>
                    <Input
                      id="addressNumber"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(sanitizeText(e.target.value))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="addressComplement" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Complemento
                    </Label>
                    <Input
                      id="addressComplement"
                      value={addressComplement}
                      onChange={(e) => setAddressComplement(sanitizeText(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="addressNeighborhood" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bairro
                    </Label>
                    <Input
                      id="addressNeighborhood"
                      value={addressNeighborhood}
                      onChange={(e) => setAddressNeighborhood(sanitizeText(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressState" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Estado
                    </Label>
                    <select
                      id="addressState"
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione o estado...</option>
                      {brazilianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="addressCity" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cidade
                    </Label>
                    <Input
                      id="addressCity"
                      value={addressCity}
                      onChange={(e) => setAddressCity(sanitizeText(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Portal Password */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Acesso ao Portal
              </h3>
              <div>
                <Label htmlFor="portalPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Senha do Portal *
                </Label>
                <Input
                  id="portalPassword"
                  type="text"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  placeholder="Deixe vazio para usar os 6 primeiros dígitos do CPF/CNPJ"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se não preenchida, será usada automaticamente os 6 primeiros dígitos do {personType === "fisica" ? "CPF" : "CNPJ"}
                </p>
              </div>
            </div>

            {/* Product Linking - Only for editing existing suppliers */}
            {supplier?.id && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Produtos Vinculados
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowProductLink(true)}
                  className="w-full"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Gerenciar Produtos Vinculados
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Configure quais produtos estão associados a este fornecedor
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : supplier ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}
