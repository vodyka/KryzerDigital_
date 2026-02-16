interface BankIconProps {
  bankCode: string;
  className?: string;
}

export function BankIcon({ bankCode, className = "w-10 h-10" }: BankIconProps) {
  const getBankIcon = () => {
    switch (bankCode) {
      case "001": // Banco do Brasil
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#FFDD00" />
            <path d="M30 35h40v30H30z" fill="#003087" />
            <path d="M35 40h10v5H35zm0 10h10v5H35zm15-10h10v5H50zm0 10h10v5H50z" fill="#FFDD00" />
          </svg>
        );
      case "033": // Santander
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#EC0000" />
            <path d="M50 25L25 40v30l25 15 25-15V40L50 25z" fill="white" />
            <circle cx="50" cy="55" r="8" fill="#EC0000" />
          </svg>
        );
      case "237": // Bradesco
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#CC092F" />
            <path d="M30 40h40l-10 10h-20z" fill="white" />
            <path d="M30 55h40l-10 10h-20z" fill="white" />
          </svg>
        );
      case "341": // Itaú
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#EC7000" />
            <rect x="30" y="30" width="40" height="40" rx="6" fill="white" />
            <path d="M40 45h20v10H40z" fill="#EC7000" />
          </svg>
        );
      case "104": // Caixa
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#0077C8" />
            <rect x="25" y="35" width="50" height="30" rx="4" fill="white" />
            <path d="M35 45h30v5H35z" fill="#0077C8" />
            <path d="M35 55h30v5H35z" fill="#0077C8" />
          </svg>
        );
      case "260": // Nubank
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#820AD1" />
            <circle cx="50" cy="50" r="18" fill="white" />
            <path d="M44 45l6 5 6-5v10l-6 5-6-5z" fill="#820AD1" />
          </svg>
        );
      case "077": // Inter
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#FF7A00" />
            <rect x="35" y="35" width="30" height="30" rx="15" fill="white" />
            <circle cx="50" cy="50" r="10" fill="#FF7A00" />
          </svg>
        );
      case "290": // Pagseguro
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#00A868" />
            <path d="M35 35h30v10H35z" fill="white" />
            <path d="M35 50h20v10H35z" fill="white" />
            <circle cx="60" cy="55" r="5" fill="white" />
          </svg>
        );
      case "102": // XP
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#000000" />
            <path d="M35 40l15 15-15 15h10l10-10 10 10h10L60 55l15-15H65L55 50 45 40z" fill="#00E676" />
          </svg>
        );
      case "336": // C6 Bank
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#1A1A1A" />
            <path d="M50 30c-11 0-20 9-20 20s9 20 20 20c8 0 15-5 18-12H60c-2 3-6 5-10 5-7 0-12-5-12-12s5-12 12-12c4 0 8 2 10 5h8c-3-7-10-12-18-12z" fill="#FFD700" />
          </svg>
        );
      case "323": // Mercado Pago
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#00B1EA" />
            <path d="M40 30v40h8V45h12c8 0 12-4 12-12s-4-12-12-12H40zm8 8h12c4 0 6 2 6 6s-2 6-6 6H48v-12z" fill="white" />
          </svg>
        );
      case "380": // PicPay
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#21C25E" />
            <circle cx="50" cy="45" r="12" fill="white" />
            <rect x="38" y="55" width="24" height="15" rx="4" fill="white" />
          </svg>
        );
      case "735": // Neon
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#00D9B5" />
            <path d="M35 40h10v30H35zm15 0h10v30H50z" fill="#0A3443" />
          </svg>
        );
      case "403": // Cora
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#FE3E6D" />
            <circle cx="50" cy="50" r="18" stroke="white" strokeWidth="4" fill="none" />
            <circle cx="50" cy="50" r="8" fill="white" />
          </svg>
        );
      case "197": // Stone
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#00A868" />
            <path d="M35 50l10-15h10l10 15-10 15H45z" fill="white" />
          </svg>
        );
      case "748": // Sicredi
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#00923F" />
            <path d="M35 45h30v10H35z" fill="white" />
            <circle cx="42" cy="50" r="3" fill="#00923F" />
            <circle cx="58" cy="50" r="3" fill="#00923F" />
          </svg>
        );
      case "756": // Sicoob
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#003D1C" />
            <path d="M40 35h20v10H40zm-5 15h30v15H35z" fill="#FFD700" />
          </svg>
        );
      default:
        // Generic bank icon for others
        return (
          <svg className={className} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="12" fill="#6366F1" />
            <path d="M30 40h40v5H30zm0 10h40v5H30zm0 10h40v5H30z" fill="white" />
            <rect x="45" y="25" width="10" height="10" fill="white" />
          </svg>
        );
    }
  };

  return <div className="inline-flex">{getBankIcon()}</div>;
}
