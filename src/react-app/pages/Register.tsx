import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import MentoriaHeader from "@/react-app/components/MentoriaHeader";
import Footer from "@/react-app/components/Footer";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
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

    // Validar senhas
    if (formData.password !== formData.password_confirmation) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao criar conta");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError("Erro ao conectar com o servidor");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

      <main className="container mx-auto px-4 py-12" style={{ paddingTop: '160px' }}>
        <div className="max-w-md mx-auto">
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
                Criar sua conta
              </h1>
              <p className="text-[#252525]/80" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Comece grátis e transforme suas vendas
              </p>
            </div>

            {/* Mensagens */}
            <div className="px-8 py-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700" style={{ fontFamily: 'Poppins, sans-serif' }}>{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Conta criada com sucesso! Você ganhou 30 dias grátis no plano Starter. Redirecionando para o login...
                  </p>
                </div>
              )}

              {/* Formulário */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Nome */}
                <div>
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Nome completo
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Seu nome completo"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="seu@email.com"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>

                {/* Telefone */}
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="(00) 00000-0000"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>

                {/* Empresa */}
                <div>
                  <Label htmlFor="company" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Empresa
                  </Label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Nome da sua empresa"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>

                {/* Senha */}
                <div>
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Senha
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Mínimo 8 caracteres"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>

                {/* Confirmar Senha */}
                <div>
                  <Label htmlFor="password_confirmation" className="text-sm font-semibold text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Confirmar senha
                  </Label>
                  <Input
                    id="password_confirmation"
                    name="password_confirmation"
                    type="password"
                    required
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    className="mt-1"
                    placeholder="Repita sua senha"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>

                {/* Termos */}
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      required
                      className="h-4 w-4 rounded border-gray-300 text-[#ffd432] focus:ring-[#ffd432]"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      Concordo com os{" "}
                      <a href="#" className="font-medium text-[#ffd432] hover:text-[#f6b201]">
                        Termos de Uso
                      </a>{" "}
                      e{" "}
                      <a href="#" className="font-medium text-[#ffd432] hover:text-[#f6b201]">
                        Política de Privacidade
                      </a>
                    </label>
                  </div>
                </div>

                {/* Botão Submit */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading || success}
                    className="w-full bg-gradient-to-r from-[#ffd432] to-[#f6b201] hover:from-[#f6b201] hover:to-[#e5a100] text-[#252525] font-semibold py-6 text-base transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    {loading ? "Criando conta..." : success ? "Conta criada!" : "Criar minha conta grátis"}
                  </Button>
                </div>

                {/* Link para Login */}
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Já tem uma conta?{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="font-semibold text-[#ffd432] hover:text-[#f6b201] transition-colors"
                    >
                      Faça login
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
