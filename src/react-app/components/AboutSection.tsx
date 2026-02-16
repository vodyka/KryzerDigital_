import { useRef, useEffect, useState } from 'react';
import { Warehouse, PackageCheck, TrendingUp, MonitorCog, Zap, Target } from 'lucide-react';

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animate) {
            setAnimate(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [animate]);

  return (
    <section className="about-section" ref={sectionRef}>
      <div className={`about-container section-slide-up ${animate ? 'section-slide-up-active' : ''}`}>
        {/* Header */}
        <div className="about-header">
          <h2 className="about-title">
            Por que escolher<br />
            <strong>
              o <span className="about-highlight">Stoky Full?</span>
            </strong>
          </h2>
          <h3 className="about-subtitle">
            <strong>Com a Stoky Fulfillment, sua logística deixa de ser apenas operacional e passa a ser estratégica.</strong> Você ganha controle, dados e eficiência total para vender mais e escalar com segurança, enquanto a Stoky Fulfillment assume toda a operação logística: estoque, separação, embalagem e envio dos pedidos.
          </h3>
        </div>

        {/* Cards Grid */}
        <div className="about-grid">
          {/* Card 1 - Acesso Total aos Dados */}
          <div className="about-card">
            <div className="about-card-icon">
              <Warehouse size={35} className="about-icon-path" />
            </div>
            <div className="about-card-content">
              <h3 className="about-card-title">Estoque Profissional e Organizado</h3>
              <p className="about-card-description">Seu estoque armazenado de forma endereçada, controlada e segura, com organização pensada para alta rotatividade e zero improviso.</p>
            </div>
          </div>

          {/* Card 2 - Aumento da Recompra */}
          <div className="about-card">
            <div className="about-card-icon">
              <PackageCheck size={35} className="about-icon-path" />
            </div>
            <div className="about-card-content">
              <h3 className="about-card-title">Separação e Envio Sem Erros</h3>
              <p className="about-card-description">Processos de picking e packing padronizados, reduzindo falhas, retrabalho e atrasos na expedição dos pedidos.</p>
            </div>
          </div>

          {/* Card 3 - Relacionamento Duradouro */}
          <div className="about-card">
            <div className="about-card-icon">
              <Zap size={35} className="about-icon-path" />
            </div>
            <div className="about-card-content">
              <h3 className="about-card-title">Agilidade na Expedição</h3>
              <p className="about-card-description">Estrutura preparada para alto volume de pedidos, garantindo despachos rápidos e cumprimento de SLAs dos marketplaces.</p>
            </div>
          </div>

          {/* Card 4 - Entenda o Perfil do Cliente */}
          <div className="about-card">
            <div className="about-card-icon">
              <TrendingUp size={35} className="about-icon-path" />
            </div>
            <div className="about-card-content">
              <h3 className="about-card-title">Escala Sem Dor de Cabeça</h3>
              <p className="about-card-description">Venda mais sem precisar contratar equipe, ampliar espaço ou mudar processos.
A Stoky absorve o crescimento da sua operação.</p>
            </div>
          </div>

          {/* Card 5 - Conformidade LGPD */}
          <div className="about-card">
            <div className="about-card-icon">
              <MonitorCog size={35} className="about-icon-path" />
            </div>
            <div className="about-card-content">
              <h3 className="about-card-title">Tecnologia e Controle Operacional</h3>
              <p className="about-card-description">Gestão integrada de pedidos, estoque e movimentações, com visibilidade total da operação logística.</p>
            </div>
          </div>

          {/* Card 6 - Mais margem */}
          <div className="about-card">
            <div className="about-card-icon">
              <Target size={35} className="about-icon-path" />
            </div>
            <div className="about-card-content">
              <h3 className="about-card-title">Menos Operação, Mais Estratégia</h3>
              <p className="about-card-description">Enquanto a Stoky cuida da logística, você foca em vendas, anúncios, fornecedores e crescimento do negócio.</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* ====== BASE ====== */
        .about-section {
          background: #ffffff;
          padding: 80px 20px;
          position: relative;
        }

        .about-container {
          max-width: 1270px;
          margin: 0 auto;
          padding: 0 16px;
          font-family: Poppins, sans-serif;
        }

        /* ====== HEADER ====== */
        .about-header {
          margin-bottom: 60px;
          text-align: left;
        }

        .about-title {
          font-family: 'Poppins', sans-serif;
          font-size: 65px;
          font-weight: 400;
          line-height: 1.1em;
          margin: 0 0 30px;
          color: #000000;
        }

        .about-highlight {
          display: inline;
          padding: 4px 12px;
          font-weight: 700;
          color: #000000;
          position: relative;
          z-index: 1;
          vertical-align: baseline;
        }

        .about-highlight::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          background: #f9b90c;
          z-index: -1;
          transition: width 0.5s ease;
          border-radius: 8px;
        }

        .about-highlight:hover::before {
          width: 100%;
        }

        .about-subtitle {
          font-family: 'Poppins', sans-serif;
          font-size: 26px;
          font-weight: 400;
          line-height: 1.3em;
          color: #000000;
          max-width: 900px;
          margin: 0;
        }

        /* ====== GRID ====== */
        .about-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        /* ====== CARDS ====== */
        .about-card {
          background: #ffffff;
          border: 1.5px solid rgba(37, 37, 37, 0.26);
          border-radius: 20px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          transition: transform 0.4s ease, border 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
        }

        .about-card:hover {
          transform: scale(1.1);
          border-color: #ffd432;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .about-card-icon {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(185, 138, 45, 0.1);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .about-card-icon svg {
          width: 35px;
          height: 35px;
        }

        .about-icon-path {
          fill: #B38A2D;
        }

        .about-card-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .about-card-title {
          font-size: 20px;
          font-weight: 600;
          line-height: 1.4em;
          color: #000000;
          margin: 0;
        }

        .about-card-description {
          font-size: 16px;
          font-weight: 400;
          line-height: 1.6em;
          color: rgba(0, 0, 0, 0.7);
          margin: 0;
        }

        /* ====== RESPONSIVO ====== */
        @media (max-width: 1024px) {
          .about-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 767px) {
          .about-section {
            padding: 60px 20px;
          }

          .about-title {
            font-size: 32px;
          }

          .about-subtitle {
            font-size: 18px;
          }

          .about-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .about-card {
            padding: 25px;
          }
        }

        /* Slide up animation */
        .section-slide-up {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        }

        .section-slide-up-active {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
