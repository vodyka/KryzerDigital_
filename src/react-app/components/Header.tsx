import { Button } from "@/react-app/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export default function Header({ onLoginClick, onRegisterClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between" style={{ minHeight: '120px', paddingTop: '5px', paddingBottom: '5px' }}>
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="/">
              <img
                src="https://i.ibb.co/8DXQZmGP/kryzer-1.png"
                alt="Kryzer Digital"
                className="h-20 w-auto"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <a 
              href="/calculadora" 
              className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors relative group"
            >
              Calculadora
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#ffd432] group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              href="#pontos-coleta" 
              className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors relative group"
            >
              Pontos de Coleta
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#ffd432] group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              href="/planos" 
              className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors relative group"
            >
              Planos
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#ffd432] group-hover:w-full transition-all duration-300"></span>
            </a>
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Button 
              onClick={onLoginClick}
              variant="outline"
              className="border-[#252525] text-[#252525] hover:bg-[#252525] hover:text-white font-medium transition-all"
            >
              Login
            </Button>
            <Button 
              onClick={onRegisterClick}
              className="bg-[#ffd432] text-[#252525] hover:bg-[#f6b201] font-medium transition-all"
            >
              Registrar
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#252525]"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col gap-4">
              <a 
                href="/calculadora" 
                className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Calculadora
              </a>
              <a 
                href="#pontos-coleta" 
                className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pontos de Coleta
              </a>
              <a 
                href="/planos" 
                className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Planos
              </a>
              <div className="flex flex-col gap-2 px-4 pt-2">
                <Button 
                  onClick={() => {
                    onLoginClick?.();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="border-[#252525] text-[#252525] hover:bg-[#252525] hover:text-white font-medium transition-all w-full"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => {
                    onRegisterClick?.();
                    setMobileMenuOpen(false);
                  }}
                  className="bg-[#ffd432] text-[#252525] hover:bg-[#f6b201] font-medium transition-all w-full"
                >
                  Registrar
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
