import { useRef, useEffect, useState } from 'react';

export default function ThreeStepsSection() {
  const lineRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Intersection Observer for scroll animation
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

  useEffect(() => {
    const line = lineRef.current;
    const wrap = wrapRef.current;
    if (!line || !wrap) return;

    const items = wrap.querySelectorAll('.margem20__item');
    if (items.length < 3) return;

    function setLine(percent: number) {
      if (!line) return;
      if (percent <= 0) {
        line.style.width = '0%';
        line.style.opacity = '0';
        line.style.visibility = 'hidden';
        return;
      }
      line.style.width = percent + '%';
      line.style.opacity = '1';
      line.style.visibility = 'visible';
    }

    items.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const step = el.getAttribute('data-step');
        if (step === '1') setLine(0);
        if (step === '2') setLine(33.33);
        if (step === '3') setLine(66.66);
      });
    });

    wrap.addEventListener('mouseleave', () => setLine(0));

    return () => {
      items.forEach((el) => {
        el.removeEventListener('mouseenter', () => {});
      });
      wrap.removeEventListener('mouseleave', () => {});
    };
  }, []);

  return (
    <section className="margem20" ref={sectionRef}>
      <div className="margem20__container">
        {/* Título desktop */}
        <h2 className={`margem20__title margem20__title--desktop step-fade-in ${animate ? 'step-fade-in-active' : ''}`}>
          Como aumentar <span><span className="margem20__highlight">20%</span></span>
          <span className="margem20__asterisk">*</span>
          <br />
          <span className="margem20__de-margem">de margem</span> em 3 passos
        </h2>

        {/* Título mobile */}
        <h2 className={`margem20__title margem20__title--mobile step-fade-in ${animate ? 'step-fade-in-active' : ''}`}>
          Como aumentar<br />
          <span className="margem20__highlight margem20__highlight--mobile">20%</span>
          <sup className="margem20__asterisk">*</sup><br />
          de margem<br />
          <span className="margem20__subline">em 3 passos</span>
        </h2>

        <p className={`margem20__note step-fade-in ${animate ? 'step-fade-in-active' : ''}`}>
          *O aumento da sua margem varia pelas comissões do marketplace que você atua. 20% é a
          média de recuperação, conforme pesquisa.
        </p>

        <div className="margem20__steps" id="margem20Steps" ref={wrapRef}>
          {/* Linha animada (desktop) */}
          <div className="margem20__line" id="margem20Line" ref={lineRef}></div>

          {/* Passo 1 */}
          <article className="margem20__item" data-step="1">
            <div className={`margem20__num step-number-pop ${animate ? 'step-number-pop-active' : ''}`}>1</div>

            <div className={`margem20__content step-content-rise ${animate ? 'step-content-rise-active' : ''}`} style={{ animationDelay: '0.2s' }}>
              <div className="margem20__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 45 45"
                  width="45"
                  height="45"
                  aria-hidden="true"
                >
                  <path
                    className="margem20__icon-path"
                    d="M20.7,34.3s0,0,0,0h0s0,0,0,0h0s0,0,0,0c0,0,0,0,0,0,.2.2.5.4.8.5.3.1.6.2,1,.2s.7,0,1-.2h0s0,0,0,0c.2-.1.5-.2.7-.4,0,0,0,0,0,0,0,0,0,0,0,0h0s0,0,0,0h0s0,0,0,0c0,0,0,0,0,0l10-10c1-1,1-2.6,0-3.5-1-1-2.6-1-3.5,0l-5.7,5.7V2.5C25,1.1,23.9,0,22.5,0s-2.5,1.1-2.5,2.5v24l-5.7-5.7c-1-1-2.6-1-3.5,0-1,1-1,2.6,0,3.5l10,10Z"
                  />
                  <path
                    className="margem20__icon-path"
                    d="M42.5,30c-1.4,0-2.5,1.1-2.5,2.5v2.5c0,1.3-.5,2.6-1.5,3.5-.9.9-2.2,1.5-3.5,1.5H10c-1.3,0-2.6-.5-3.5-1.5-.9-.9-1.5-2.2-1.5-3.5v-2.5c0-1.4-1.1-2.5-2.5-2.5s-2.5,1.1-2.5,2.5v2.5c0,2.7,1,5.2,2.9,7.1,1.9,1.9,4.4,2.9,7.1,2.9h25c2.7,0,5.2-1,7.1-2.9,1.9-1.9,2.9-4.4,2.9-7.1v-2.5c0-1.4-1.1-2.5-2.5-2.5Z"
                  />
                </svg>
              </div>

              <h3 className="margem20__h3">
                Importe sua
                <br />
                base
              </h3>
              <p className="margem20__p">
                Importe os dados de quem já comprou com você no marketplace
              </p>
            </div>
          </article>

          {/* Passo 2 */}
          <article className="margem20__item" data-step="2">
            <div className={`margem20__num step-number-pop ${animate ? 'step-number-pop-active' : ''}`} style={{ animationDelay: '0.1s' }}>2</div>

            <div className={`margem20__content step-content-rise ${animate ? 'step-content-rise-active' : ''}`} style={{ animationDelay: '0.4s' }}>
              <div className="margem20__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 56 56"
                  width="56"
                  height="56"
                  aria-hidden="true"
                >
                  <path
                    className="margem20__icon-path"
                    d="M45.3,8.7H10.4c-4.8,0-8.7,3.9-8.7,8.7v21c0,4.8,3.9,8.7,8.7,8.7h29.2l11.8,6.7c.5.3,1.2.3,1.7,0,.5-.3.9-.9.9-1.5V17.4c0-4.8-3.9-8.7-8.7-8.7ZM50.5,49.2l-9.6-5.5c-.3-.2-.6-.2-.9-.2H10.4c-2.9,0-5.2-2.3-5.2-5.2v-21c0-2.9,2.3-5.2,5.2-5.2h34.9c2.9,0,5.2,2.3,5.2,5.2v31.9Z"
                  />
                </svg>
              </div>

              <h3 className="margem20__h3">
                Conheça e segmente
                <br />
                sua base
              </h3>
              <p className="margem20__p">
                Organizamos os dados importados, permitindo você entender o perfil do seu cliente
                e criar grupos inteligentes para campanhas personalizadas.
              </p>
            </div>
          </article>

          {/* Passo 3 */}
          <article className="margem20__item" data-step="3">
            <div className={`margem20__num step-number-pop ${animate ? 'step-number-pop-active' : ''}`} style={{ animationDelay: '0.2s' }}>3</div>

            <div className={`margem20__content step-content-rise ${animate ? 'step-content-rise-active' : ''}`} style={{ animationDelay: '0.6s' }}>
              <div className="margem20__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 100 100"
                  width="45"
                  height="45"
                  aria-hidden="true"
                >
                  <path
                    className="margem20__icon-path"
                    d="M14.6,14.5C-15.8,45,4.3,97.6,47.1,100c1.9.1,3.9,0,5.9,0,1.2-.3,2.5-.3,3.8-.4,22.1-2.8,40-20.8,42.9-42.9.2-1.2.1-2.6.4-3.8v-5.9C97.6,4.4,45.1-15.8,14.6,14.5ZM88.1,71.6c-17.7,31.4-63.9,28.8-78.3-4.2C-2.2,40.1,16.9,8.3,46.6,6.3c34.9-2.3,58.8,34.6,41.5,65.3Z"
                  />
                  <path
                    className="margem20__icon-path"
                    d="M47,18.4c-22.3,1.8-35.5,26.6-25.1,46.4,10.5,19.9,38.3,22.7,52.5,5.3,17.9-21.9.6-53.9-27.5-51.7ZM72.6,61.9c-8.9,17-33,18.2-43.7,2.3-11.3-16.8.8-39.6,20.9-39.8,19.2-.2,31.8,20.4,22.8,37.4Z"
                  />
                  <path
                    className="margem20__icon-path"
                    d="M49.8,36.6c-17.5.3-17.1,27,.3,26.9,17.6-.1,17.4-27.2-.3-26.9Z"
                  />
                </svg>
              </div>

              <h3 className="margem20__h3">
                Impacte seu
                <br />
                cliente direto
              </h3>
              <p className="margem20__p">
                Reative o relacionamento com o cliente e{' '}
                <strong>venda novamente sem pagar taxa do marketplace</strong>
              </p>
            </div>
          </article>
        </div>
      </div>

      <style>{`
        /* ====== BASE ====== */
        .margem20 {
          background: #ffffff;
          padding: 70px 10px;
          position: relative;
        }
        .margem20__container {
          max-width: 1270px;
          margin: 0 auto;
          padding: 0 16px;
          font-family: Poppins, sans-serif;
          color: #252525;
        }

        .margem20__title {
          text-align: center;
          font-family: 'Poppins', sans-serif;
          font-size: 70px;
          font-weight: 400;
          line-height: 1.2em;
          margin: 0 0 10px;
          color: #252525;
        }
        .margem20__title--desktop {
          font-size: 70px;
        }
        .margem20__title--mobile {
          display: none;
          font-size: 28px;
        }

        .margem20__highlight {
          font-size: 1.8em;
          font-weight: 700;
          color: #ffd432;
        }
        .margem20__de-margem {
          color: #ffd432;
          font-weight: 700;
        }
        .margem20__highlight--mobile {
          font-size: 2.85em;
          line-height: 1em;
          display: inline-block;
        }
        .margem20__asterisk {
          font-size: 0.6em;
          vertical-align: super;
        }
        .margem20__subline {
          display: inline-block;
        }

        .margem20__note {
          text-align: center;
          font-family: 'Poppins', sans-serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 28px;
          color: #252525;
          max-width: 874px;
          margin: 0 auto 40px;
        }

        /* ====== STEPS ====== */
        .margem20__steps {
          position: relative;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
        }

        .margem20__item {
          flex: 1;
          position: relative;
          padding: 0 6px;
          text-align: center;
        }

        .margem20__content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .margem20__num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 70px;
          height: 70px;
          font-size: 48px;
          font-weight: 700;
          color: #ffffff;
          background: #000000;
          border-radius: 50%;
          position: relative;
          z-index: 1;
        }

        .margem20__icon {
          display: inline-block;
          margin: 20px 0 12px;
        }

        .margem20__icon-path {
          fill: #888888;
          transition: fill 0.25s ease;
        }

        .margem20__item:hover .margem20__icon-path {
          fill: #ffd432;
        }

        .margem20__h3 {
          font-size: 24px;
          font-weight: 600;
          line-height: 1.2em;
          margin: 0 0 12px;
          text-align: center;
        }
        .margem20__p {
          font-size: 16px;
          font-weight: 400;
          line-height: 1.5em;
          margin: 0;
          max-width: 360px;
          text-align: center;
        }

        /* Linha dourada animada (somente desktop) */
        .margem20__line {
          position: absolute;
          height: 3px;
          top: 35px;
          left: 16.66%;
          width: 0%;
          opacity: 0;
          visibility: hidden;
          transform-origin: left center;
          background: linear-gradient(90deg, #ffd432 0%, #f6b201 100%);
          transition: width 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
          pointer-events: none;
          z-index: 0;
        }

        /* ====== RESPONSIVO ====== */
        @media (max-width: 767px) {
          .margem20__title--desktop {
            display: none;
          }
          .margem20__title--mobile {
            display: block;
          }

          .margem20__steps {
            flex-direction: column;
            gap: 26px;
          }

          .margem20__line {
            display: none;
          }
        }

        /* Step animations */
        .step-fade-in {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .step-fade-in-active {
          opacity: 1;
          transform: translateY(0);
        }

        .step-number-pop {
          opacity: 0;
          transform: scale(0);
          animation: none;
        }

        .step-number-pop-active {
          animation: numberPop 0.5s ease-out forwards;
        }

        @keyframes numberPop {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .step-content-rise {
          opacity: 0;
          transform: translateY(100px);
          animation: none;
        }

        .step-content-rise-active {
          animation: contentRise 0.8s ease-out forwards;
        }

        @keyframes contentRise {
          0% {
            opacity: 0;
            transform: translateY(100px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
