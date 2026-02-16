import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Building2, Lock, LogIn, ArrowLeft } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";

export default function PortalLogin() {
  const navigate = useNavigate();
  const { portalId: urlPortalId } = useParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [portalId, setPortalId] = useState("");

  useEffect(() => {
    // If portal ID is in the URL, use it
    if (urlPortalId) {
      setPortalId(urlPortalId);
    }
  }, [urlPortalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portal_id: portalId,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Senha inválida");
        return;
      }

      // Store supplier data and redirect to portal dashboard
      localStorage.setItem("supplier", JSON.stringify(data.supplier));
      localStorage.setItem("portal_token", data.token);
      localStorage.setItem("supplier_id", data.supplier.id);
      navigate("/portal/dashboard");
    } catch (err) {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Portal do Fornecedor
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Acesse sua área exclusiva
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!portalId && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                      ⚠️ Link de acesso inválido
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Você precisa acessar o portal através do link fornecido pelo gerente de contas. O link correto tem o formato: <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">/portal/SEU-ID-AQUI</code>
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="manual_portal_id" className="text-gray-700 dark:text-gray-300">
                      Ou digite seu Portal ID manualmente
                    </Label>
                    <div className="mt-2">
                      <Input
                        type="text"
                        id="manual_portal_id"
                        placeholder="Ex: 14558-50161003000185"
                        value={portalId}
                        onChange={(e) => setPortalId(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {portalId && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Portal ID: <strong>{portalId}</strong>
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  Senha
                </Label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="password"
                    id="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Sua senha padrão são os 6 primeiros dígitos do seu CPF/CNPJ
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Acessar Portal
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Não tem acesso? Entre em contato com seu gerente de contas.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a 
            href="/" 
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar para o site
          </a>
        </div>
      </div>
    </div>
  );
}
