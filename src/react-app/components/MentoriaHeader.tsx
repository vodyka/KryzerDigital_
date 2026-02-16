import { Menu, X } from "lucide-react";
import { useState } from "react";

interface MentoriaHeaderProps {
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export default function MentoriaHeader({ onLoginClick, onRegisterClick }: MentoriaHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between" style={{ minHeight: '120px', paddingTop: '5px', paddingBottom: '5px' }}>
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="/mentoria">
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
              href="/mentoria" 
              className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors relative group"
            >
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#ffd432] group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              href="/calculadora-simples" 
              className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors relative group"
            >
              Calculadora
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#ffd432] group-hover:w-full transition-all duration-300"></span>
            </a>
            <a 
              href="/buscar-pontos-coleta" 
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
            <button
              onClick={onLoginClick}
              className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-white text-gray-700 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:scale-105 hover:shadow-md"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Login
            </button>
            <button
              onClick={onRegisterClick}
              className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-gray-900 text-white shadow-lg hover:bg-gray-700 hover:scale-105 hover:shadow-xl"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Cadastrar
            </button>
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
                href="/mentoria" 
                className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
              <a 
                href="/calculadora-simples" 
                className="text-[#252525] font-medium text-base hover:text-[#ffd432] transition-colors px-4 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Calculadora
              </a>
              <a 
                href="/buscar-pontos-coleta" 
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
                <button
                  onClick={() => {
                    onLoginClick?.();
                    setMobileMenuOpen(false);
                  }}
                  className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-white text-gray-700 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 hover:scale-105 hover:shadow-md w-full"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    onRegisterClick?.();
                    setMobileMenuOpen(false);
                  }}
                  className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 bg-gray-900 text-white shadow-lg hover:bg-gray-700 hover:scale-105 hover:shadow-xl w-full"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Cadastrar
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
