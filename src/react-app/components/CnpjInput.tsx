import { Input } from "@/react-app/components/ui/input";
import { ChangeEvent } from "react";

interface CnpjInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CnpjInput({ value, onChange, placeholder, className }: CnpjInputProps) {
  const formatCnpj = (val: string): string => {
    // Remove tudo que não é número
    const numbers = val.replace(/\D/g, "");
    
    // Limita a 14 dígitos
    const limited = numbers.slice(0, 14);
    
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 2)}.${limited.slice(2)}`;
    } else if (limited.length <= 8) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
    } else if (limited.length <= 12) {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
    } else {
      return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpj(e.target.value);
    onChange(formatted);
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder={placeholder || "00.000.000/0000-00"}
      className={className}
      maxLength={18} // XX.XXX.XXX/XXXX-XX = 18 caracteres
    />
  );
}

export function validateCnpj(cnpj: string): boolean {
  // Remove formatação
  const numbers = cnpj.replace(/\D/g, "");
  
  // Deve ter exatamente 14 dígitos
  if (numbers.length !== 14) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CNPJs inválidos)
  if (/^(\d)\1+$/.test(numbers)) {
    return false;
  }

  // Validação dos dígitos verificadores
  let size = numbers.length - 2;
  let digits = numbers.substring(0, size);
  const checkDigits = numbers.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(digits.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(checkDigits.charAt(0))) {
    return false;
  }

  size = size + 1;
  digits = numbers.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(digits.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(checkDigits.charAt(1))) {
    return false;
  }

  return true;
}

export function removeCnpjMask(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}
