import { useEffect, useMemo, useState } from "react";
import { Search, Plus, RefreshCw, MoreVertical, Link as LinkIcon } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/react-app/components/ui/dropdown-menu";
import { Badge } from "@/react-app/components/ui/badge";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface Integration {
  id: string;
  company_id: string;
  user_id: string;
  marketplace: string;
  site: string | null;
  store_name: string | null;
  external_store_id: string | null;
  status: string;
  status_calc?: string; // vindo do backend (/list) => active | expired | inactive | unauthorized...
  expires_at: string | null; // validade integração (365 dias)
  connected_at?: string | null; // data de autenticação (conectar/reconectar)
  created_at: string | null;
  updated_at: string | null;
  nickname: string | null;
}

const MARKETPLACES = [
  {
    id: "shopee",
    name: "Shopee",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopee_logo.svg/2560px-Shopee_logo.svg.png",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    logo: "https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png",
    color: "from-yellow-400 to-yellow-500",
  },
];

function safeParseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getSelectedCompanyId(): string | null {
  const selectedCompany = safeParseJSON<{ id?: string }>(localStorage.getItem("selectedCompany"));
  if (selectedCompany?.id) return String(selectedCompany.id);

  const selectedCompanyId = localStorage.getItem("selectedCompanyId");
  if (selectedCompanyId) return String(selectedCompanyId);

  return null;
}

function formatBR(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return format(toZonedTime(new Date(iso), "America/Sao_Paulo"), "dd/MM/yyyy HH:mm");
  } catch {
    return "—";
  }
}

function getStatusLabel(statusCalc?: string, statusRaw?: string) {
  const s = String(statusCalc || statusRaw || "").toLowerCase();
  if (s === "active") return "Ativo";
  if (s === "expired") return "Expirado";
  if (s === "unauthorized") return "Não autorizado";
  if (s === "inactive") return "Inativo";
  return s ? s : "—";
}

function getStatusVariant(statusCalc?: string, statusRaw?: string): "default" | "secondary" | "destructive" {
  const s = String(statusCalc || statusRaw || "").toLowerCase();
  if (s === "active") return "default";
  if (s === "expired") return "destructive";
  return "secondary";
}

export default function IntegracaoLoja() {
  const [selectedMarketplace, setSelectedMarketplace] = useState("shopee");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "unauthorized" | "inactive">("all");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);

  // ✅ Contagem sempre correta no menu da esquerda (mesmo entrando com Shopee selecionado)
  const [counts, setCounts] = useState<Record<string, number>>({
    shopee: 0,
    "mercado-livre": 0,
  });

  const selectedMarketplaceData = useMemo(
    () => MARKETPLACES.find((m) => m.id === selectedMarketplace),
    [selectedMarketplace]
  );

  // Carrega contagem (ML) sempre que entrar na página / trocar empresa
  useEffect(() => {
    void fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buscar integrações quando mudar marketplace
  useEffect(() => {
    void fetchIntegrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketplace]);

  // Verificar mensagens de sucesso/erro na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success === "connected") {
      alert("Conectado com sucesso! Sua loja foi conectada ao Mercado Livre");
      window.history.replaceState({}, "", "/integracoes");
      void fetchCounts();
      void fetchIntegrations();
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        no_code: "Código de autorização não recebido",
        invalid_state: "Estado de autorização inválido",
        config_incomplete: "Configuração incompleta. Verifique as credenciais do Mercado Livre",
        token_exchange_failed: "Falha ao trocar código por tokens",
        user_fetch_failed: "Falha ao buscar informações do usuário",
        callback_failed: "Erro no processo de conexão",
        different_account: "Conta diferente da reconexão. Por favor, faça login na mesma conta do Mercado Livre no navegador.",
      };

      alert(`Erro ao conectar: ${errorMessages[error] || "Erro desconhecido"}`);
      window.history.replaceState({}, "", "/integracoes");
    }
  }, []);

  async function fetchCounts() {
    try {
      const token = localStorage.getItem("token");
      const companyId = getSelectedCompanyId();
      if (!token || !companyId) return;

      // Por enquanto só ML tem list
      const resp = await fetch(`/api/integrations/mercadolivre/list?companyId=${encodeURIComponent(companyId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) return;

      const data = await resp.json().catch(() => ({}));
      const list = Array.isArray(data?.integrations) ? (data.integrations as Integration[]) : [];

      setCounts((prev) => ({
        ...prev,
        "mercado-livre": list.length,
      }));
    } catch (e) {
      console.error("fetchCounts error:", e);
    }
  }

  async function fetchIntegrations() {
    if (selectedMarketplace !== "mercado-livre") {
      setIntegrations([]);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const companyId = getSelectedCompanyId();
      if (!token || !companyId) {
        setIntegrations([]);
        return;
      }

      const response = await fetch(
        `/api/integrations/mercadolivre/list?companyId=${encodeURIComponent(companyId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("Falha ao buscar integrações:", response.status, text);
        throw new Error("Falha ao buscar integrações");
      }

      const data = await response.json().catch(() => ({}));
      const list = Array.isArray(data?.integrations) ? (data.integrations as Integration[]) : [];
      setIntegrations(list);

      // atualiza contagem
      setCounts((prev) => ({ ...prev, "mercado-livre": list.length }));
    } catch (error) {
      console.error("Error fetching integrations:", error);
      alert("Erro: Não foi possível carregar as integrações");
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(isReconnect = false, storeName = "") {
    if (selectedMarketplace !== "mercado-livre") {
      alert("Em breve: Integração com Shopee em desenvolvimento");
      return;
    }

    if (isReconnect) {
      const ok = window.confirm(
        `ATENÇÃO: Para reconectar a loja "${storeName}", você precisa estar logado na mesma conta do Mercado Livre no navegador.\n\nClique em OK para continuar.`
      );
      if (!ok) return;
    }

    try {
      const token = localStorage.getItem("token");
      const companyId = getSelectedCompanyId();
      if (!token || !companyId) {
        alert("Erro: você não está autenticado ou não selecionou empresa");
        return;
      }

      const response = await fetch(
        `/api/integrations/mercadolivre/start?companyId=${encodeURIComponent(companyId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("Falha ao iniciar conexão:", response.status, text);
        throw new Error("Falha ao iniciar conexão");
      }

      const data = await response.json().catch(() => ({}));
      if (!data?.url) throw new Error("URL de autorização não recebida");

      window.location.href = data.url as string;
    } catch (error) {
      console.error("Error starting OAuth:", error);
      alert("Erro: Não foi possível iniciar a conexão");
    }
  }

  async function handleDisconnect(integrationId: string) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Erro: você não está autenticado");

      const response = await fetch("/api/integrations/mercadolivre/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ integrationId }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("Falha ao desconectar:", response.status, text);
        throw new Error("Falha ao desconectar");
      }

      alert("Loja desconectada com sucesso");
      void fetchCounts();
      void fetchIntegrations();
    } catch (error) {
      console.error("Error disconnecting:", error);
      alert("Erro: Não foi possível desconectar a loja");
    }
  }

  async function handleSaveNickname(integrationId: string) {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Erro: você não está autenticado");

      const response = await fetch("/api/integrations/mercadolivre/update-nickname", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ integrationId, nickname: nicknameValue }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("Falha ao atualizar apelido:", response.status, text);
        throw new Error("Falha ao atualizar apelido");
      }

      setEditingNickname(null);
      setNicknameValue("");
      void fetchCounts();
      void fetchIntegrations();
    } catch (error) {
      console.error("Error updating nickname:", error);
      alert("Erro: Não foi possível atualizar o apelido");
    }
  }

  async function handleGenerateConnectionLink() {
    try {
      const token = localStorage.getItem("token");
      const companyId = getSelectedCompanyId();
      if (!token || !companyId) return alert("Erro: você não está autenticado ou não selecionou empresa");

      setGeneratingLink(true);

      const response = await fetch("/api/integrations/mercadolivre/generate-connection-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("Falha ao gerar link:", response.status, text);
        throw new Error("Falha ao gerar link");
      }

      const data = await response.json();
      await navigator.clipboard.writeText(data.url);
      alert("Link de conexão copiado!\n\nEste link expira em 1 hora.");
    } catch (error) {
      console.error("Error generating connection link:", error);
      alert("Erro: Não foi possível gerar o link de conexão");
    } finally {
      setGeneratingLink(false);
    }
  }

  const filteredIntegrations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return integrations
      .filter((i) => {
        const s = String(i.status_calc || i.status || "").toLowerCase();
        if (statusFilter === "all") return true;
        return s === statusFilter;
      })
      .filter((i) => {
        const name = (i.store_name || "").toLowerCase();
        const nick = (i.nickname || "").toLowerCase();
        return term ? name.includes(term) || nick.includes(term) : true;
      });
  }, [integrations, searchTerm, statusFilter]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Integrações</h2>
        </div>

        <div className="p-2">
          {MARKETPLACES.map((marketplace) => (
            <button
              key={marketplace.id}
              onClick={() => setSelectedMarketplace(marketplace.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                selectedMarketplace === marketplace.id
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${marketplace.color} flex items-center justify-center p-1.5`}>
                <img src={marketplace.logo} alt={marketplace.name} className="w-full h-full object-contain" />
              </div>

              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{marketplace.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {marketplace.id === "mercado-livre" ? counts["mercado-livre"] : 0}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-4">
            {selectedMarketplaceData && (
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${selectedMarketplaceData.color} flex items-center justify-center p-3 shadow-lg`}>
                <img src={selectedMarketplaceData.logo} alt={selectedMarketplaceData.name} className="w-full h-full object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedMarketplaceData?.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie suas lojas conectadas</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Nome da sua loja"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos Estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Estados</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="unauthorized">Não autorizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleGenerateConnectionLink}
                disabled={generatingLink || selectedMarketplace !== "mercado-livre"}
              >
                <LinkIcon className="w-4 h-4" />
                {generatingLink ? "Gerando..." : "Copiar link de conexão"}
              </Button>
              <Button className="gap-2" onClick={() => handleConnect()} disabled={selectedMarketplace !== "mercado-livre"}>
                <Plus className="w-4 h-4" />
                Conectar loja
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nome da sua loja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID da loja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Autenticação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expiração
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex justify-center">
                        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : selectedMarketplace !== "mercado-livre" ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                      Integração com Shopee ainda está em desenvolvimento.
                    </td>
                  </tr>
                ) : filteredIntegrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium mb-1">Nenhuma loja conectada</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Conecte sua primeira loja para começar</p>
                        </div>
                        <Button variant="outline" className="gap-2" onClick={() => handleConnect()}>
                          <Plus className="w-4 h-4" />
                          Conectar loja
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredIntegrations.map((integration) => {
                    const statusLabel = getStatusLabel(integration.status_calc, integration.status);
                    const badgeVariant = getStatusVariant(integration.status_calc, integration.status);

                    return (
                      <tr
                        key={integration.id}
                        className="group border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4">
                          {editingNickname === integration.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={nicknameValue}
                                onChange={(e) => setNicknameValue(e.target.value)}
                                placeholder={integration.store_name || "Nome da loja"}
                                className="h-8 text-sm"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" onClick={() => handleSaveNickname(integration.id)}>
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingNickname(null);
                                  setNicknameValue("");
                                }}
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {integration.nickname || integration.store_name || "—"}
                                </div>
                                {integration.nickname && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{integration.store_name}</div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingNickname(integration.id);
                                  setNicknameValue(integration.nickname || integration.store_name || "");
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Editar
                              </Button>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{integration.site || "—"}</td>

                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {integration.external_store_id || "—"}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          <Badge variant={badgeVariant}>{statusLabel}</Badge>
                        </td>

                        {/* ✅ Autenticação = connected_at (data do conectar/reconectar) */}
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatBR(integration.connected_at || integration.updated_at || integration.created_at)}
                        </td>

                        {/* ✅ Expiração = expires_at (validade 365d da integração) */}
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatBR(integration.expires_at)}
                        </td>

                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleConnect(true, integration.nickname || integration.store_name || "esta loja")}
                            >
                              <RefreshCw className="w-3 h-3" />
                              Reconectar
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => handleDisconnect(integration.id)}>
                                  Desconectar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            Lojas integradas:{" "}
            <span className="font-semibold text-gray-900 dark:text-white">{integrations.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
