const logos = [
  {
    src: 'https://sp-ao.shortpixel.ai/client/to_webp,q_lossless,ret_img/https://bebee.com.br/beeplace/wp-content/uploads/2025/06/pernambucanas2.png',
    alt: 'Pernambucanas'
  },
  {
    src: 'https://sp-ao.shortpixel.ai/client/to_webp,q_lossless,ret_img/https://bebee.com.br/beeplace/wp-content/uploads/2025/06/wepink.png',
    alt: 'WePink'
  },
  {
    src: 'https://sp-ao.shortpixel.ai/client/to_webp,q_lossless,ret_img/https://bebee.com.br/beeplace/wp-content/uploads/2025/06/picpay.png',
    alt: 'PicPay'
  },
  {
    src: 'https://sp-ao.shortpixel.ai/client/to_webp,q_lossless,ret_img/https://bebee.com.br/beeplace/wp-content/uploads/2025/06/magalu.png',
    alt: 'Magalu'
  },
  {
    src: 'https://sp-ao.shortpixel.ai/client/to_webp,q_lossless,ret_img/https://bebee.com.br/beeplace/wp-content/uploads/2025/06/band.png',
    alt: 'Band'
  }
];

export default function ClientLogos() {
  // Duplicate logos for seamless loop
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <section 
      className="bg-[#252525] flex items-center overflow-hidden"
      style={{ height: '97.92px' }}
    >
      <div className="flex animate-scroll">
        {duplicatedLogos.map((logo, index) => (
          <div 
            key={index}
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: '250px', height: '57.92px' }}
          >
            <img
              src={logo.src}
              alt={logo.alt}
              className="max-h-full max-w-full object-contain brightness-0 invert"
              style={{ maxHeight: '57.92px' }}
            />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-1250px);
          }
        }
        
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </section>
  );
}
