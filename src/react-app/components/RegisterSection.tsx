import { useState, useEffect } from "react";
import { Button } from "@/react-app/components/ui/button";

export default function RegisterSection() {
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    cnpj: "",
    activity: "",
    revenue: "100000",
    acceptPolicy: false,
  });

  const phrases = [
    "enviar seus pedidos sem se preocupar com separação, embalagem ou despacho.",
    "centralizar seu estoque e deixar a operação rodando enquanto você foca em vender.",
    "começar no fulfillment com organização, controle e padrão profissional desde o primeiro pedido.",
  ];

  // Typing effect
  useEffect(() => {
    const currentFullText = phrases[currentPhrase];
    const typingSpeed = isDeleting ? 30 : 50;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayedText.length < currentFullText.length) {
          setDisplayedText(currentFullText.substring(0, displayedText.length + 1));
        } else {
          // Finished typing, wait then start deleting
          setTimeout(() => setIsDeleting(true), 2500);
        }
      } else {
        // Deleting
        if (displayedText.length > 0) {
          setDisplayedText(displayedText.substring(0, displayedText.length - 1));
        } else {
          // Finished deleting, move to next phrase
          setIsDeleting(false);
          setCurrentPhrase((prev) => (prev + 1) % phrases.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentPhrase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Botão não funcional ainda - futura implementação
    console.log("Formulário ainda não funcional", formData);
  };

  const formatRevenue = (value: string) => {
    return parseInt(value).toLocaleString("pt-BR");
  };

  const getSliderBackground = () => {
    const min = 1000;
    const max = 1000000;
    const value = parseInt(formData.revenue);
    const percentage = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, #f5af00 0%, #f5af00 ${percentage}%, #e0e0e0 ${percentage}%, #e0e0e0 100%)`;
  };

  return (
    <section id="comece" className="register-section">
      <div className="register-container">
        <div className="register-grid">
          {/* Left Side - Content */}
          <div className="register-content">
            {/* Typing Heading */}
            <div className="register-heading">
              <h2 className="register-title">
                Pronto para{" "}
                <span className="register-typing">
                  {displayedText}
                  <span className="register-cursor">|</span>
                </span>
              </h2>
            </div>

            <div className="register-bottom-content">
              {/* Subtitle */}
              <h3 className="register-subtitle">
                Experimente o Stoky Full agora e descubra todos os benefícios <strong>sem custo.</strong>
                <br />
                Cadastre-se aqui e receba seu acesso via e-mail
              </h3>

              {/* Benefits List */}
              <ul className="register-benefits">
              <li className="register-benefit-item">
                <span className="register-benefit-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <path d="M99.8,49.1c-1-4-7-3.9-7.5,1.2-.5,5.2-.5,8.6-2.3,13.7-10.3,29.6-48.4,38.1-70.4,15.7C-2.4,57.1,7.3,19,37.2,9.6c4.6-1.5,7.9-1.5,12.5-1.9,5.2-.5,5.2-6.7,1.1-7.5-2.3-.5-7.5.3-10,.8C18.5,5,1.3,24.5,0,47.1c-.1,1.9,0,3.9,0,5.9l1.1,7.6c4,19,19.3,34.3,38.3,38.4l7.6,1.1h5.9c22.2-1.3,41.4-17.9,46-39.6.6-2.7,1.5-8.8.9-11.3Z" />
                    <path d="M32.1,43c-1.8-2-4.4-4.6-7.1-2.2-2.5,2.2-.8,4.8.9,6.7,5.8,6.7,12.3,13,18.2,19.6,1.3,1,2.5,1.2,4,.5.8-.4,2.8-2.4,3.5-3.1,15.7-14.7,30.2-31,45.8-45.8,2-2.5,0-6.3-3.2-6.1-.6,0-1.4.3-1.9.7l-45.8,45.6-14.4-15.8Z" />
                  </svg>
                </span>
                <span className="register-benefit-text">Demonstração personalizada com seu cliente real</span>
              </li>
              <li className="register-benefit-item">
                <span className="register-benefit-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <path d="M99.8,49.1c-1-4-7-3.9-7.5,1.2-.5,5.2-.5,8.6-2.3,13.7-10.3,29.6-48.4,38.1-70.4,15.7C-2.4,57.1,7.3,19,37.2,9.6c4.6-1.5,7.9-1.5,12.5-1.9,5.2-.5,5.2-6.7,1.1-7.5-2.3-.5-7.5.3-10,.8C18.5,5,1.3,24.5,0,47.1c-.1,1.9,0,3.9,0,5.9l1.1,7.6c4,19,19.3,34.3,38.3,38.4l7.6,1.1h5.9c22.2-1.3,41.4-17.9,46-39.6.6-2.7,1.5-8.8.9-11.3Z" />
                    <path d="M32.1,43c-1.8-2-4.4-4.6-7.1-2.2-2.5,2.2-.8,4.8.9,6.7,5.8,6.7,12.3,13,18.2,19.6,1.3,1,2.5,1.2,4,.5.8-.4,2.8-2.4,3.5-3.1,15.7-14.7,30.2-31,45.8-45.8,2-2.5,0-6.3-3.2-6.1-.6,0-1.4.3-1.9.7l-45.8,45.6-14.4-15.8Z" />
                  </svg>
                </span>
                <span className="register-benefit-text">Sem necessidade de cartão ou pagamento</span>
              </li>
              <li className="register-benefit-item">
                <span className="register-benefit-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <path d="M99.8,49.1c-1-4-7-3.9-7.5,1.2-.5,5.2-.5,8.6-2.3,13.7-10.3,29.6-48.4,38.1-70.4,15.7C-2.4,57.1,7.3,19,37.2,9.6c4.6-1.5,7.9-1.5,12.5-1.9,5.2-.5,5.2-6.7,1.1-7.5-2.3-.5-7.5.3-10,.8C18.5,5,1.3,24.5,0,47.1c-.1,1.9,0,3.9,0,5.9l1.1,7.6c4,19,19.3,34.3,38.3,38.4l7.6,1.1h5.9c22.2-1.3,41.4-17.9,46-39.6.6-2.7,1.5-8.8.9-11.3Z" />
                    <path d="M32.1,43c-1.8-2-4.4-4.6-7.1-2.2-2.5,2.2-.8,4.8.9,6.7,5.8,6.7,12.3,13,18.2,19.6,1.3,1,2.5,1.2,4,.5.8-.4,2.8-2.4,3.5-3.1,15.7-14.7,30.2-31,45.8-45.8,2-2.5,0-6.3-3.2-6.1-.6,0-1.4.3-1.9.7l-45.8,45.6-14.4-15.8Z" />
                  </svg>
                </span>
                <span className="register-benefit-text">Acesso imediato</span>
              </li>
            </ul>

              {/* Pulsing Image */}
              <div className="register-badge-container">
                <img
                  src="https://sp-ao.shortpixel.ai/client/to_webp,q_lossless,ret_img,w_453,h_117/https://bebee.com.br/beeplace/wp-content/uploads/2025/06/tempo-limitada-14-1.png"
                  alt="Oferta por tempo limitado"
                  className="register-badge"
                />
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="register-form-container">
            <form onSubmit={handleSubmit} className="register-form">
              <div className="register-form-field">
                <label htmlFor="fullName" className="register-form-label">
                  Nome completo <span className="register-required">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Seu nome completo"
                  className="register-form-input"
                  required
                />
              </div>

              <div className="register-form-field">
                <label htmlFor="email" className="register-form-label">
                  E-mail <span className="register-required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="seu@email.com"
                  className="register-form-input"
                  required
                />
              </div>

              <div className="register-form-field">
                <label htmlFor="phone" className="register-form-label">
                  Telefone <span className="register-required">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(11) 98888-9999"
                  className="register-form-input"
                  required
                />
              </div>

              <div className="register-form-field">
                <label htmlFor="companyName" className="register-form-label">
                  Nome da empresa <span className="register-required">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Nome da sua empresa"
                  className="register-form-input"
                  required
                />
              </div>

              <div className="register-form-field">
                <label htmlFor="cnpj" className="register-form-label">
                  CNPJ <span className="register-required">*</span>
                </label>
                <input
                  type="text"
                  id="cnpj"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleInputChange}
                  placeholder="CNPJ da sua empresa"
                  className="register-form-input"
                  required
                />
              </div>

              <div className="register-form-field">
                <label htmlFor="activity" className="register-form-label">
                  Atividade da empresa <span className="register-required">*</span>
                </label>
                <select
                  id="activity"
                  name="activity"
                  value={formData.activity}
                  onChange={handleInputChange}
                  className="register-form-select"
                  required
                >
                  <option value="">Selecione a atividade...</option>
                  <option value="Saúde e Suplementação">Saúde e Suplementação</option>
                  <option value="Pet Shop">Pet Shop</option>
                  <option value="Beleza e Cosméticos">Beleza e Cosméticos</option>
                  <option value="Bebês e Infantil">Bebês e Infantil</option>
                  <option value="Alimentos e Bebidas">Alimentos e Bebidas</option>
                  <option value="Moda e Acessórios">Moda e Acessórios</option>
                  <option value="Óticas">Óticas</option>
                  <option value="Autopeças e Motocicletas">Autopeças e Motocicletas</option>
                  <option value="Eletrônicos e Informática">Eletrônicos e Informática</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="register-form-field">
                <label htmlFor="revenue" className="register-form-label">
                  Faturamento mensal
                </label>
                <input
                  type="range"
                  id="revenue"
                  name="revenue"
                  value={formData.revenue}
                  onChange={handleInputChange}
                  min="1000"
                  max="1000000"
                  step="1000"
                  className="register-form-range"
                  style={{ background: getSliderBackground() }}
                />
                <div className="register-range-value">
                  Valor selecionado: R$ <strong>{formatRevenue(formData.revenue)}</strong>,00
                </div>
              </div>

              <div className="register-form-field">
                <label className="register-checkbox-label">
                  <input
                    type="checkbox"
                    name="acceptPolicy"
                    checked={formData.acceptPolicy}
                    onChange={handleInputChange}
                    className="register-checkbox"
                    required
                  />
                  <span>
                    Declaro que li e concordo com a{" "}
                    <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">
                      Política de Privacidade
                    </a>{" "}
                    e autorizo o uso dos meus dados para fins de comunicação, contato comercial, personalização de
                    conteúdo e anúncios.
                  </span>
                </label>
              </div>

              <Button type="submit" className="register-submit-btn">
                Criar Conta
              </Button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        /* ====== BASE ====== */
        .register-section {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          padding: 80px 20px;
          position: relative;
        }

        .register-container {
          max-width: 1270px;
          margin: 0 auto;
          padding: 0 16px;
          font-family: 'Poppins', sans-serif;
        }

        .register-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: end;
        }

        /* ====== LEFT CONTENT ====== */
        .register-content {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 100%;
        }

        .register-heading {
          margin-bottom: 0;
          margin-top: 20px;
          min-height: 130px;
          display: flex;
          align-items: flex-start;
        }
        
        .register-bottom-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .register-title {
          font-size: 48px;
          font-weight: 700;
          line-height: 1.3;
          color: #ffffff;
          margin: 0;
        }

        .register-typing {
          display: inline-block;
          font-weight: 700;
          color: #ffffff;
          transition: color 0.3s ease;
          cursor: pointer;
        }

        .register-typing:hover {
          color: #f5af00;
        }

        .register-cursor {
          font-weight: 400;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        .register-subtitle {
          font-size: 20px;
          font-weight: 400;
          line-height: 1.6;
          color: #ffffff;
          margin: -15px 0 0 0;
        }

        .register-subtitle strong {
          font-weight: 700;
        }

        /* ====== BENEFITS LIST ====== */
        .register-benefits {
          list-style: none;
          padding: 0;
          margin: 20px 0 0 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .register-benefit-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .register-benefit-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .register-benefit-icon svg {
          width: 100%;
          height: 100%;
          fill: #f5af00;
        }

        .register-benefit-text {
          font-size: 16px;
          color: #ffffff;
          line-height: 1.5;
        }

        /* ====== PULSING BADGE ====== */
        .register-badge-container {
          margin-top: 20px;
        }

        .register-badge {
          max-width: 453px;
          height: auto;
          animation: pulse 4s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          5% { transform: scale(1.1); }
          10% { transform: scale(1); }
          15% { transform: scale(1.1); }
          20%, 100% { transform: scale(1); }
        }

        /* ====== FORM ====== */
        .register-form-container {
          background: #ffffff;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .register-form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .register-form-label {
          font-size: 14px;
          font-weight: 600;
          color: #252525;
        }

        .register-required {
          color: #e74c3c;
        }

        .register-form-input,
        .register-form-select {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid rgba(37, 37, 37, 0.2);
          border-radius: 8px;
          font-size: 16px;
          font-family: 'Poppins', sans-serif;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        .register-form-input:focus,
        .register-form-select:focus {
          outline: none;
          border-color: #f5af00;
          box-shadow: 0 0 0 3px rgba(245, 175, 0, 0.1);
        }

        .register-form-range {
          width: 100%;
          height: 8px;
          -webkit-appearance: none;
          appearance: none;
          border-radius: 4px;
          outline: none;
        }

        .register-form-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #f5af00;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .register-form-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #f5af00;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .register-range-value {
          font-size: 14px;
          color: #252525;
          margin-top: 8px;
        }

        .register-range-value strong {
          font-weight: 700;
          color: #f5af00;
        }

        .register-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 14px;
          color: #252525;
          cursor: pointer;
          line-height: 1.5;
        }

        .register-checkbox {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          cursor: pointer;
          margin-top: 2px;
        }

        .register-checkbox-label a {
          color: #f5af00;
          text-decoration: underline;
        }

        .register-submit-btn {
          background: #f5af00;
          color: #000000;
          font-size: 18px;
          font-weight: 700;
          padding: 16px 32px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.3s ease, transform 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .register-submit-btn:hover {
          background: #d99800;
          transform: translateY(-2px);
        }

        /* ====== RESPONSIVE ====== */
        @media (max-width: 1024px) {
          .register-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .register-title {
            font-size: 36px;
          }

          .register-form-container {
            padding: 30px;
          }
        }

        @media (max-width: 767px) {
          .register-section {
            padding: 60px 20px;
          }

          .register-title {
            font-size: 28px;
          }

          .register-subtitle {
            font-size: 18px;
          }

          .register-form-container {
            padding: 25px;
          }

          .register-badge {
            max-width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
