import { Facebook, Instagram, Linkedin, Youtube, Mail } from "lucide-react";

export default function Footer() {
  return (
    <>
      <style>
        {`
        /* ====== FOOTER TOP SECTION ====== */
        .footer-top {
          background: #1a1a1a;
          height: 232.90px;
          padding: 40px 40px;
          display: flex;
          align-items: center;
        }

        .footer-top-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          align-items: center;
        }

        .footer-logo-section {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .footer-logo-section img {
          width: 260px;
          height: auto;
        }

        .footer-contact-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .footer-email {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          text-decoration: none;
          font-size: 16px;
          transition: color 0.3s ease;
        }

        .footer-email:hover {
          color: #f9b90c;
        }

        .footer-email-icon {
          width: 20px;
          height: 20px;
          color: #f9b90c;
        }

        .footer-social-icons {
          display: flex;
          gap: 15px;
        }

        .footer-social-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .footer-social-icon:hover {
          background: #f9b90c;
          transform: translateY(-3px);
        }

        .footer-social-icon svg {
          width: 20px;
          height: 20px;
        }

        .footer-links-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .footer-links-section li {
          margin: 0;
        }

        .footer-links-section a {
          color: #ffffff;
          text-decoration: none;
          font-size: 16px;
          transition: color 0.3s ease;
        }

        .footer-links-section a:hover {
          color: #f9b90c;
        }

        /* ====== FOOTER BOTTOM SECTION ====== */
        .footer-bottom {
          background: #252525;
          height: 58.15px;
          display: flex;
          align-items: center;
        }

        .footer-bottom-container {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
          width: 100%;
          padding: 0 40px;
        }

        .footer-bottom-text {
          color: #ffffff;
          font-size: 14px;
          margin: 0;
        }

        /* ====== RESPONSIVE ====== */
        @media (max-width: 768px) {
          .footer-top-container {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .footer-logo-section img {
            margin: 0 auto;
          }

          .footer-social-icons {
            justify-content: center;
          }

          .footer-links-section ul {
            align-items: center;
          }
        }
        `}
      </style>

      {/* Footer Top Section */}
      <div className="footer-top">
        <div className="footer-top-container">
          {/* Logo Section */}
          <div className="footer-logo-section">
            <a href="/">
              <img 
                src="https://i.ibb.co/1GqM7TBs/kryzer-2.png" 
                alt="BeBee Logo" 
                loading="lazy"
              />
            </a>
          </div>

          {/* Contact & Social Section */}
          <div className="footer-contact-section">
            <a href="mailto:contato@kryzerdigital.com.br" className="footer-email">
              <Mail className="footer-email-icon" />
              <span>contato@kryzerdigital.com.br</span>
            </a>

            <div className="footer-social-icons">
              <div 
                className="footer-social-icon"
                aria-label="Facebook"
              >
                <Facebook />
              </div>
              <div 
                className="footer-social-icon"
                aria-label="Instagram"
              >
                <Instagram />
              </div>
              <div 
                className="footer-social-icon"
                aria-label="LinkedIn"
              >
                <Linkedin />
              </div>
              <div 
                className="footer-social-icon"
                aria-label="YouTube"
              >
                <Youtube />
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="footer-links-section">
            <ul>
              <li>
                <span style={{ color: '#ffffff', fontSize: '16px', cursor: 'default' }}>
                  Blog
                </span>
              </li>
              <li>
                <span style={{ color: '#ffffff', fontSize: '16px', cursor: 'default' }}>
                  Política de Privacidade
                </span>
              </li>
              <li>
                <span style={{ color: '#ffffff', fontSize: '16px', cursor: 'default' }}>
                  Política de Cookies
                </span>
              </li>
              <li>
                <span style={{ color: '#ffffff', fontSize: '16px', cursor: 'default' }}>
                  Termos de uso
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom Section */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <p className="footer-bottom-text">
            © 2025 Kryzer. Todos os direitos reservados
          </p>
        </div>
      </div>
    </>
  );
}
