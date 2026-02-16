import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "Posso ter problema com a LGPD ou risco jurídico ao usar o Stoky Full?",
    answer: `<strong>Não</strong>. O Stoky Full garante total conformidade com a LGPD. Operamos sob o <strong>Art. 7º, inciso IX (legítimo interesse)</strong> para construir um relacionamento direto e transparente com seus clientes pós-venda. Contamos com governança de dados robusta, <strong>opt-out automático</strong> (opção para o cliente não receber mais comunicações) e processos eficientes para atender a qualquer solicitação, com total respaldo jurídico e transparência.`
  },
  {
    question: "É possível recuperar dados retroativos de clientes?",
    answer: `<strong>Sim!</strong> Você pode recuperar dados retroativos de clientes. Para isso, basta ter os <strong>registros fiscais (notas/comprovantes de venda)</strong> dessas transações, com o <strong>mesmo CNPJ do seu cadastro Stoky Full</strong>. Assim, garantimos conformidade e vinculação de dados para que você acesse o histórico completo e fortaleça seus relacionamentos com quem já comprou seu produto.`
  },
  {
    question: "O Stoky Full é indicado para quem vende exclusivamente em marketplaces, sem e-commerce?",
    answer: `O Stoky Full visa construir relacionamentos diretos e duradouros, gerando recorrência e fidelização de clientes. Embora capture contatos de marketplaces, o <strong>retorno do investimento é otimizado com um canal de vendas próprio</strong> (como e-commerce ou loja física). Nesse ambiente, você desenvolve sua base de clientes independentemente e impulsiona vendas recorrentes. Para quem vende exclusivamente em marketplaces, o principal benefício é a posse do contato, mas o aproveitamento máximo em vendas diretas será limitado.`
  },
  {
    question: "O Stoky Full pode ser usado para produtos sem ou de baixa recorrência?",
    answer: `<strong>Sim!</strong> O Stoky Full é uma ferramenta poderosa para <strong>manter o cliente engajado</strong> e <strong>impulsionar o relacionamento a longo prazo</strong>.<br><br>Com os dados que o Stoky Full coleta, você pode <strong>criar e executar campanhas estratégicas focadas no retorno do cliente à sua marca</strong>, como <strong>promoções</strong> para datas <strong>sazonais</strong> (Natal, Black Friday) ou para aniversários. Além disso, torna-se possível explorar <strong>vendas cruzadas</strong> (cross-selling) de acessórios, serviços ou novos produtos complementares.<br><br>Dessa forma, <strong>você aumenta</strong> o valor de vida do cliente (<strong>LTV</strong>) e a recorrência geral dele com o seu negócio, mesmo que a recompra do produto inicial não seja frequente.`
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <>
      <style>{`
        /* ====== CONTAINER ====== */
        .faq-section {
          background: linear-gradient(135deg, #ffd432 0%, #f6b201 100%);
          padding: 60px 40px;
        }

        .faq-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ====== HEADER ====== */
        .faq-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .faq-subtitle {
          font-size: 16px;
          font-weight: 600;
          color: #252525;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 0 0 15px 0;
          background-color: #f4f4f4;
          padding: 8px 15px;
          border-radius: 60px;
          display: inline-block;
        }

        .faq-title {
          font-size: 70px;
          font-weight: 700;
          color: #252525;
          margin: 0 0 15px 0;
        }

        .faq-description {
          font-size: 24px;
          font-weight: 700;
          color: #252525;
          margin: 0;
        }

        /* ====== ACCORDION ====== */
        .faq-accordion {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .faq-item {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(37, 37, 37, 0.1);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .faq-item:hover {
          border-color: rgba(37, 37, 37, 0.2);
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .faq-item.open {
          border-color: rgba(37, 37, 37, 0.2);
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .faq-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 25px 30px;
          cursor: pointer;
          user-select: none;
          gap: 20px;
        }

        .faq-question-text {
          font-size: 18px;
          font-weight: 600;
          color: #252525;
          margin: 0;
          flex: 1;
        }

        .faq-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          color: #252525;
          transition: transform 0.3s ease;
        }

        .faq-item.open .faq-icon {
          transform: rotate(180deg);
        }

        .faq-answer-wrapper {
          max-height: 0;
          overflow: hidden;
          transition: max-height 2.5s ease-in-out;
        }

        .faq-item.open .faq-answer-wrapper {
          max-height: 1000px;
          transition: max-height 2.5s ease-in-out;
        }

        .faq-answer {
          padding: 0 30px 30px 30px;
          font-size: 16px;
          line-height: 1.8;
          color: #252525;
        }

        .faq-answer p {
          margin: 0 0 15px 0;
        }

        .faq-answer p:last-child {
          margin-bottom: 0;
        }

        .faq-answer strong {
          color: #252525;
          font-weight: 700;
        }

        /* ====== RESPONSIVE ====== */
        @media (max-width: 768px) {
          .faq-section {
            padding: 60px 20px;
          }

          .faq-title {
            font-size: 36px;
          }

          .faq-description {
            font-size: 18px;
          }

          .faq-question {
            padding: 20px;
          }

          .faq-question-text {
            font-size: 16px;
          }

          .faq-answer {
            padding: 0 20px 20px 20px;
            font-size: 15px;
          }
        }
      `}</style>

      <section className="faq-section">
        <div className="faq-container">
          {/* Header */}
          <div className="faq-header">
            <h4 className="faq-subtitle">Perguntas frequentes</h4>
            <h2 className="faq-title">Tire suas dúvidas</h2>
            <h3 className="faq-description">Tudo que você precisa saber sobre o Stoky Full</h3>
          </div>

          {/* Accordion */}
          <div className="faq-accordion">
            {faqData.map((item, index) => (
              <div
                key={index}
                className={`faq-item ${openIndex === index ? "open" : ""}`}
              >
                <div
                  className="faq-question"
                  onClick={() => toggleItem(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleItem(index);
                    }
                  }}
                >
                  <h3 className="faq-question-text">{item.question}</h3>
                  <ChevronDown className="faq-icon" />
                </div>
                <div className="faq-answer-wrapper">
                  <div
                    className="faq-answer"
                    dangerouslySetInnerHTML={{ __html: item.answer }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
