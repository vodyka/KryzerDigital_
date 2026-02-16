import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { Input } from "@/react-app/components/ui/input";
import { Button } from "@/react-app/components/ui/button";
import { Label } from "@/react-app/components/ui/label";
import { User, Mail, Lock, Save, Phone, Building2, CheckCircle, AlertCircle, Camera, Shield } from "lucide-react";

export default function PerfilPage() {
  const { user, login, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [company, setCompany] = useState(user?.company || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with user context
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setCompany(user.company || "");
      setPhotoUrl((user as any).photo_url || "");
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const newPhotoUrl = reader.result as string;
      setPhotoUrl(newPhotoUrl);
      
      // Update user context with new photo
      const updatedUser = {
        ...user,
        photo_url: newPhotoUrl,
      };
      const token = localStorage.getItem("token");
      login(token!, updatedUser as any);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          company,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Erro ao atualizar perfil" });
        setLoading(false);
        return;
      }

      // Update local storage and context
      const updatedUser = {
        ...user,
        name,
        email,
        phone,
        company,
      };
      login(token!, updatedUser as any);

      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
      setIsEditing(false);
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "As senhas não coincidem!" });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "A nova senha deve ter no mínimo 8 caracteres" });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordMessage({ type: "error", text: data.error || "Erro ao alterar senha" });
        setPasswordLoading(false);
        return;
      }

      setPasswordMessage({ type: "success", text: "Senha alterada com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Erro ao conectar com o servidor" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const userInitials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie suas informações pessoais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-3xl text-white font-bold">{userInitials}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Clique na foto para alterar</p>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 mt-3">
                {user?.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{user?.email}</p>
              {user?.company && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-3 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {user.company}
                </p>
              )}
              {isAdmin && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                  Administrador
                </span>
              )}
              
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin')} 
                  variant="outline"
                  className="mt-4 w-full"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Painel Administrativo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
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
                <p
                  className={`text-sm ${
                    message.type === "success" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    placeholder="seu@email.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isEditing}
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Nome da sua empresa"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Editar Perfil
                </Button>
              ) : (
                <>
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setName(user?.name || "");
                      setEmail(user?.email || "");
                      setPhone(user?.phone || "");
                      setCompany(user?.company || "");
                      setMessage(null);
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordMessage && (
              <div
                className={`p-4 rounded-lg flex items-start gap-3 ${
                  passwordMessage.type === "success"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    passwordMessage.type === "success" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {passwordMessage.text}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Digite sua senha atual"
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  disabled={passwordLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  disabled={passwordLoading}
                />
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword || passwordLoading}
            >
              {passwordLoading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">ID da Conta</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{user?.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tipo de Conta</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {isAdmin ? "Administrador" : "Usuário Padrão"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
    </>
  );
}
