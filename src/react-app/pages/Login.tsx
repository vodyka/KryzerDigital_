import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import { Mail, Lock, Chrome, AlertCircle } from "lucide-react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import MentoriaHeader from "@/react-app/components/MentoriaHeader";
import Footer from "@/react-app/components/Footer";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      console.log("[Login] Response status:", response.status);
      console.log("[Login] Response data:", data);

      if (!response.ok) {
        setError(data.error || "Erro ao fazer login");
        setLoading(false);
        return;
      }

      // Use the token returned from backend
      const token = data.token;
      console.log("[Login] Token received:", token);
      
      // Prepare user data with all fields including phone and company
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        phone: data.user.phone,
        company: data.user.company,
        is_admin: data.user.is_admin
      };
      
      console.log("[Login] User data:", userData);
      console.log("[Login] Calling login() function...");
      
      // Login via AuthContext (this will update state and localStorage)
      await login(token, userData);
      
      console.log("[Login] Login function completed");
      console.log("[Login] Token in localStorage:", localStorage.getItem("token"));
      console.log("[Login] User in localStorage:", localStorage.getItem("user"));
      
      // Redirecionar para o dashboard
      console.log("[Login] Navigating to dashboard...");
      navigate("/dashboard");
    } catch (err) {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleGoogleLogin = () => {
    // Lógica para login com Google
    console.log("Google login clicked");
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#ffd432] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MentoriaHeader onLoginClick={handleLoginClick} onRegisterClick={handleRegisterClick} />

      <main className="container mx-auto px-4 py-12 flex items-center justify-center" style={{ paddingTop: '160px', minHeight: 'calc(100vh - 120px)' }}>
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#ffd432] to-[#f6b201] px-8 py-10 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg mb-4">
                <img
                  src="https://i.ibb.co/8DXQZmGP/kryzer-1.png"
                  alt="Logo"
                  className="h-12 w-auto"
                />
              </div>
              <h1 className="text-3xl font-bold text-[#252525] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Bem-vindo de volta!
              </h1>
              <p className="text-[#252525]/80" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Acesse sua conta para continuar
              </p>
            </div>

            {/* Formulário */}
            <div className="px-8 py-10">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Email
                  </Label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 py-6"
                      placeholder="seu@email.com"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                  </div>
                </div>

                {/* Senha */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Senha
                    </Label>
                    <a
                      href="#"
                      className="text-sm font-medium text-[#ffd432] hover:text-[#f6b201] transition-colors"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 py-6"
                      placeholder="Digite sua senha"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    />
                  </div>
                </div>

                {/* Lembrar-me */}
                <div className="flex items-center">
                  <Checkbox
                    id="remember"
                    name="remember"
                    checked={formData.remember}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, remember: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="remember"
                    className="ml-2 text-sm text-gray-700 cursor-pointer"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    Manter-me conectado
                  </label>
                </div>

                {/* Botão Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#ffd432] to-[#f6b201] hover:from-[#f6b201] hover:to-[#e5a100] text-[#252525] font-semibold py-6 text-base transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>ou continue com</span>
                  </div>
                </div>

                {/* Google Login */}
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full py-6 font-semibold border-2 hover:bg-gray-50 transition-all"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  <Chrome className="mr-2 h-5 w-5" />
                  Entrar com Google
                </Button>
              </form>

              {/* Link para Registro */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Não tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="font-semibold text-[#ffd432] hover:text-[#f6b201] transition-colors"
                  >
                    Cadastre-se gratuitamente
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Ao entrar, você concorda com nossos{" "}
              <a href="#" className="text-[#ffd432] hover:text-[#f6b201] font-medium">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="#" className="text-[#ffd432] hover:text-[#f6b201] font-medium">
                Política de Privacidade
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
