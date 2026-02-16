import { useState, useEffect } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { Building2, MapPin, Phone, Upload, Save, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Card } from "@/react-app/components/ui/card";
import { useNavigate } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/react-app/components/ui/alert-dialog";

interface CompanyProfile {
  id: number;
  name: string;
  logo_url: string | null;
  cnpj: string | null;
  razao_social: string | null;
  inscricao_estadual: string | null;
  endereco_cep: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  telefone: string | null;
  email: string | null;
}

export default function PerfilEmpresa() {
  const { selectedCompany, companies } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCompany) {
      loadProfile();
    }
  }, [selectedCompany]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      console.log("[Frontend] Loading profile for company ID:", selectedCompany?.id);
      console.log("[Frontend] Token exists:", !!token);
      console.log("[Frontend] URL:", `/api/companies/${selectedCompany?.id}/profile`);
      
      const response = await fetch(`/api/companies/${selectedCompany?.id}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      console.log("[Frontend] Response status:", response.status);
      console.log("[Frontend] Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Frontend] Error response:", errorText);
        throw new Error(`Erro ao carregar perfil: ${response.status}`);
      }

      const data = await response.json();
      console.log("[Frontend] Profile data received:", data);
      setProfile(data.company);
      if (data.company.logo_url) {
        setLogoPreview(data.company.logo_url);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload para R2
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      console.log("[Logo Upload] Uploading file to R2...");
      
      const uploadResponse = await fetch("/api/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        credentials: "include",
      });

      if (!uploadResponse.ok) throw new Error("Erro no upload");

      const uploadData = await uploadResponse.json();
      console.log("[Logo Upload] Upload successful, URL:", uploadData.url);
      
      // Atualizar estado local
      setProfile((prev) => prev ? { ...prev, logo_url: uploadData.url } : null);
      
      // Salvar no banco de dados imediatamente
      console.log("[Logo Upload] Saving to database...");
      const saveResponse = await fetch(`/api/companies/${selectedCompany?.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          logo_url: uploadData.url,
        }),
      });

      if (!saveResponse.ok) throw new Error("Erro ao salvar logo no banco");
      
      console.log("[Logo Upload] Logo saved successfully");
      
      // Recarregar o perfil para garantir que está sincronizado
      await loadProfile();
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao fazer upload da logo");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/companies/${selectedCompany?.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name,
          logo_url: profile.logo_url,
          cnpj: profile.cnpj,
          razao_social: profile.razao_social,
          inscricao_estadual: profile.inscricao_estadual,
          endereco_cep: profile.endereco_cep,
          endereco_rua: profile.endereco_rua,
          endereco_numero: profile.endereco_numero,
          endereco_complemento: profile.endereco_complemento,
          endereco_bairro: profile.endereco_bairro,
          endereco_cidade: profile.endereco_cidade,
          endereco_estado: profile.endereco_estado,
          telefone: profile.telefone,
          email: profile.email,
        }),
      });

      if (!response.ok) throw new Error("Erro ao salvar");

      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = async () => {
    try {
      setDeleting(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/companies/${selectedCompany?.id}`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir empresa");
      }

      alert("Empresa excluída com sucesso!");
      
      // Redirecionar para dashboard e recarregar para atualizar lista de empresas
      navigate("/dashboard");
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao excluir empresa:", error);
      alert(error.message || "Erro ao excluir empresa");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  const formatCEP = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
    }
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  };

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Perfil da Empresa</h1>
          <p className="text-sm text-muted-foreground">Nenhuma empresa selecionada</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Perfil da Empresa</h1>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Perfil da Empresa</h1>
          <p className="text-sm text-muted-foreground">
            Erro ao carregar dados. Por favor, tente novamente.
          </p>
        </div>
        <Button onClick={loadProfile}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Perfil da Empresa</h1>
        <p className="text-sm text-muted-foreground">
          Complete os dados cadastrais da sua empresa
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Card className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <Label className="text-sm font-medium">Logo da Empresa</Label>
              <p className="text-xs text-muted-foreground mb-3">
                PNG ou JPG, recomendado 512x512px
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("logo-upload")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </Button>
            </div>
          </div>
        </Card>

        {/* Dados Básicos */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Dados Básicos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome Fantasia</Label>
              <Input
                id="name"
                value={profile.name || ""}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Nome Fantasia"
              />
            </div>
            <div>
              <Label htmlFor="razao_social">Razão Social</Label>
              <Input
                id="razao_social"
                value={profile.razao_social || ""}
                onChange={(e) => setProfile({ ...profile, razao_social: e.target.value })}
                placeholder="Razão Social"
              />
            </div>
            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={profile.cnpj || ""}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  setProfile({ ...profile, cnpj: cleaned });
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    setProfile({ ...profile, cnpj: formatCNPJ(e.target.value) });
                  }
                }}
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>
            <div>
              <Label htmlFor="inscricao_estadual">Inscrição Estadual</Label>
              <Input
                id="inscricao_estadual"
                value={profile.inscricao_estadual || ""}
                onChange={(e) =>
                  setProfile({ ...profile, inscricao_estadual: e.target.value })
                }
                placeholder="Inscrição Estadual"
              />
            </div>
          </div>
        </Card>

        {/* Contato */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contato
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={profile.telefone || ""}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  setProfile({ ...profile, telefone: cleaned });
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    setProfile({ ...profile, telefone: formatPhone(e.target.value) });
                  }
                }}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={profile.email || ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="contato@empresa.com.br"
              />
            </div>
          </div>
        </Card>

        {/* Endereço */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Endereço
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="endereco_cep">CEP</Label>
              <Input
                id="endereco_cep"
                value={profile.endereco_cep || ""}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, "");
                  setProfile({ ...profile, endereco_cep: cleaned });
                }}
                onBlur={(e) => {
                  if (e.target.value) {
                    setProfile({ ...profile, endereco_cep: formatCEP(e.target.value) });
                  }
                }}
                placeholder="00000-000"
                maxLength={9}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="endereco_rua">Rua</Label>
              <Input
                id="endereco_rua"
                value={profile.endereco_rua || ""}
                onChange={(e) => setProfile({ ...profile, endereco_rua: e.target.value })}
                placeholder="Rua"
              />
            </div>
            <div>
              <Label htmlFor="endereco_numero">Número</Label>
              <Input
                id="endereco_numero"
                value={profile.endereco_numero || ""}
                onChange={(e) => setProfile({ ...profile, endereco_numero: e.target.value })}
                placeholder="Nº"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="endereco_complemento">Complemento</Label>
              <Input
                id="endereco_complemento"
                value={profile.endereco_complemento || ""}
                onChange={(e) =>
                  setProfile({ ...profile, endereco_complemento: e.target.value })
                }
                placeholder="Complemento (opcional)"
              />
            </div>
            <div>
              <Label htmlFor="endereco_bairro">Bairro</Label>
              <Input
                id="endereco_bairro"
                value={profile.endereco_bairro || ""}
                onChange={(e) => setProfile({ ...profile, endereco_bairro: e.target.value })}
                placeholder="Bairro"
              />
            </div>
            <div>
              <Label htmlFor="endereco_cidade">Cidade</Label>
              <Input
                id="endereco_cidade"
                value={profile.endereco_cidade || ""}
                onChange={(e) => setProfile({ ...profile, endereco_cidade: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div>
              <Label htmlFor="endereco_estado">Estado</Label>
              <Input
                id="endereco_estado"
                value={profile.endereco_estado || ""}
                onChange={(e) =>
                  setProfile({ ...profile, endereco_estado: e.target.value.toUpperCase() })
                }
                placeholder="UF"
                maxLength={2}
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          {/* Delete Button - Only show if user has multiple companies */}
          {companies.length > 1 && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={saving || deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Empresa
            </Button>
          )}
          
          <div className="flex gap-3 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              disabled={saving || deleting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || deleting}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl">
                Excluir Empresa?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 text-base">
              <p className="font-semibold text-foreground">
                Esta ação é IRREVERSÍVEL e excluirá permanentemente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Todos os pedidos e recebimentos</li>
                <li>Todos os produtos cadastrados</li>
                <li>Todos os fornecedores</li>
                <li>Todas as categorias</li>
                <li>Todos os lançamentos financeiros</li>
                <li>Todas as contas a pagar e receber</li>
                <li>Todas as contas bancárias</li>
                <li>Todas as notificações</li>
                <li>Todos os dados de custo operacional</li>
                <li>E todos os outros dados salvos para esta empresa</li>
              </ul>
              <p className="font-semibold text-red-600 dark:text-red-400">
                Você tem certeza que deseja continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sim, Excluir Tudo
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
