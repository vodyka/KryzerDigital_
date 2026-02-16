import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

export default function MentoriaHeroSection() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLIFrameElement>(null);
  const [animateTitle, setAnimateTitle] = useState(false);
  const [animateSubtitle, setAnimateSubtitle] = useState(false);
  const [animateWhatsApp, setAnimateWhatsApp] = useState(false);
  const [animatePlans, setAnimatePlans] = useState(false);

  useEffect(() => {
    // Auto-play the video when component mounts
    if (videoRef.current) {
      const iframe = videoRef.current;
      iframe.contentWindow?.postMessage(
        '{"event":"command","func":"playVideo","args":""}',
        '*'
      );
    }

    // Trigger animations on mount
    const titleTimer = setTimeout(() => setAnimateTitle(true), 100);
    const subtitleTimer = setTimeout(() => setAnimateSubtitle(true), 400);
    const whatsappTimer = setTimeout(() => setAnimateWhatsApp(true), 700);
    const plansTimer = setTimeout(() => setAnimatePlans(true), 1000);

    return () => {
      clearTimeout(titleTimer);
      clearTimeout(subtitleTimer);
      clearTimeout(whatsappTimer);
      clearTimeout(plansTimer);
    };
  }, []);

  return (
    <section 
      id="inicio" 
      className="relative flex items-center justify-center pt-[70px]"
      style={{ minHeight: '85vh' }}
    >
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          ref={videoRef}
          className="absolute top-1/2 left-1/2 w-[177.77777778vh] h-[56.25vw] min-w-full min-h-full"
          style={{
            transform: 'translate(-50%, -50%)',
          }}
          src="https://www.youtube.com/embed/wBoxqiZs2YE?controls=0&rel=0&playsinline=1&cc_load_policy=0&enablejsapi=1&autoplay=1&mute=1&loop=1&playlist=wBoxqiZs2YE"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          aria-hidden="true"
        />
      </div>

      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-white"
        style={{ opacity: 0.58 }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 lg:px-8 py-[50px] relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge with Icon */}
          <div 
            className={`inline-flex items-center justify-center gap-2 mb-6 hero-slide-up ${animateTitle ? 'hero-slide-up-active' : ''}`}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              padding: '8px 20px',
              borderStyle: 'solid',
              borderWidth: '1px',
              borderColor: '#ffd432',
              borderRadius: '60px',
              transition: 'transform 0.3s'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="32" viewBox="0 0 25 32" fill="none">
              <path d="M2.95017 21.9951L0.491479 26.3281C0.432368 26.4317 0.438806 26.5538 0.507281 26.6509C0.575757 26.7479 0.687542 26.7926 0.802839 26.7688L4.37177 26.0358C4.51691 26.006 4.65972 26.0893 4.70712 26.2328L5.8677 29.7442C5.90515 29.8579 5.9988 29.9335 6.11585 29.9455C6.2329 29.9574 6.33942 29.902 6.39853 29.7978L9.08781 25.0586C6.73681 24.6692 4.61875 23.5748 2.95017 21.9951Z" fill="#6BB577"/>
              <path d="M16.4121 7.68356C15.0268 6.27414 13.1129 5.4024 10.999 5.4024C8.88501 5.4024 6.9712 6.27414 5.58589 7.68356C4.20057 9.09298 3.34375 11.0401 3.34375 13.1908C3.34375 15.3416 4.20057 17.2887 5.58589 18.6981C6.9712 20.1075 8.88501 20.9793 10.999 20.9793C13.1129 20.9793 15.0268 20.1075 16.4121 18.6981C17.7974 17.2887 18.6542 15.3416 18.6542 13.1908C18.6542 11.0401 17.7974 9.09298 16.4121 7.68356ZM12.1824 17.0851C12.1824 17.5233 11.833 17.8788 11.4022 17.8788C10.9715 17.8788 10.6221 17.5233 10.6221 17.0851V10.575H9.86767C9.43691 10.575 9.08751 10.2196 9.08751 9.78132C9.08751 9.34307 9.43691 8.98759 9.86767 8.98759H11.4022C11.833 8.98759 12.1824 9.34307 12.1824 9.78132V17.0857V17.0851Z" fill="#6BB577"/>
              <path d="M19.0478 21.9951C17.3792 23.5748 15.2612 24.6692 12.9102 25.0586L15.72 30.0104C15.7791 30.114 15.8856 30.1699 16.0027 30.158C16.1197 30.1461 16.2134 30.0699 16.2508 29.9568L17.4114 26.4454C17.4588 26.3025 17.601 26.2186 17.7468 26.2483L21.3157 26.9813C21.431 27.0051 21.5428 26.9605 21.6112 26.8634C21.6797 26.7664 21.6862 26.6443 21.627 26.5407L19.0478 21.9951Z" fill="#6BB577"/>
              <path d="M21.9994 13.1914C21.9994 7.01068 17.0744 2 11 2C4.92557 2 0 7.01068 0 13.1914C0 19.3721 4.92498 24.3828 11 24.3828C17.075 24.3828 22 19.3721 22 13.1914H21.9994ZM11 21.8135C8.65954 21.8135 6.54089 20.8483 5.0075 19.2882C3.47412 17.7281 2.52541 15.572 2.52541 13.1914C2.52541 10.8108 3.47412 8.65471 5.0075 7.09464C6.54089 5.53457 8.66012 4.56935 11 4.56935C13.3405 4.56935 15.4591 5.53457 16.9925 7.09464C18.5259 8.6553 19.4746 10.8108 19.4746 13.1914C19.4746 15.572 18.5259 17.7281 16.9925 19.2882C15.4591 20.8483 13.3399 21.8135 11 21.8135Z" fill="#6BB577"/>
            </svg>
            <span 
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: '38px',
                fontWeight: 600,
                color: '#ffd432'
              }}
            >
              Mentoria Especializada para Marketplace
            </span>
          </div>

          {/* Main Heading - Desktop */}
          <h1 
            className={`mb-4 leading-[1.2em] hidden md:block hero-slide-up ${animateTitle ? 'hero-slide-up-active' : ''}`}
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontSize: '72px',
              fontWeight: 400,
              marginTop: '30px',
              marginBottom: '20px'
            }}
          >
            <span style={{ 
              fontWeight: 700,
              color: '#ffd432'
            }}>
              Saia do improviso
            </span>
            <br />
            <span style={{ color: '#000' }}>e estruture sua operação</span>
          </h1>

          {/* Mobile Heading */}
          <h1 
            className={`mb-4 leading-[1.2em] md:hidden hero-slide-up ${animateTitle ? 'hero-slide-up-active' : ''}`}
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontSize: '2.1rem',
              fontWeight: 400,
              marginTop: '30px',
              marginBottom: '20px'
            }}
          >
            <span style={{ 
              fontWeight: 700,
              color: '#ffd432'
            }}>
              Saia do improviso
            </span>
            <br />
            <span style={{ color: '#000' }}>e estruture sua operação</span>
          </h1>

          {/* Subtitle - Desktop */}
          <h2 
            className={`mb-8 hidden md:block hero-slide-up ${animateSubtitle ? 'hero-slide-up-active' : ''}`}
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontSize: '24px',
              fontWeight: 400,
              lineHeight: '1.3em',
              color: '#252525'
            }}
          >
            Entenda números, concorrência e performance com{' '}
            <span style={{ fontWeight: 700 }}>assessoria estratégica baseada em dados</span>,{' '}
            criando uma operação estruturada para crescer com segurança.
          </h2>

          {/* Mobile Subtitle */}
          <h2 
            className={`mb-8 md:hidden hero-slide-up ${animateSubtitle ? 'hero-slide-up-active' : ''}`}
            style={{ 
              fontFamily: 'Poppins, sans-serif',
              fontSize: '18px',
              fontWeight: 400,
              lineHeight: '1.3em',
              color: '#252525'
            }}
          >
            Entenda números, concorrência e performance com{' '}
            <span style={{ fontWeight: 700 }}>assessoria estratégica baseada em dados</span>
          </h2>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ marginTop: '30px' }}>
            <a 
              href="https://wa.me/5562998868638"
              target="_blank"
              rel="noopener noreferrer"
              className={`hero-whatsapp-button inline-block text-center hero-slide-up ${animateWhatsApp ? 'hero-slide-up-active' : ''}`}
              style={{
                backgroundColor: '#6BB577',
                color: '#fff',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '20px',
                fontWeight: 500,
                borderRadius: '150px',
                padding: '20px 30px',
                border: '1px solid #6BB577',
                textDecoration: 'none',
                transition: 'all 0.3s',
                lineHeight: 1
              }}
            >
              <span className="inline-block">
                Falar com Especialista
              </span>
            </a>
            
            <button 
              onClick={() => navigate("/planos")}
              className={`hero-plans-button hero-slide-up ${animatePlans ? 'hero-slide-up-active' : ''}`}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.45)',
                color: '#4169E1',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '20px',
                fontWeight: 500,
                borderRadius: '150px',
                padding: '20px 30px',
                border: '1px solid #4169E1',
                cursor: 'pointer',
                transition: 'all 0.3s',
                lineHeight: 1
              }}
            >
              <span className="inline-block">
                Ver Planos
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .hero-whatsapp-button:hover,
        .hero-whatsapp-button:focus {
          background-color: #fff !important;
          color: #6BB577 !important;
        }

        .hero-plans-button:hover,
        .hero-plans-button:focus {
          background-color: #4169E1 !important;
          color: #fff !important;
        }

        /* Slide up animation */
        .hero-slide-up {
          opacity: 0;
          transform: translateY(50px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }

        .hero-slide-up-active {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  );
}
