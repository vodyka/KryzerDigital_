import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  Loader2,
  Check,
  Trash2,
  FileCheck,
  AlertTriangle,
  Download,
  Package,
  ShoppingCart,
} from "lucide-react";

export default function AdminTemplatesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploadingVariation, setUploadingVariation] = useState(false);
  const [uploadingKit, setUploadingKit] = useState(false);
  const [uploadingOrders, setUploadingOrders] = useState(false);
  const [deletingVariation, setDeletingVariation] = useState(false);
  const [deletingKit, setDeletingKit] = useState(false);
  const [deletingOrders, setDeletingOrders] = useState(false);
  const [variationTemplateUrl, setVariationTemplateUrl] = useState<string | null>(null);
  const [kitTemplateUrl, setKitTemplateUrl] = useState<string | null>(null);
  const [ordersTemplateUrl, setOrdersTemplateUrl] = useState<string | null>(null);
  const [successVariation, setSuccessVariation] = useState(false);
  const [successKit, setSuccessKit] = useState(false);
  const [successOrders, setSuccessOrders] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [variationRes, kitRes, ordersRes] = await Promise.all([
        fetch("/api/admin/variation-template", { headers }),
        fetch("/api/admin/kit-template", { headers }),
        fetch("/api/admin/orders-template", { headers }),
      ]);

      if (variationRes.ok) {
        const data = await variationRes.json();
        setVariationTemplateUrl(data.template_url || null);
      }

      if (kitRes.ok) {
        const data = await kitRes.json();
        setKitTemplateUrl(data.template_url || null);
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrdersTemplateUrl(data.template_url || null);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Apenas arquivos XLSX são aceitos");
      return;
    }

    setUploadingVariation(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/variation-template", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setVariationTemplateUrl(data.url);
        setSuccessVariation(true);
        setTimeout(() => setSuccessVariation(false), 3000);
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao fazer upload do template");
      }
    } catch (error) {
      console.error("Failed to upload variation template:", error);
      alert("Erro ao fazer upload do template");
    } finally {
      setUploadingVariation(false);
      e.target.value = "";
    }
  };

  const handleKitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Apenas arquivos XLSX são aceitos");
      return;
    }

    setUploadingKit(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/kit-template", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setKitTemplateUrl(data.url);
        setSuccessKit(true);
        setTimeout(() => setSuccessKit(false), 3000);
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao fazer upload do template");
      }
    } catch (error) {
      console.error("Failed to upload kit template:", error);
      alert("Erro ao fazer upload do template");
    } finally {
      setUploadingKit(false);
      e.target.value = "";
    }
  };

  const handleOrdersUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Apenas arquivos XLSX são aceitos");
      return;
    }

    setUploadingOrders(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/orders-template", {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setOrdersTemplateUrl(data.url);
        setSuccessOrders(true);
        setTimeout(() => setSuccessOrders(false), 3000);
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao fazer upload do template");
      }
    } catch (error) {
      console.error("Failed to upload orders template:", error);
      alert("Erro ao fazer upload do template");
    } finally {
      setUploadingOrders(false);
      e.target.value = "";
    }
  };

  const handleVariationDelete = async () => {
    if (!confirm("Remover o template de variação do sistema? Os usuários que não tiverem template próprio usarão os headers padrão.")) {
      return;
    }

    setDeletingVariation(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/variation-template", {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        setVariationTemplateUrl(null);
      } else {
        alert("Erro ao remover template");
      }
    } catch (error) {
      console.error("Failed to delete variation template:", error);
      alert("Erro ao remover template");
    } finally {
      setDeletingVariation(false);
    }
  };

  const handleKitDelete = async () => {
    if (!confirm("Remover o template de kit do sistema? Os usuários que não tiverem template próprio usarão os headers padrão.")) {
      return;
    }

    setDeletingKit(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/kit-template", {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        setKitTemplateUrl(null);
      } else {
        alert("Erro ao remover template");
      }
    } catch (error) {
      console.error("Failed to delete kit template:", error);
      alert("Erro ao remover template");
    } finally {
      setDeletingKit(false);
    }
  };

  const handleOrdersDelete = async () => {
    if (!confirm("Remover o template de pedidos do sistema? Os usuários que não tiverem template próprio usarão os headers padrão.")) {
      return;
    }

    setDeletingOrders(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/admin/orders-template", {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        setOrdersTemplateUrl(null);
      } else {
        alert("Erro ao remover template");
      }
    } catch (error) {
      console.error("Failed to delete orders template:", error);
      alert("Erro ao remover template");
    } finally {
      setDeletingOrders(false);
    }
  };

  const handleImportExampleTemplate = async (type: "variation" | "kit" | "orders") => {
    if (!confirm(`Importar template de exemplo para ${type === "variation" ? "variação" : type === "kit" ? "composição" : "pedidos"}?`)) {
      return;
    }

    const setUploading = type === "variation" ? setUploadingVariation : type === "kit" ? setUploadingKit : setUploadingOrders;
    const setSuccess = type === "variation" ? setSuccessVariation : type === "kit" ? setSuccessKit : setSuccessOrders;
    const setUrl = type === "variation" ? setVariationTemplateUrl : type === "kit" ? setKitTemplateUrl : setOrdersTemplateUrl;

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/admin/${type}-template/import-example`, {
        method: "POST",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        setUrl(data.url);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const error = await response.json();
        alert(error.error || "Erro ao importar template de exemplo");
      }
    } catch (error) {
      console.error("Failed to import example template:", error);
      alert("Erro ao importar template de exemplo");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin")}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Templates do Sistema</h1>
                <p className="text-xs text-gray-500">Gerencie os templates padrão do UpSeller</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Como funciona o sistema de templates</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>Os templates configurados aqui serão usados como <strong>padrão do sistema</strong></li>
                <li>Usuários podem fazer upload do próprio template ou usar o do sistema</li>
                <li>Se o usuário não tiver template próprio, o template do sistema será usado</li>
                <li>Se não houver template do sistema, serão usados os headers padrão</li>
                <li>Você pode <strong>importar templates de exemplo</strong> para começar rapidamente</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Variação */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-orange-500" />
              Template Variação
            </h2>

            {variationTemplateUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-700">Template configurado</p>
                      <p className="text-sm text-emerald-600">Ativo no sistema</p>
                    </div>
                  </div>
                  {successVariation && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Salvo!</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={variationTemplateUrl}
                    download
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Template
                  </a>

                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition text-sm">
                    {uploadingVariation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingVariation ? "Enviando..." : "Substituir"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleVariationUpload}
                      className="hidden"
                      disabled={uploadingVariation}
                    />
                  </label>

                  <button
                    onClick={handleVariationDelete}
                    disabled={deletingVariation}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition disabled:opacity-50 text-sm"
                  >
                    {deletingVariation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deletingVariation ? "Removendo..." : "Remover"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
                    Nenhum template configurado
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium rounded-lg cursor-pointer transition text-sm">
                    {uploadingVariation ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingVariation ? "Enviando..." : "Fazer Upload"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleVariationUpload}
                      className="hidden"
                      disabled={uploadingVariation}
                    />
                  </label>
                </div>
                <button
                  onClick={() => handleImportExampleTemplate("variation")}
                  disabled={uploadingVariation}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 transition text-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Importar Template de Exemplo
                </button>
              </div>
            )}
          </div>

          {/* Template Kit */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Template Composição
            </h2>

            {kitTemplateUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-700">Template configurado</p>
                      <p className="text-sm text-emerald-600">Ativo no sistema</p>
                    </div>
                  </div>
                  {successKit && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Salvo!</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={kitTemplateUrl}
                    download
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Template
                  </a>

                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg cursor-pointer transition text-sm">
                    {uploadingKit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingKit ? "Enviando..." : "Substituir"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleKitUpload}
                      className="hidden"
                      disabled={uploadingKit}
                    />
                  </label>

                  <button
                    onClick={handleKitDelete}
                    disabled={deletingKit}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition disabled:opacity-50 text-sm"
                  >
                    {deletingKit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deletingKit ? "Removendo..." : "Remover"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
                    Nenhum template configurado
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg cursor-pointer transition text-sm">
                    {uploadingKit ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingKit ? "Enviando..." : "Fazer Upload"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleKitUpload}
                      className="hidden"
                      disabled={uploadingKit}
                    />
                  </label>
                </div>
                <button
                  onClick={() => handleImportExampleTemplate("kit")}
                  disabled={uploadingKit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Importar Template de Exemplo
                </button>
              </div>
            )}
          </div>

          {/* Template Pedidos */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
              Template Pedidos
            </h2>

            {ordersTemplateUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-700">Template configurado</p>
                      <p className="text-sm text-emerald-600">Ativo no sistema</p>
                    </div>
                  </div>
                  {successOrders && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Salvo!</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={ordersTemplateUrl}
                    download
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Template
                  </a>

                  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition text-sm">
                    {uploadingOrders ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingOrders ? "Enviando..." : "Substituir"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleOrdersUpload}
                      className="hidden"
                      disabled={uploadingOrders}
                    />
                  </label>

                  <button
                    onClick={handleOrdersDelete}
                    disabled={deletingOrders}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition disabled:opacity-50 text-sm"
                  >
                    {deletingOrders ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    {deletingOrders ? "Removendo..." : "Remover"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
                    Nenhum template configurado
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-lg cursor-pointer transition text-sm">
                    {uploadingOrders ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingOrders ? "Enviando..." : "Fazer Upload"}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleOrdersUpload}
                      className="hidden"
                      disabled={uploadingOrders}
                    />
                  </label>
                </div>
                <button
                  onClick={() => handleImportExampleTemplate("orders")}
                  disabled={uploadingOrders}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Importar Template de Exemplo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-sm text-orange-600 mb-1">Template Variação</p>
              <p className="font-semibold text-orange-700">
                {variationTemplateUrl ? "Ativo" : "Não configurado"}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <p className="text-sm text-purple-600 mb-1">Template Composição</p>
              <p className="font-semibold text-purple-700">
                {kitTemplateUrl ? "Ativo" : "Não configurado"}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">Template Pedidos</p>
              <p className="font-semibold text-blue-700">
                {ordersTemplateUrl ? "Ativo" : "Não configurado"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Formato aceito</p>
              <p className="font-semibold text-gray-900">XLSX (Excel)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
