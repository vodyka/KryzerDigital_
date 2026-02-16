import { useRef, useEffect, useState } from 'react';

export default function RevolutionSection() {
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
    <section className="revolution" ref={sectionRef}>
      <div className={`revolution__container section-slide-up ${animate ? 'section-slide-up-active' : ''}`}>
        {/* Título principal */}
        <div className="revolution__header">
          <h2 className="revolution__title revolution__title--desktop">
            <strong>
              <span className="revolution__title-highlight">Agência e Assessoria</span> para
            </strong>
            <br />
            os vendedores de marketplace
          </h2>

          <h2 className="revolution__title revolution__title--mobile">
            <strong>
              <span className="revolution__title-highlight">Agência e</span>
              <br />
              <span className="revolution__title-highlight">Assessoria para</span>
            </strong>
            <br />
            os vendedores de marketplace
          </h2>

          <h3 className="revolution__subtitle">
            A Kryzer Digital não é só uma agência, é uma <strong>assessoria estratégica para quem quer escalar no marketplace</strong>, com anúncios inteligentes, análise de dados e decisões baseadas em resultado{' '}
            <strong>— não achismo.</strong>
          </h3>
        </div>

        {/* Comparação */}
        <div className="revolution__comparison">
          {/* Coluna 1: Como funciona hoje */}
          <div className="revolution__column revolution__column--left">
            <h3 className="revolution__column-title revolution__column-title--white">
              Sem a Kryzer Digital
            </h3>

            <ul className="revolution__list">
              <li className="revolution__item revolution__item--red">
                <span className="revolution__icon revolution__icon--red">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31 30">
                    <path
                      className="revolution__icon-path"
                      d="M15.5,0C7.2,0,.5,6.7,.5,15s6.7,15,15,15,15-6.7,15-15S23.8,0,15.5,0ZM15.5,27.9c-7.1,0-12.9-5.8-12.9-12.9S8.4,2.1,15.5,2.1s12.9,5.8,12.9,12.9-5.8,12.9-12.9,12.9Z"
                    />
                    <path
                      className="revolution__icon-path"
                      d="M17,15l4.6-4.6c.4-.4.4-1.1,0-1.5-.4-.4-1.1-.4-1.5,0l-4.6,4.6-4.6-4.6c-.4-.4-1.1-.4-1.5,0-.4.4-.4,1.1,0,1.5l4.6,4.6-4.6,4.6c-.4.4-.4,1.1,0,1.5.2.2.5.3.8.3s.5-.1.8-.3l4.6-4.6,4.6,4.6c.2.2.5.3.8.3s.5-.1.8-.3c.4-.4.4-1.1,0-1.5l-4.6-4.6Z"
                    />
                  </svg>
                </span>
                <span className="revolution__text">Você cria anúncios e fotos sem estratégia clara!</span>
              </li>

              <li className="revolution__item revolution__item--red">
                <span className="revolution__icon revolution__icon--red">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31 30">
                    <path
                      className="revolution__icon-path"
                      d="M15.5,0C7.2,0,.5,6.7,.5,15s6.7,15,15,15,15-6.7,15-15S23.8,0,15.5,0ZM15.5,27.9c-7.1,0-12.9-5.8-12.9-12.9S8.4,2.1,15.5,2.1s12.9,5.8,12.9,12.9-5.8,12.9-12.9,12.9Z"
                    />
                    <path
                      className="revolution__icon-path"
                      d="M17,15l4.6-4.6c.4-.4.4-1.1,0-1.5-.4-.4-1.1-.4-1.5,0l-4.6,4.6-4.6-4.6c-.4-.4-1.1-.4-1.5,0-.4.4-.4,1.1,0,1.5l4.6,4.6-4.6,4.6c-.4.4-.4,1.1,0,1.5.2.2.5.3.8.3s.5-.1.8-.3l4.6-4.6,4.6,4.6c.2.2.5.3.8.3s.5-.1.8-.3c.4-.4.4-1.1,0-1.5l-4.6-4.6Z"
                    />
                  </svg>
                </span>
                <span className="revolution__text">Você tenta gerenciar marketing e Ads no improviso</span>
              </li>

              <li className="revolution__item revolution__item--red">
                <span className="revolution__icon revolution__icon--red">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 31 30">
                    <path
                      className="revolution__icon-path"
                      d="M15.5,0C7.2,0,.5,6.7,.5,15s6.7,15,15,15,15-6.7,15-15S23.8,0,15.5,0ZM15.5,27.9c-7.1,0-12.9-5.8-12.9-12.9S8.4,2.1,15.5,2.1s12.9,5.8,12.9,12.9-5.8,12.9-12.9,12.9Z"
                    />
                    <path
                      className="revolution__icon-path"
                      d="M17,15l4.6-4.6c.4-.4.4-1.1,0-1.5-.4-.4-1.1-.4-1.5,0l-4.6,4.6-4.6-4.6c-.4-.4-1.1-.4-1.5,0-.4.4-.4,1.1,0,1.5l4.6,4.6-4.6,4.6c-.4.4-.4,1.1,0,1.5.2.2.5.3.8.3s.5-.1.8-.3l4.6-4.6,4.6,4.6c.2.2.5.3.8.3s.5-.1.8-.3c.4-.4.4-1.1,0-1.5l-4.6-4.6Z"
                    />
                  </svg>
                </span>
                <span className="revolution__text">Falta análise de concorrência, métricas e plano de crescimento</span>
              </li>
            </ul>
          </div>

          {/* Coluna 2: Com o BeePlace */}
          <div className="revolution__column revolution__column--right">
            <h3 className="revolution__column-title revolution__column-title--black">
              Como funciona com a Kryzer Digital
            </h3>

            <ul className="revolution__list">
              <li className="revolution__item revolution__item--green">
                <span className="revolution__icon revolution__icon--green">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <path
                      className="revolution__icon-path"
                      d="M99.8,49.1c-1-4-7-3.9-7.5,1.2-.5,5.2-.5,8.6-2.3,13.7-10.3,29.6-48.4,38.1-70.4,15.7C-2.4,57.1,7.3,19,37.2,9.6c4.6-1.5,7.9-1.5,12.5-1.9,5.2-.5,5.2-6.7,1.1-7.5-2.3-.5-7.5.3-10,.8C18.5,5,1.3,24.5,0,47.1c-.1,1.9,0,3.9,0,5.9l1.1,7.6c4,19,19.3,34.3,38.3,38.4l7.6,1.1h5.9c22.2-1.3,41.4-17.9,46-39.6.6-2.7,1.5-8.8.9-11.3Z"
                    />
                    <path
                      className="revolution__icon-path"
                      d="M32.1,43c-1.8-2-4.4-4.6-7.1-2.2-2.5,2.2-.8,4.8.9,6.7,5.8,6.7,12.3,13,18.2,19.6,1.3,1,2.5,1.2,4,.5.8-.4,2.8-2.4,3.5-3.1,15.7-14.7,30.2-31,45.8-45.8,2-2.5,0-6.3-3.2-6.1-.6,0-1.4.3-1.9.7l-45.8,45.6-14.4-15.8Z"
                    />
                  </svg>
                </span>
                <span className="revolution__text">Criamos fotos, anúncios e estrutura profissional de venda</span>
              </li>

              <li className="revolution__item revolution__item--green">
                <span className="revolution__icon revolution__icon--green">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <path
                      className="revolution__icon-path"
                      d="M99.8,49.1c-1-4-7-3.9-7.5,1.2-.5,5.2-.5,8.6-2.3,13.7-10.3,29.6-48.4,38.1-70.4,15.7C-2.4,57.1,7.3,19,37.2,9.6c4.6-1.5,7.9-1.5,12.5-1.9,5.2-.5,5.2-6.7,1.1-7.5-2.3-.5-7.5.3-10,.8C18.5,5,1.3,24.5,0,47.1c-.1,1.9,0,3.9,0,5.9l1.1,7.6c4,19,19.3,34.3,38.3,38.4l7.6,1.1h5.9c22.2-1.3,41.4-17.9,46-39.6.6-2.7,1.5-8.8.9-11.3Z"
                    />
                    <path
                      className="revolution__icon-path"
                      d="M32.1,43c-1.8-2-4.4-4.6-7.1-2.2-2.5,2.2-.8,4.8.9,6.7,5.8,6.7,12.3,13,18.2,19.6,1.3,1,2.5,1.2,4,.5.8-.4,2.8-2.4,3.5-3.1,15.7-14.7,30.2-31,45.8-45.8,2-2.5,0-6.3-3.2-6.1-.6,0-1.4.3-1.9.7l-45.8,45.6-14.4-15.8Z"
                    />
                  </svg>
                </span>
                <span className="revolution__text">Desenvolvemos estratégia, campanhas e Ads baseados em números reais</span>
              </li>

              <li className="revolution__item revolution__item--green">
                <span className="revolution__icon revolution__icon--green">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <path
                      className="revolution__icon-path"
                      d="M99.8,49.1c-1-4-7-3.9-7.5,1.2-.5,5.2-.5,8.6-2.3,13.7-10.3,29.6-48.4,38.1-70.4,15.7C-2.4,57.1,7.3,19,37.2,9.6c4.6-1.5,7.9-1.5,12.5-1.9,5.2-.5,5.2-6.7,1.1-7.5-2.3-.5-7.5.3-10,.8C18.5,5,1.3,24.5,0,47.1c-.1,1.9,0,3.9,0,5.9l1.1,7.6c4,19,19.3,34.3,38.3,38.4l7.6,1.1h5.9c22.2-1.3,41.4-17.9,46-39.6.6-2.7,1.5-8.8.9-11.3Z"
                    />
                    <path
                      className="revolution__icon-path"
                      d="M32.1,43c-1.8-2-4.4-4.6-7.1-2.2-2.5,2.2-.8,4.8.9,6.7,5.8,6.7,12.3,13,18.2,19.6,1.3,1,2.5,1.2,4,.5.8-.4,2.8-2.4,3.5-3.1,15.7-14.7,30.2-31,45.8-45.8,2-2.5,0-6.3-3.2-6.1-.6,0-1.4.3-1.9.7l-45.8,45.6-14.4-15.8Z"
                    />
                  </svg>
                </span>
                <span className="revolution__text">Analisamos concorrência, mercado e oportunidades para crescimento contínuo</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        /* ====== BASE ====== */
        .revolution {
          background-image: linear-gradient(-90deg, rgb(255, 212, 50) 0%, rgb(246, 178, 1) 100%);
          padding: 30px 20px;
          min-height: 685.36px;
          position: relative;
        }

        .revolution__container {
          max-width: 1269.98px;
          margin: 0 auto;
          padding: 0 16px;
          font-family: Poppins, sans-serif;
        }

        /* ====== HEADER ====== */
        .revolution__header {
          margin-bottom: 60px;
          max-width: 1269.98px;
          margin-left: auto;
          margin-right: auto;
        }

        .revolution__title {
          text-align: left;
          font-family: 'Poppins', sans-serif;
          font-size: 65px;
          font-weight: 400;
          line-height: 1.1em;
          margin: 0 0 30px;
          color: rgb(37, 37, 37);
        }

        .revolution__title--desktop {
          display: block;
        }

        .revolution__title--mobile {
          display: none;
        }

        .revolution__title-highlight {
          display: inline;
          padding: 4px 12px;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
          z-index: 1;
          vertical-align: baseline;
        }

        .revolution__title-highlight::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0%;
          height: 100%;
          background: #ffffff;
          transition: width 0.5s ease;
          z-index: -1;
          border-radius: 8px;
        }

        .revolution__title-highlight:hover::before {
          width: 100%;
        }

        .revolution__title-highlight:hover {
          color: #ffd432;
          transition: color 0.3s ease 0.2s;
        }

        .revolution__subtitle {
          text-align: left;
          font-family: 'Poppins', sans-serif;
          font-size: 26px;
          font-weight: 400;
          line-height: 1.3em;
          color: rgb(255, 255, 255);
          max-width: 900px;
          margin: 0;
        }

        /* ====== COMPARISON ====== */
        .revolution__comparison {
          display: grid;
          grid-template-columns: 634.99px 596.88px;
          gap: 40px;
          align-items: start;
          justify-content: center;
          max-width: 1269.98px;
          margin: 0 auto;
        }

        .revolution__column {
          padding: 0;
        }

        .revolution__column--left {
          width: 634.99px;
          min-height: 254.84px;
        }

        .revolution__column--right {
          width: 596.88px;
          min-height: 254.84px;
        }

        .revolution__column-title {
          font-family: 'Poppins', sans-serif;
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 30px;
          text-align: left;
        }

        .revolution__column-title--white {
          color: #ffffff;
        }

        .revolution__column-title--black {
          color: #000000;
        }

        /* ====== LIST ====== */
        .revolution__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .revolution__item {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          padding: 10px 16px;
          border-radius: 8px;
          transition: all 0.3s ease;
          cursor: pointer;
          width: fit-content;
          min-height: 48.96px;
        }

        .revolution__item--red {
          color: #ffffff;
        }

        .revolution__item--red:hover {
          background: #ffffff;
          color: rgb(242, 90, 90);
          min-height: 53.86px;
          padding: 12px 18px;
        }

        .revolution__item--green {
          color: #000000;
        }

        .revolution__item--green:hover {
          background: #ffffff;
          color: rgb(107, 181, 119);
          min-height: 53.86px;
          padding: 12px 18px;
        }

        .revolution__icon {
          flex-shrink: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .revolution__icon svg {
          width: 100%;
          height: 100%;
        }

        .revolution__icon--red .revolution__icon-path {
          fill: #ffffff;
          transition: fill 0.3s ease;
        }

        .revolution__item--red:hover .revolution__icon--red .revolution__icon-path {
          fill: rgb(242, 90, 90);
        }

        .revolution__icon--green .revolution__icon-path {
          fill: #000000;
          transition: fill 0.3s ease;
        }

        .revolution__item--green:hover .revolution__icon--green .revolution__icon-path {
          fill: rgb(107, 181, 119);
        }

        .revolution__text {
          font-family: 'Poppins', sans-serif;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.5em;
        }

        /* ====== RESPONSIVO ====== */
        @media (max-width: 767px) {
          .revolution {
            padding: 60px 20px;
          }

          .revolution__title--desktop {
            display: none;
          }

          .revolution__title--mobile {
            display: block;
            font-size: 32px;
          }

          .revolution__subtitle {
            font-size: 18px;
          }

          .revolution__comparison {
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .revolution__column {
            padding: 30px 20px;
          }

          .revolution__column-title {
            font-size: 24px;
          }

          .revolution__text {
            font-size: 16px;
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
